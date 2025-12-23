# Supabase Online Tracker

基于 Supabase 的跨设备实时在线状态管理库，专为管理平台设计。

## 🎯 适用场景

- **在线教育平台** - 教师查看学生实时在线状态，监控学习活跃度
- **企业培训系统** - 管理员监控员工培训参与情况
- **人员管理系统** - HR 查看员工在线状态，考勤管理
- **客服系统** - 管理客服人员在线状态，合理分配工单
- **协作平台** - 显示团队成员实时在线情况

## ✨ 核心特性

### 在线状态追踪（必选）
- ✅ **跨设备检测** - 真正的跨设备实时在线状态
- ✅ **智能心跳** - 自动维护在线状态，30秒心跳间隔
- ✅ **自动清理** - 自动清理超过5分钟未活跃的用户
- ✅ **异常处理** - 处理崩溃、断网、页面关闭等异常情况
- ✅ **多标签页支持** - 同一用户多标签页状态同步
- ✅ **错误重试** - 自动重试失败的请求（最多3次，指数退避）

### 实时订阅（可选）
- ✅ **实时通知** - 监听用户上线/离线事件
- ✅ **自动更新** - 无需手动刷新，实时同步在线列表
- ✅ **事件回调** - 自定义用户上线/离线处理逻辑

### 首次登录检测（可选）
- ✅ **新用户识别** - 自动识别用户是否首次登录
- ✅ **灵活配置** - 可选启用，不影响核心功能
- ✅ **适用场景** - 新手引导、欢迎消息、统计分析

### 框架集成
- ✅ **React Hooks** - 开箱即用的 `useOnlineStatus` 和 `useOnlineUsers`
- ✅ **Vue Composables** - Vue 3 Composition API 支持
- ✅ **TypeScript** - 完整的类型定义

### 其他特性
- ✅ **零依赖** - 仅依赖 Supabase 客户端
- ✅ **灵活配置** - 心跳间隔、超时时间、重试次数可自定义
- ✅ **错误处理** - 完善的错误处理和回调机制

## 📦 安装

```bash
npm install supabase-online-tracker
# 或
yarn add supabase-online-tracker
```

## 🚀 快速开始

### 1. 创建数据库表

在你的 Supabase 项目中执行以下 SQL：

```sql
-- 在线用户表（必需）
CREATE TABLE online_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_online_users_username ON online_users(username);
CREATE INDEX idx_online_users_last_activity ON online_users(last_activity);

-- 如果需要首次登录检测功能，在你的用户表中添加字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_logged_in BOOLEAN DEFAULT FALSE;
```

### 2. 初始化

```javascript
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

// 创建 Supabase 客户端
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// 创建在线状态管理器
const onlineManager = new OnlineStatusManager(supabase, {
  // 在线状态配置
  tableName: 'online_users',        // 可选，默认 'online_users'
  heartbeatInterval: 30000,         // 可选，默认 30秒
  inactiveTimeout: 300000,          // 可选，默认 5分钟
  
  // 首次登录检测配置（可选）
  enableFirstLoginTracking: false,  // 是否启用首次登录检测，默认 false
  userTable: 'users',               // 用户表名（启用首次登录检测时必需）
  usernameField: 'username',        // 用户名字段，默认 'username'
  
  // 错误处理配置（可选）
  maxRetries: 3,                    // 最大重试次数，默认 3
  retryDelay: 1000,                 // 重试延迟（毫秒），默认 1000
  onError: (error, operation) => {  // 错误回调
    console.error(`操作失败: ${operation}`, error);
  },
  
  // 实时订阅配置（可选）
  enableRealtime: false,            // 是否启用实时订阅，默认 false
  onUserJoin: (user) => {           // 用户上线回调
    console.log('用户上线:', user.username);
  },
  onUserLeave: (user) => {          // 用户离线回调
    console.log('用户离线:', user.username);
  }
});
```

### 3. 使用

#### 基础用法（仅在线状态追踪）

```javascript
// 用户登录时
await onlineManager.userLogin('username');

// 获取在线用户列表
const onlineUsers = await onlineManager.getOnlineUsers();
console.log('在线用户:', onlineUsers);
// [{ username: 'user1', lastActivity: 1703059800000 }]

// 用户登出时
await onlineManager.userLogout();
```

#### 高级用法（启用首次登录检测）

```javascript
// 初始化时启用首次登录检测
const onlineManager = new OnlineStatusManager(supabase, {
  enableFirstLoginTracking: true,
  userTable: 'users'
});

// 用户登录时会自动检测
const { isFirstLogin } = await onlineManager.userLogin('username');

if (isFirstLogin) {
  console.log('欢迎新用户！这是你的首次登录');
  // 显示新手引导、欢迎消息等
}
```

#### 实时订阅用法

