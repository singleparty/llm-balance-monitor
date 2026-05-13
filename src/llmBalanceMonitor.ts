import * as vscode from 'vscode';
import { loadConfigs, formatTime, TokenConfig, TokenConfigKey, log } from './utils';

let balanceMonitorItem: vscode.StatusBarItem;
let monitoringInterval: NodeJS.Timeout | undefined;
let updateBalanceRunning: boolean;

// 初始化余额监控项
export function initBalanceMonitor(): vscode.StatusBarItem {
  balanceMonitorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  balanceMonitorItem.command = 'llmBalanceMonitor.manageTokens';
  balanceMonitorItem.tooltip = '点击配置 Tokens';
  return balanceMonitorItem;
}

// 更新余额显示
export async function updateBalance() {
  if (updateBalanceRunning) {
    return;
  }
  updateBalanceRunning = true;
  const configs = loadConfigs();

  if (configs.length > 0) {
    const values = (await Promise.all(configs.map(async (item) => ({ ...item, balance: await getBalance(item) }))))
      .map((c) => c.balance)
      .join(' ');
    balanceMonitorItem.text = `余额: ${values}`;
  } else {
    stopMonitoring();
    balanceMonitorItem.text = `点击配置`;
  }
  updateBalanceRunning = false;
}

// 启动余额监控
export function startMonitoring(): void {
  // 清除已存在的定时器
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = undefined;
  }

  // 立即更新一次
  void updateBalance();

  // 每 30 秒更新
  monitoringInterval = setInterval(() => {
    void updateBalance();
  }, 60000);
}

// 停止余额监控
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = undefined;
  }
}

export async function getBalance(config: TokenConfig): Promise<string> {
  try {
    if (config.key === TokenConfigKey.bytecat) {
      log(`开始获取 ${config.key} 余额`);

      const response = await fetch('https://www.bytecatcode.org/api/user/self', {
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
      });

      // 检查 HTTP 状态码
      if (!response.ok) {
        const responseText = await response.text();
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
        };
        log(`获取 ${config.key} 余额失败 - HTTP ${response.status}`, errorDetails);
        stopMonitoring();
        return '';
      }

      const res = (await response.json()) as { data: { quota: number } };
      log(`获取 ${config.key} 余额成功`, res.data.quota);
      return (res.data.quota / 500000).toFixed(2);
    } else {
      return '';
    }
  } catch (err) {
    // 只捕获网络错误和 JSON 解析错误
    log(`获取 ${config.key} 余额失败`, err);
    stopMonitoring();
    return '';
  }
}
