# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个 VS Code 扩展，用于在状态栏中显示 LLM 中转站的钱包余额。该扩展提供：
- 余额实时监控（每 30 秒自动刷新）
- Token/Cookie 管理功能（新增、删除）
- 支持 Bytecat 平台余额获取
- 配置通过 VS Code Settings Sync 多设备同步

## 开发命令

**构建：**
```bash
npm run compile
```
将 TypeScript 从 `src/` 编译到 `out/` 目录。

**监听模式：**
```bash
npm run watch
```
以监听模式编译 TypeScript，用于活跃开发。

**代码检查：**
```bash
npm run lint
```
对 `src/` 中的 TypeScript 文件运行 ESLint。

**测试扩展：**
在 VS Code 中按 `F5` 启动扩展开发宿主环境，加载扩展进行测试。

## 架构

项目采用模块化架构，代码按职责分离：

### 文件结构

```
src/
├── extension.ts           - 扩展入口，负责初始化和协调各模块
├── utils.ts               - 公共工具函数和配置管理
├── commands.ts            - 命令处理逻辑（新增、删除 Token）
└── llmBalanceMonitor.ts   - 余额监控项管理和余额获取功能
```

### 模块说明

**extension.ts** - 扩展入口
- `activate()` - 初始化扩展，注册命令和监听器
- `deactivate()` - 清理资源（停止余额监控）

**utils.ts** - 工具函数
- `TokenConfig` 接口定义
- `loadConfigs()` - 从全局配置加载 Token
- `saveConfigs()` - 保存 Token 到全局配置
- `formatTime()` - 格式化时间为 mm:ss
- `initOutputChannel()` - 初始化 Output Channel
- `log()` - 统一的日志函数，支持 Error 对象和完整堆栈输出
- 常量定义（`STORAGE_KEY`, `SUPPORTED_KEYS`）

**commands.ts** - 命令逻辑
- `handleMonitorClick()` - 处理余额监控项点击事件
- `addToken()` - 新增 Token（支持 bytecat、openrouter）
- `deleteToken()` - 删除 Token

**llmBalanceMonitor.ts** - 余额监控管理
- `initBalanceMonitor()` - 初始化余额监控项
- `updateBalance()` - 更新余额显示
- `getBalance()` - 获取指定平台的余额
- `startMonitoring()` - 启动定时更新（使用 setTimeout 递归调度，每 1-3 分钟随机间隔）
- `stopMonitoring()` - 停止定时更新（使用 clearTimeout 清理）

## 功能特性

### 1. 余额监控
- 格式：`余额: 12.34 56.78`
- 每 1-3 分钟随机间隔自动刷新余额（避免 Cloudflare 拦截）
- VS Code 窗口激活时自动更新
- 窗口失去焦点时暂停更新（节省资源）
- 窗口重新激活时自动恢复
- 支持多账号余额同时显示
- 使用 setTimeout 递归调度而非 setInterval，实现随机间隔

### 2. Token/Cookie 管理
- 支持的平台：`bytecat`、`openrouter`
- 允许同一平台的多个 Token/Cookie
- 点击状态栏显示操作菜单：新增、删除
- 新增流程：选择类型 → 输入值 → 保存
- 删除流程：显示列表 → 选择 → 删除

### 3. 余额获取
- **Bytecat**: 通过 Cookie 调用 API 获取余额
  - API: `https://www.bytecatcode.org/api/user/self`
  - 返回 quota 字段，除以 500000 得到余额
  - 保留两位小数显示
  - 使用完整的浏览器请求头（User-Agent、sec-ch-ua-*、sec-fetch-* 等）模拟真实浏览器，避免 Cloudflare 拦截
  - HTTP 错误时记录完整的响应状态码、响应头和响应体
- **OpenRouter**: 配置支持（余额获取功能待实现）

### 4. 日志系统
- 使用 VS Code Output Channel 记录日志
- 通道名称：`LLM Balance Monitor`
- 查看方式：`Cmd+Shift+U` 打开 Output 面板，选择 "LLM Balance Monitor"
- 日志格式：`[时间] 消息内容`
- 支持 Error 对象的完整堆栈输出
- 支持对象的 JSON 格式化输出
- 记录余额获取的成功/失败详情

### 5. 配置存储
- 使用 VS Code 全局设置（`settings.json`）
- 配置项：`llmBalanceMonitor.tokens`
- 只读写全局配置，忽略工作区配置
- 支持 Settings Sync 多设备同步
- 可手动编辑 `settings.json` 查看和修改

### 6. 配置监听
- 自动监听配置变化
- 手动修改 `settings.json` 时状态栏自动更新
- 配置变化后自动刷新余额

## VS Code 扩展 API 使用

- **状态栏**：`vscode.window.createStatusBarItem()` 创建
- **命令注册**：`vscode.commands.registerCommand()` 注册
- **配置管理**：`vscode.workspace.getConfiguration()` 读写配置
- **窗口状态**：`vscode.window.onDidChangeWindowState()` 监听焦点变化
- **配置变化**：`vscode.workspace.onDidChangeConfiguration()` 监听配置变化
- **资源清理**：所有可释放对象添加到 `context.subscriptions`

## 配置示例

在 `settings.json` 中的配置格式：

```json
{
  "llmBalanceMonitor.tokens": [
    {
      "key": "bytecat",
      "value": "session=xxxxx; token=yyyyy; ..."
    },
    {
      "key": "openrouter",
      "value": "sk-or-v1-xxxxx"
    }
  ]
}
```

## 查看配置

按 `Cmd+Shift+P` → 输入 `Preferences: Open User Settings (JSON)`，搜索 `llmBalanceMonitor.tokens`。

## 注意事项

- Token 配置存储在明文 `settings.json` 中，不加密
- 如果启用了 Settings Sync，配置会同步到云端
- 适合非敏感配置，敏感信息建议使用其他方式管理

## 防 Cloudflare 拦截策略

为避免频繁请求被 Cloudflare 识别为机器人并返回 403：

1. **随机化请求间隔**：使用 `setTimeout` 递归调度，每次间隔为 1-3 分钟随机值
2. **完整浏览器指纹**：请求头包含 User-Agent、sec-ch-ua-*、sec-fetch-* 等完整浏览器标识
3. **避免固定频率**：不使用 `setInterval`，改用 `setTimeout` + 随机延迟
4. **Cookie 完整性**：确保 Cookie 包含 Cloudflare 验证信息（如 `cf_clearance`）

**重要**：修改定时器相关代码时，注意 `setTimeout` 和 `clearTimeout` 的配对使用。