```javascript
// 启用实时订阅
const onlineManager = new OnlineStatusManager(supabase, {
  enableRealtime: true,
  onUserJoin: (user) => {
    console.log(`${user.username} 上线了`);
    // 更新 UI，显示通知等
  },
  onUserLeave: (user) => {
    console.log(`${user.username} 离线了`);
    // 更新 UI
  }
});

// 登录后自动开始监听
await onlineManager.userLogin('username');
```

#### 在线时长限制

```javascript
// 限制用户最多在线 1 小时
const onlineManager = new OnlineStatusManager(supabase, {
  maxOnlineTime: 3600000,  // 1小时（毫秒）
  warningTime: 3000000,    // 50分钟时警告
  onTimeWarning: (timeLeft) => {
    alert(`还有 ${Math.floor(timeLeft/60000)} 分钟将自动登出`);
  },
  onTimeLimit: () => {
    alert('在线时长已达上限，请休息');
    // 自动登出
  }
});

// 获取当前在线时长
const onlineTime = onlineManager.getCurrentOnlineTime(); // 毫秒

// 获取剩余时长
const remaining = onlineManager.getRemainingTime(); // 毫秒
```

#### 搜索和过滤在线用户

```javascript
// 搜索用户名包含 "john" 的在线用户
const users = await onlineManager.getOnlineUsers({
  search: 'john'
});

// 自定义过滤条件
const users = await onlineManager.getOnlineUsers({
  filter: {
    department: '技术部',
    role: 'developer'
  }
});

// 分页查询
const users = await onlineManager.getOnlineUsers({
  limit: 20,
  offset: 0,
  orderBy: 'last_activity',
  ascending: false
});

// 获取在线用户总数
const count = await onlineManager.getOnlineUserCount({
  search: 'john'
});
```

#### 活跃度统计（扩展功能）

```javascript
import { ActivityStats } from 'supabase-online-tracker/extensions/stats';

// 创建统计实例（自定义配置）
const stats = new ActivityStats(supabase, {
  retentionDays: 30,    // 保留30天数据（默认）
  autoCleanup: true     // 启用自动清理（默认）
});

// 记录登录
await stats.recordLogin('username', {
  deviceType: 'desktop',
  deviceInfo: { os: 'Windows', browser: 'Chrome' }
});

// 记录登出
await stats.recordLogout('username');

// 获取用户统计
const userStats = await stats.getUserStats('username', {
  period: 'today'  // today, week, month, year
});
// 返回: { loginCount, totalOnlineTime, averageSessionTime, sessions }

// 获取活跃用户排行
const topUsers = await stats.getTopActiveUsers({
  limit: 10,
  period: 'week'
});

// 手动清理过期记录（保留7天）
await stats.cleanupOldRecords(7);

// 查看存储统计
const storageStats = await stats.getStorageStats();
console.log(storageStats);
// {
//   totalRecords: 1500,
//   oldestRecord: '2024-01-01T00:00:00Z',
//   newestRecord: '2024-01-30T23:59:59Z',
//   dataSpanDays: 30,
//   retentionDays: 30,
//   autoCleanupEnabled: true,
//   estimatedSize: '~300 KB'
// }

// 销毁实例（停止自动清理）
stats.destroy();
```

**数据保留建议：**
- 小型应用（< 100 用户）：保留 30 天
- 中型应用（100-1000 用户）：保留 14-30 天
- 大型应用（> 1000 用户）：保留 7-14 天
- 如需长期分析，建议定期导出汇总数据

#### React 集成

```javascript
import { useOnlineStatus, useOnlineUsers } from 'supabase-online-tracker/hooks';

function MyComponent() {
  // 管理当前用户在线状态
  const { isOnline, login, logout } = useOnlineStatus(supabase);
  
  // 获取在线用户列表（自动实时更新）
  const { users, loading, refresh } = useOnlineUsers(supabase, {
    enableRealtime: true
  });
  
  return (
    <div>
      <button onClick={() => login('username')}>登录</button>
      <p>在线用户: {users.length}</p>
    </div>
  );
}
```

#### Vue 集成

```javascript
import { useOnlineStatus, useOnlineUsers } from 'supabase-online-tracker/composables';

export default {
  setup() {
    // 管理当前用户在线状态
    const { isOnline, login, logout } = useOnlineStatus(supabase);
    
    // 获取在线用户列表（自动实时更新）
    const { users, loading, refresh } = useOnlineUsers(supabase, {
      enableRealtime: true
    });
    
    return { isOnline, users, login, logout };
  }
};
```

## 📖 API 文档

### OnlineStatusManager

#### 构造函数

```javascript
new OnlineStatusManager(supabase, options)
```

**参数：**
- `supabase` - Supabase 客户端实例
- `options` (可选)
  - `tableName` - 在线用户表名，默认 `'online_users'`
  - `heartbeatInterval` - 心跳间隔（毫秒），默认 `30000`
  - `inactiveTimeout` - 不活跃超时时间（毫秒），默认 `300000`
  - `enableFirstLoginTracking` - 是否启用首次登录检测，默认 `false`
  - `userTable` - 用户表名（启用首次登录检测时必需），默认 `'users'`
  - `usernameField` - 用户名字段名，默认 `'username'`

