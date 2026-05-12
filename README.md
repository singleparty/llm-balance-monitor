# LLM Balance Monitor

<p align="center">
  <img src="images/icon.png" alt="LLM Balance Monitor Logo" width="128" height="128">
</p>

一个 VS Code 扩展，用于在状态栏中实时显示 LLM 中转站的钱包余额。支持多个平台的 Token 管理，配置自动同步到多设备。

## ✨ 功能特性

- 💰 **余额监控** - 定时抓取 LLM 中转站的钱包余额，实时显示在状态栏
- 🔑 **Token 管理** - 支持添加、删除多个平台的 Token/Cookie
- 🔄 **多设备同步** - 配置保存在全局 settings.json，通过 VS Code Settings Sync 自动同步
- 🎯 **一键操作** - 点击状态栏即可管理 Token
- ⚡ **智能更新** - 窗口激活时自动刷新，失焦时暂停更新，节省资源

## 🚀 支持的平台

目前支持以下 LLM 中转站：

- ✅ **Bytecat** - 需要提供 Cookie（自动获取余额并显示）
- 🚧 **OpenRouter** - 配置支持（余额获取功能开发中）

更多平台支持正在开发中...

## 📦 安装

### 从 VS Code Marketplace 安装（即将上线）

1. 打开 VS Code
2. 按 `Cmd+Shift+X`（macOS）或 `Ctrl+Shift+X`（Windows/Linux）打开扩展面板
3. 搜索 "LLM Balance Monitor"
4. 点击安装

### 从源码安装

```bash
# 克隆仓库
git clone <repository-url>
cd status-bar

# 安装依赖
npm install

# 编译
npm run compile

# 在 VS Code 中按 F5 启动扩展开发宿主
```

## 🎯 使用方法

### 1. 添加 Token

1. 点击状态栏中的 "点击配置" 或余额显示
2. 选择 "➕ 新增 Token"
3. 选择平台类型（Bytecat / OpenRouter）
4. 输入对应的 Cookie 或 API Key
   - **Bytecat**: 需要提供完整的 Cookie（从浏览器开发者工具获取）
   - **OpenRouter**: 输入 API Key（格式：`sk-or-v1-xxxxx`）
5. 完成！余额将自动显示在状态栏

### 2. 查看余额

状态栏格式：`余额: 12.34 56.78`

- 余额每 30 秒自动刷新
- 支持多个账号同时显示
- 窗口失焦时暂停更新，节省资源
- 窗口重新激活时自动恢复更新

### 3. 获取 Bytecat Cookie

1. 在浏览器中登录 [Bytecat](https://www.bytecatcode.org/)
2. 按 `F12` 打开开发者工具
3. 切换到 "Network" 标签
4. 刷新页面，找到任意请求
5. 在请求头中找到 `Cookie` 字段，复制完整内容
6. 粘贴到插件的输入框中

### 4. 删除 Token

1. 点击状态栏
2. 选择 "🗑️ 删除 Token"
3. 从列表中选择要删除的 Token
4. 确认删除

### 4. 手动管理配置

按 `Cmd+Shift+P`（macOS）或 `Ctrl+Shift+P`（Windows/Linux），输入：

```
Preferences: Open User Settings (JSON)
```

在 `settings.json` 中查找或添加：

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

## ⚙️ 配置说明

### 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `llmBalanceMonitor.tokens` | Array | `[]` | Token 配置列表 |

### Token 配置格式

```typescript
interface TokenConfig {
  key: "bytecat" | "openrouter";  // 平台类型
  value: string;                   // Cookie 或 API Key
}
```

**示例：**

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

### 多设备同步

配置保存在 VS Code 的全局 `settings.json` 中，如果你启用了 [Settings Sync](https://code.visualstudio.com/docs/editor/settings-sync)，配置会自动同步到所有设备。

**启用 Settings Sync：**

1. 按 `Cmd+Shift+P` / `Ctrl+Shift+P`
2. 输入 "Settings Sync: Turn On"
3. 选择要同步的内容（确保勾选 Settings）
4. 登录 GitHub 或 Microsoft 账号

## 🔒 安全提示

⚠️ **重要：** Token/Cookie 配置以明文形式保存在 `settings.json` 中，不加密。

- 如果启用了 Settings Sync，配置会同步到云端
- 请勿在公共场合分享你的 `settings.json`
- Cookie 包含登录凭证，请妥善保管
- 建议定期更换 Token/Cookie
- 适合个人使用，不建议在共享设备上使用
- 如果 Cookie 泄露，请立即在平台上退出登录

## 🛠️ 开发

### 项目结构

```
src/
├── extension.ts           - 扩展入口，初始化和协调
├── utils.ts               - 工具函数和配置管理
├── commands.ts            - 命令处理（添加/删除 Token）
└── llmBalanceMonitor.ts   - 余额监控管理和余额获取功能
```

### 开发命令

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 监听模式（开发时使用）
npm run watch

# 代码检查
npm run lint

# 测试扩展
# 在 VS Code 中按 F5 启动扩展开发宿主
```

### 调试

1. 在 VS Code 中打开项目
2. 按 `F5` 启动扩展开发宿主
3. 在新窗口中测试扩展功能
4. 查看调试控制台的日志输出

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- 感谢 VS Code 团队提供的优秀扩展 API
- 感谢所有贡献者和用户的支持

---

<p align="center">
  Made with ❤️ for LLM users
</p>
