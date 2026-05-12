import * as vscode from 'vscode'
import { loadConfigs, formatTime, TokenConfig, TokenConfigKey } from './utils'

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
  const configs = loadConfigs()

  if (configs.length > 0) {
    const values = (await Promise.all(configs.map(async (item) => ({ ...item, balance: await getBalance(item) }))))
      .map((c) => c.balance)
      .join(' ')
    balanceMonitorItem.text = `余额: ${values}`
  } else {
    stopMonitoring()
    balanceMonitorItem.text = `点击配置`
  }
  updateBalanceRunning = false
}

// 启动余额监控
export function startMonitoring(): void {
  // 清除已存在的定时器
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = undefined
  }

  // 立即更新一次
  void updateBalance()

  // 每 30 秒更新
  monitoringInterval = setInterval(() => {
    void updateBalance()
  }, 30000)
}

// 停止余额监控
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = undefined
  }
}

export async function getBalance(config: TokenConfig): Promise<string> {
  try {
    if (config.key === TokenConfigKey.bytecat) {
      const res = (await fetch('https://www.bytecatcode.org/api/user/self', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'cache-control': 'no-store',
          'new-api-user': '5282',
          pragma: 'no-cache',
          cookie: config.value,
          Referer: 'https://www.bytecatcode.org/console/topup',
        },
        body: null,
        method: 'GET',
      }).then((res) => res.json())) as { data: { quota: number } }
      return (res.data.quota / 500000).toFixed(2)
    } else {
      return ''
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`获取余额失败: ${errorMessage}`)
    stopMonitoring()
    return ''
  }
}
