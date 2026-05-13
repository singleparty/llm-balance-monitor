import * as vscode from 'vscode';
import { STORAGE_KEY, loadConfigs, initOutputChannel, setGlobalStoragePath } from './utils';
import { initBalanceMonitor, startMonitoring, stopMonitoring } from './llmBalanceMonitor';
import { handleMonitorClick } from './commands';

export async function activate(context: vscode.ExtensionContext) {
  // 初始化 Output Channel
  const outputChannel = initOutputChannel();
  context.subscriptions.push(outputChannel);

  // 准备跨窗口共享的缓存目录
  await vscode.workspace.fs.createDirectory(context.globalStorageUri);
  setGlobalStoragePath(context.globalStorageUri.fsPath);

  // 创建并初始化余额监控项
  const balanceMonitorItem = initBalanceMonitor();
  balanceMonitorItem.show();
  context.subscriptions.push(balanceMonitorItem);

  // 注册命令
  const manageTokensCommand = vscode.commands.registerCommand('llmBalanceMonitor.manageTokens', () =>
    handleMonitorClick(() => {
      loadConfigs({ refresh: true });
      startMonitoring();
    }),
  );
  context.subscriptions.push(manageTokensCommand);

  // 注册启动监控命令
  const startMonitoringCommand = vscode.commands.registerCommand('llmBalanceMonitor.startMonitoring', () => {
    startMonitoring();
  });
  context.subscriptions.push(startMonitoringCommand);

  // 注册停止监控命令
  const stopMonitoringCommand = vscode.commands.registerCommand('llmBalanceMonitor.stopMonitoring', () => {
    stopMonitoring();
  });
  context.subscriptions.push(stopMonitoringCommand);

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(STORAGE_KEY)) {
      loadConfigs({ refresh: true });
      startMonitoring();
    }
  });
  context.subscriptions.push(configChangeListener);

  // 启动余额监控
  startMonitoring();

  // 监听窗口状态变化
  const windowStateListener = vscode.window.onDidChangeWindowState((e) => {
    if (e.focused) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  });
  context.subscriptions.push(windowStateListener);
}

export function deactivate() {
  // 清理资源
  stopMonitoring();
}
