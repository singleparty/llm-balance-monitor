import * as vscode from 'vscode';

export enum TokenConfigKey {
  bytecat = 'bytecat',
}
// 配置数据结构
export interface TokenConfig {
  key: TokenConfigKey
  value: string
}

export const STORAGE_KEY = 'llmBalanceMonitor.tokens';
export const SUPPORTED_KEYS: Array<TokenConfigKey> = [TokenConfigKey.bytecat];
let _cacheConfig: TokenConfig[] | undefined = undefined;

// Output Channel for logging
let _outputChannel: vscode.OutputChannel | undefined = undefined;

export function initOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('LLM Balance Monitor');
  }
  return _outputChannel;
}

function formatLogArg(arg: any): string {
  if (arg instanceof Error) {
    // 对于 Error 对象，输出完整的错误信息和堆栈
    return `Error: ${arg.message}\nStack: ${arg.stack || 'No stack trace'}`;
  } else if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch (e) {
      return String(arg);
    }
  } else {
    return String(arg);
  }
}

export function log(message: string, ...args: any[]): void {
  if (_outputChannel) {
    const timestamp = new Date().toLocaleTimeString();
    let fullMessage = `[${timestamp}] ${message}`;

    if (args.length > 0) {
      const formattedArgs = args.map(formatLogArg).join('\n');
      fullMessage += `\n${formattedArgs}`;
    }

    _outputChannel.appendLine(fullMessage);
  }
}

// 从配置加载（只读取全局配置）
export function loadConfigs({ refresh }: { refresh?: boolean } = {}): TokenConfig[] {
  if (refresh || !_cacheConfig) {
    const config = vscode.workspace.getConfiguration();
    const stored = config.inspect<TokenConfig[]>(STORAGE_KEY)?.globalValue;
    _cacheConfig = stored;
  }

  return _cacheConfig || [];
}

// 保存配置
export async function saveConfigs(configs: TokenConfig[]): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration();
    await config.update(STORAGE_KEY, configs, vscode.ConfigurationTarget.Global);
  } catch (error) {
    vscode.window.showErrorMessage('保存配置失败');
    throw error;
  }
}

// 格式化时间为 mm:ss
export function formatTime(date: Date): string {
  return `${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
