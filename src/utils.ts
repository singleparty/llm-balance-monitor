import * as vscode from 'vscode'

export enum TokenConfigKey {
  bytecat = 'bytecat',
}
// 配置数据结构
export interface TokenConfig {
  key: TokenConfigKey
  value: string
}

export const STORAGE_KEY = 'llmBalanceMonitor.tokens'
export const SUPPORTED_KEYS: Array<TokenConfigKey> = [TokenConfigKey.bytecat]
let _cacheConfig: TokenConfig[] | undefined = undefined

// 从配置加载（只读取全局配置）
export function loadConfigs({ refresh }: { refresh?: boolean } = {}): TokenConfig[] {
  if (refresh || !_cacheConfig) {
    const config = vscode.workspace.getConfiguration()
    const stored = config.inspect<TokenConfig[]>(STORAGE_KEY)?.globalValue
    _cacheConfig = stored
  }

  return _cacheConfig || []
}

// 保存配置
export async function saveConfigs(configs: TokenConfig[]): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration()
    await config.update(STORAGE_KEY, configs, vscode.ConfigurationTarget.Global)
  } catch (error) {
    vscode.window.showErrorMessage('保存配置失败')
    throw error
  }
}

// 格式化时间为 mm:ss
export function formatTime(date: Date): string {
  return `${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}
