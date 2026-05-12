import * as vscode from 'vscode';
import { TokenConfigKey, SUPPORTED_KEYS, loadConfigs, saveConfigs } from './utils';

// 新增 Token
export async function addToken(updateCallback: () => void): Promise<void> {
  // 选择 key 类型
  const keyType = await vscode.window.showQuickPick(SUPPORTED_KEYS, {
    placeHolder: '选择 Token 类型'
  });

  if (!keyType) {
    return;
  }

  // 输入 value
  const value = await vscode.window.showInputBox({
    prompt: `输入 ${keyType} 的 Token`,
    placeHolder: '请输入 Token',
    validateInput: (text) => {
      return text.trim() === '' ? 'Token 不能为空' : null;
    }
  });

  if (!value) {
    return;
  }

  // 加载现有配置
  const configs = loadConfigs();

  // 添加新配置（允许重复）
  configs.push({ key: keyType as TokenConfigKey, value: value.trim() });

  // 保存配置
  await saveConfigs(configs);

  // 更新余额显示
  updateCallback();

  vscode.window.showInformationMessage(`已添加 ${keyType} Token`);
}

// 删除 Token
export async function deleteToken(updateCallback: () => void): Promise<void> {
  // 加载现有配置
  const configs = loadConfigs();

  if (configs.length === 0) {
    vscode.window.showInformationMessage('没有可删除的配置');
    return;
  }

  // 显示配置列表供用户选择
  const items = configs.map((c, index) => ({
    label: `${c.key}: ${c.value}`,
    description: `#${index + 1}`,
    index
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '选择要删除的 Token'
  });

  if (!selected) {
    return;
  }

  // 删除选中的配置
  configs.splice(selected.index, 1);

  // 保存配置
  await saveConfigs(configs);

  // 更新余额显示
  updateCallback();

  vscode.window.showInformationMessage('已删除 Token');
}

// 处理余额监控项点击
export async function handleMonitorClick(updateCallback: () => void): Promise<void> {
  const action = await vscode.window.showQuickPick(
    [
      { label: '$(add) 新增 Token', value: 'add' },
      { label: '$(trash) 删除 Token', value: 'delete' }
    ],
    { placeHolder: '选择操作' }
  );

  if (!action) {
    return;
  }

  if (action.value === 'add') {
    await addToken(updateCallback);
  } else if (action.value === 'delete') {
    await deleteToken(updateCallback);
  }
}
