import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ===== Types =====

export enum TokenConfigKey {
  bytecat = 'bytecat',
}

// 配置数据结构
export interface TokenConfig {
  key: TokenConfigKey
  value: string
}

interface BalanceCache {
  text: string
  updatedAt: number
}

// ===== Constants & module state =====

export const STORAGE_KEY = 'llmBalanceMonitor.tokens';
export const SUPPORTED_KEYS: Array<TokenConfigKey> = [TokenConfigKey.bytecat];
export const CACHE_TTL_MS = 60_000;
export const CACHE_FILE_NAME = 'llm-balance-monitor.json';

let _cacheConfig: TokenConfig[] | undefined = undefined;
let _globalStoragePath: string | undefined = undefined;
let _outputChannel: vscode.OutputChannel | undefined = undefined;

// ===== Functions =====

export function initOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('LLM Balance Monitor');
  }
  return _outputChannel;
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

// 注入跨窗口共享的缓存目录（由 extension.activate 提供）
export function setGlobalStoragePath(p: string): void {
  _globalStoragePath = p;
  log(`缓存目录: ${p}`);
  log(`缓存文件: ${path.join(p, CACHE_FILE_NAME)}`);
}

export function readBalanceCache(): BalanceCache | null {
  const file = getCacheFilePath();
  if (!file) {
    return null;
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as BalanceCache;
    if (typeof parsed?.text !== 'string' || typeof parsed?.updatedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBalanceCache(text: string): void {
  const file = getCacheFilePath();
  if (!file) {
    return;
  }
  const payload: BalanceCache = { text, updatedAt: Date.now() };
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    log('写入余额缓存失败', err);
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

function formatLogArg(arg: any): string {
  if (arg instanceof Error) {
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

function getCacheFilePath(): string | undefined {
  if (!_globalStoragePath) {
    return undefined;
  }
  return path.join(_globalStoragePath, CACHE_FILE_NAME);
}
