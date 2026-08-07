import * as vscode from 'vscode'

import {
  loadConfigs,
  TokenConfig,
  TokenConfigKey,
  log,
  getTokenIcon,
  readBalanceCache,
  writeBalanceCache,
  CACHE_TTL_MS,
  getProxyDispatcher,
} from './utils'

let balanceMonitorItem: vscode.StatusBarItem
let monitoringInterval: NodeJS.Timeout | undefined
let updateBalanceRunning: boolean

// 初始化余额监控项
export function initBalanceMonitor(): vscode.StatusBarItem {
  balanceMonitorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  balanceMonitorItem.command = 'llmBalanceMonitor.manageTokens'
  balanceMonitorItem.tooltip = '点击配置 Tokens'
  return balanceMonitorItem
}

// 更新余额显示
export async function updateBalance() {
  if (updateBalanceRunning) {
    return
  }
  updateBalanceRunning = true
  try {
    const configs = loadConfigs()

    if (configs.length === 0) {
      stopMonitoring()
      balanceMonitorItem.text = `点击配置`
      return
    }

    // 跨窗口共享缓存：TTL 内直接使用其他窗口已写入的结果
    const cache = readBalanceCache()
    if (cache && Date.now() - cache.updatedAt < CACHE_TTL_MS) {
      balanceMonitorItem.text = cache.text
      return
    }

    const values = (await Promise.all(configs.map(async (item) => ({ ...item, balance: await getBalance(item) }))))
      .filter((c) => c.balance !== '')
      .map((c) => `${getTokenIcon(c.key)} ${c.balance}`)
      .join(' ')
    const text = values.length > 0 ? `余额: ${values}` : '余额: -'
    balanceMonitorItem.text = text
    writeBalanceCache(text)
  } finally {
    updateBalanceRunning = false
  }
}

// 启动余额监控
export function startMonitoring(): void {
  // 清除已存在的定时器
  if (monitoringInterval) {
    clearTimeout(monitoringInterval)
    monitoringInterval = undefined
  }

  // 立即更新一次
  void updateBalance()

  // 每 1-3 分钟随机更新一次，避免被 Cloudflare 识别为机器人
  const scheduleNext = () => {
    const baseInterval = 1 * 60 * 1000 // 1 分钟
    const randomDelay = Math.random() * 2 * 60 * 1000 // 0-2 分钟随机延迟
    const nextInterval = baseInterval + randomDelay

    monitoringInterval = setTimeout(() => {
      void updateBalance()
      scheduleNext() // 递归调度下一次
    }, nextInterval)
  }

  scheduleNext()
}

// 停止余额监控
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearTimeout(monitoringInterval)
    monitoringInterval = undefined
  }
}

export async function getBalance(config: TokenConfig): Promise<string> {
  try {
    if (config.key === TokenConfigKey.bytecat) {
      log(`开始获取 ${config.key} 余额`)

      const response = await fetch('https://www.bytecatcode.org/api/user/self', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'cache-control': 'no-store',
          Authorization: `Bearer ${config.value}`,
          pragma: 'no-cache',
          Referer: 'https://www.bytecatcode.org/console/topup',
        },
        method: 'GET',
        dispatcher: getProxyDispatcher(),
      } as RequestInit)

      // 检查 HTTP 状态码
      if (!response.ok) {
        const responseText = await response.text()
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
        }
        log(`获取 ${config.key} 余额失败 - HTTP ${response.status}`, errorDetails)
        stopMonitoring()
        return ''
      }

      const res = (await response.json()) as { data: { quota: number } }
      log(`获取 ${config.key} 余额成功`, res.data.quota)
      return (res.data.quota / 500000).toFixed(2)
    } else if (config.key === TokenConfigKey.openrouter) {
      log(`开始获取 ${config.key} 余额`)

      const response = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${config.value}`,
        },
        method: 'GET',
        dispatcher: getProxyDispatcher(),
      } as RequestInit)

      if (!response.ok) {
        const responseText = await response.text()
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
        }
        log(`获取 ${config.key} 余额失败 - HTTP ${response.status}`, errorDetails)
        stopMonitoring()
        return ''
      }

      const res = (await response.json()) as {
        data?: {
          total_credits?: number
          total_usage?: number
        }
      }
      const totalCredits = res.data?.total_credits
      const totalUsage = res.data?.total_usage
      if (typeof totalCredits !== 'number' || typeof totalUsage !== 'number') {
        log(`获取 ${config.key} 余额失败`, res)
        stopMonitoring()
        return ''
      }

      const balance = totalCredits - totalUsage
      log(`获取 ${config.key} 余额成功`, { balance, totalCredits, totalUsage })
      return balance.toFixed(2)
    } else {
      return ''
    }
  } catch (err) {
    // 只捕获网络错误和 JSON 解析错误
    log(`获取 ${config.key} 余额失败`, err)
    stopMonitoring()
    return ''
  }
}