#### 方法

##### `userLogin(username)`

用户登录时调用，启动在线状态追踪。

**参数：**
- `username` (string) - 用户名

**返回值：** `Promise<{isFirstLogin: boolean}>`
- 如果启用了首次登录检测，返回 `isFirstLogin` 表示是否首次登录
- 如果未启用，`isFirstLogin` 始终为 `false`

```javascript
const { isFirstLogin } = await onlineManager.userLogin('username');
```

##### `userLogout()`

用户登出时调用，停止在线状态追踪。

```javascript
await onlineManager.userLogout();
```

##### `getOnlineUsers()`

获取当前在线用户列表（自动清理过期用户）。

```javascript
const users = await onlineManager.getOnlineUsers();
// 返回: [{ username: string, lastActivity: number }]
```

##### `updateStatus(username)`

手动更新用户在线状态（通常不需要手动调用）。

```javascript
await onlineManager.updateStatus('username');
```

## 🔧 工作原理

### 心跳机制

- 用户登录后，每30秒自动更新 `last_activity` 时间戳
- 页面隐藏时暂停心跳，重新可见时恢复
- 页面关闭时自动清理在线状态

### 自动清理

- 获取在线用户时自动清理超过5分钟未活跃的用户
- 处理浏览器崩溃、网络断开等异常情况

### 多标签页

- 同一用户多个标签页共享同一条在线记录
- 任意标签页的心跳都会更新状态
- 所有标签页关闭后才会清理

## 🎯 使用场景

- 在线教育平台 - 显示学生在线状态
- 协作工具 - 显示团队成员在线情况
- 社交应用 - 好友在线状态
- 管理后台 - 监控用户活跃度

## 💡 高级功能

### 首次登录检测

如果你需要检测用户是否首次登录（例如显示欢迎消息、引导教程等），可以启用首次登录检测功能：

```javascript
const { isFirstLogin } = await onlineManager.userLogin('username', {
  userTable: 'users'  // 你的用户表名
});

if (isFirstLogin) {
  // 显示欢迎消息
  showWelcomeMessage();
  // 或启动新手引导
  startTutorial();
}
```

**工作原理：**
1. 在用户表中添加 `has_logged_in` 字段（布尔值）
2. 首次登录时，该字段为 `false`，返回 `isFirstLogin: true`
3. 登录后自动更新为 `true`，后续登录返回 `isFirstLogin: false`

**注意：** 需要先在用户表中添加 `has_logged_in` 字段（参考 SQL 脚本）。

## 📝 示例

### 运行示例

1. **配置 Supabase**
   ```bash
   # 复制环境变量模板
   cp examples/.env.example examples/.env
   
   # 编辑 .env 文件，填入你的 Supabase 凭证
   # 或直接在示例文件中替换 YOUR_SUPABASE_URL 和 YOUR_SUPABASE_ANON_KEY
   ```

2. **启动 HTTP 服务器**
   ```bash
   cd examples
   npx serve .
   # 或使用 python -m http.server 8000
   ```

3. **访问示例**
   - 基础示例：http://localhost:3000/basic-usage.html
   - 管理后台：http://localhost:3000/admin-dashboard.html

### 基础示例
查看 `examples/basic-usage.html` - 简单的登录/登出和在线用户列表。

### 管理后台示例
查看 `examples/admin-dashboard.html` - 完整的管理后台界面，包含：
- 实时在线用户统计
- 在线用户列表
- 自动刷新功能
- 美观的 UI 界面

### React/Vue 集成
查看 [FAQ 文档](./docs/FAQ.md#集成相关) 了解如何在框架中使用。

## 📚 文档

- [常见问题解答 (FAQ)](./docs/FAQ.md)
- [故障排查指南](./docs/TROUBLESHOOTING.md)
- [API 参考](#api-参考)

## 🗺️ 路线图

### 已完成 ✅
- ✅ 在线状态追踪
- ✅ 智能心跳机制
- ✅ 实时订阅
- ✅ 首次登录检测
- ✅ 在线时长限制
- ✅ 搜索和过滤
- ✅ 活跃度统计
- ✅ React/Vue 集成

### 计划中 🚧

#### v1.3.0 - 批量操作和历史记录
- 🔜 **批量操作** - 管理员批量管理用户在线状态
  - 批量强制下线
  - 批量更新状态
  - 批量查询
  
- 🔜 **历史记录查询** - 查询用户历史在线记录
  - 登录/登出历史
  - 在线时长统计
  - 数据导出功能
  - 自动归档机制

#### 未来版本
- 用户状态扩展（busy, away, dnd）
- 设备信息追踪
- 群组/房间支持
- 地理位置追踪（可选）

### 贡献
欢迎提交 Issue 或 PR 来建议新功能或改进！

## 🚀 快速开始

MIT
