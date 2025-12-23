# Changelog

所有重要的变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- ✨ 错误处理和重试机制（最多3次，指数退避）
- ✨ 实时订阅功能（监听用户上线/离线事件）
- ✨ React Hooks (`useOnlineStatus`, `useOnlineUsers`)
- ✨ Vue Composables (`useOnlineStatus`, `useOnlineUsers`)
- ✨ 错误回调配置 `onError`
- ✨ 用户上线/离线回调 `onUserJoin`, `onUserLeave`
- ✨ 在线时长限制功能（`maxOnlineTime`, `warningTime`）
- ✨ 搜索和过滤在线用户（支持关键词搜索、自定义过滤、分页）
- ✨ 活跃度统计扩展模块（`ActivityStats`）
- ✨ 获取当前在线时长和剩余时长方法
- ✨ 自动清理过期统计记录（可配置保留天数，默认30天）
- ✨ 存储统计信息查询（`getStorageStats`）

### 改进
- 🔧 心跳机制增加重试和连续失败检测
- 🔧 更新 React 和 Vue 示例使用新的 Hooks/Composables
- 🔧 `getOnlineUsers` 支持搜索、过滤、排序、分页
- 🔧 新增 `getOnlineUserCount` 方法获取在线用户总数
- 🔧 统计模块支持自定义数据保留策略
- 🔧 优化默认配置，减少数据堆积风险
- 📝 完善框架集成文档
- 📝 添加活跃度统计使用文档和数据保留建议

### 数据库
- 🗄️ 新增 `user_activity_logs` 表（用于统计功能）
- 🗄️ 提供自动清理函数和定时任务示例
- 🗄️ 默认保留30天数据（可配置）

## [1.0.0] - 2024-12-22

### 新增
- ✨ 跨设备实时在线状态追踪
- ✨ 智能心跳机制（30秒间隔）
- ✨ 自动清理过期用户（5分钟超时）
- ✨ 首次登录检测功能（可选）
- ✨ 多标签页支持
- ✨ 页面可见性检测
- ✨ TypeScript 类型定义
- 📦 支持 ESM、CommonJS、UMD 多种模块格式
- 📚 完整的文档和示例
- ✅ 21 个单元测试覆盖核心功能

### 修复
- 🐛 修复 `beforeunload` 事件中的在线状态清理问题
- 🐛 修复 Rollup 构建依赖冲突（使用 @rollup/plugin-terser）

### 文档
- 📝 添加 README 使用指南
- 📝 添加 FAQ 常见问题解答
- 📝 添加故障排查指南
- 📝 添加基础示例和管理后台示例
- 📝 添加示例配置说明和 .env.example

### 测试
- ✅ 使用 Vitest 添加完整的单元测试
- ✅ 测试覆盖：构造函数、登录/登出、心跳机制、自动清理等

[Unreleased]: https://github.com/yourusername/supabase-online-tracker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/supabase-online-tracker/releases/tag/v1.0.0
