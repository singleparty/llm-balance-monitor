# 更新日志

本项目的所有重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 完善的 README 文档
- 项目 Logo 和图标
- 详细的使用说明和配置指南

## [0.0.1] - 2026-05-12

### 新增
- 💰 LLM 中转站余额监控（每 30 秒自动刷新）
- 🔑 Token/Cookie 管理功能（添加、删除）
- 🎯 支持 Bytecat 平台余额获取
- 🎯 支持 OpenRouter 平台配置（余额获取功能开发中）
- 🔄 配置自动同步（通过 VS Code Settings Sync）
- ⚡ 窗口失焦时自动暂停更新，节省资源
- 📝 配置变化自动监听和更新

### 功能
- 点击状态栏显示操作菜单
- 支持同一平台的多个 Token/Cookie
- 支持多账号余额同时显示
- 配置保存在全局 settings.json
- 手动编辑配置文件自动生效
- 自动处理网络请求错误

### 技术
- TypeScript 实现
- 模块化架构设计
- ESLint 代码规范
- VS Code Extension API

---

## 版本说明

### [未发布]
正在开发中的功能，尚未发布。

### [0.0.1] - 初始版本
第一个可用版本，包含核心功能。
