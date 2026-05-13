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
    clearTimeout(monitoringInterval);
    monitoringInterval = undefined;
  }

  // 立即更新一次
  void updateBalance();

  // 每 1-3 分钟随机更新一次，避免被 Cloudflare 识别为机器人
  const scheduleNext = () => {
    const baseInterval = 1 * 60 * 1000; // 1 分钟
    const randomDelay = Math.random() * 2 * 60 * 1000; // 0-2 分钟随机延迟
    const nextInterval = baseInterval + randomDelay;

    monitoringInterval = setTimeout(() => {
      void updateBalance();
      scheduleNext(); // 递归调度下一次
    }, nextInterval);
  };

  scheduleNext();
}

// 停止余额监控
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearTimeout(monitoringInterval);
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
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          cookie: config.value,
          Referer: 'https://www.bytecatcode.org/console/topup',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
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
