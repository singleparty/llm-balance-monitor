import * as vscode from 'vscode'
import { Agent, fetch as undiciFetch } from 'undici'

import {
  loadConfigs,
  TokenConfig,
  TokenConfigKey,
  log,
  getTokenIcon,
  readBalanceCache,
  writeBalanceCache,
  CACHE_TTL_MS,
  getConfiguredProxy,
} from './utils'

// undici 自带的类型与 @types/node 内置的 undici-types 存在版本差异（RequestInit / Response 不兼容），
// 这里把直连用的 fetch / Agent 收敛成局部宽松签名
type DirectFetch = (url: string, init: Record<string, unknown>) => Promise<Response>

const directFetch = undiciFetch as unknown as DirectFetch
const DirectAgent = Agent as unknown as new () => object

let balanceMonitorItem: vscode.StatusBarItem
let monitoringInterval: NodeJS.Timeout | undefined
let updateBalanceRunning: boolean
let directDispatcher: object | undefined

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

      const response = await fetchWithDirectFallback('https://www.bytecatcode.org/api/user/self', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'cache-control': 'no-store',
          Authorization: `Bearer ${config.value}`,
          pragma: 'no-cache',
          Referer: 'https://www.bytecatcode.org/console/topup',
        },
        method: 'GET',
      })

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

      const response = await fetchWithDirectFallback('https://openrouter.ai/api/v1/credits', {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${config.value}`,
        },
        method: 'GET',
      })

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
    } else if (config.key === TokenConfigKey.deepseek) {
      log(`开始获取 ${config.key} 余额`)

      const response = await fetchWithDirectFallback('https://api.deepseek.com/user/balance', {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${config.value}`,
        },
        method: 'GET',
      })

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
        is_available?: boolean
        balance_infos?: Array<{
          currency?: string
          total_balance?: string
          granted_balance?: string
          topped_up_balance?: string
        }>
      }
      const balanceInfos = Array.isArray(res.balance_infos) ? res.balance_infos : []
      // 同一账户可能同时存在 CNY / USD 余额，优先展示 CNY，其次 USD
      const balanceInfo =
        balanceInfos.find((info) => info.currency === 'CNY') ??
        balanceInfos.find((info) => info.currency === 'USD') ??
        balanceInfos[0]
      if (!balanceInfo || typeof balanceInfo.total_balance !== 'string') {
        log(`获取 ${config.key} 余额失败`, res)
        stopMonitoring()
        return ''
      }

      const balance = Number(balanceInfo.total_balance)
      if (!Number.isFinite(balance)) {
        log(`获取 ${config.key} 余额失败`, res)
        stopMonitoring()
        return ''
      }

      log(`获取 ${config.key} 余额成功`, {
        balance,
        currency: balanceInfo.currency,
        is_available: res.is_available,
      })
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

// 请求统一先走全局 fetch：代理由 VS Code 按 http.proxy / http.noProxy / 环境变量自行处理，
// 调用方不需要（也无法）通过 dispatcher 干预。
// 只有在请求失败、且确实配置了代理时，才用 undici 自带的 fetch + 直连 Agent 重试一次：
// 代理出口 IP 常被 Cloudflare 判定为机器人并返回挑战页（403 + cf-mitigated: challenge），
// 换成直连往往就能过；用 undici 自带的 fetch 是因为 VS Code 会给全局 fetch 注入代理。
async function fetchWithDirectFallback(url: string, init: RequestInit): Promise<Response> {
  const proxy = getConfiguredProxy()

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    if (!proxy) {
      throw err
    }
    log(`请求失败，改用直连重试（代理: ${proxy}）: ${url}`, err)
    return fetchDirect(url, init)
  }

  if (!proxy || !isCloudflareChallenge(response)) {
    return response
  }

  log(`请求被 Cloudflare 挑战，改用直连重试（代理: ${proxy}）: ${url}`)
  try {
    await response.body?.cancel()
  } catch {
    // 忽略：仅用于释放连接
  }

  const direct = await fetchDirect(url, init)
  if (isCloudflareChallenge(direct)) {
    log(`直连同样被 Cloudflare 挑战，可把域名加入 VS Code 的 http.noProxy 或更换代理节点: ${url}`)
  }
  return direct
}

// 绕过 VS Code 对 globalThis.fetch 的代理注入，走真正的直连
function fetchDirect(url: string, init: RequestInit): Promise<Response> {
  if (!directDispatcher) {
    directDispatcher = new DirectAgent()
  }
  return directFetch(url, { ...init, dispatcher: directDispatcher } as unknown as Record<string, unknown>)
}

function isCloudflareChallenge(response: Response): boolean {
  return response.status === 403 && response.headers.get('cf-mitigated') === 'challenge'
}
