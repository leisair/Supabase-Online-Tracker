# Supabase Online Tracker

一个轻量级的在线状态管理库，帮你追踪用户的实时在线状态。

## 这是什么？

简单来说，这个库可以让你的网站/应用：
- 📊 **显示谁在线** - 实时看到哪些用户正在使用你的系统
- ⏱️ **追踪在线时长** - 记录用户在线了多久
- 🔔 **实时通知** - 有人上线/离线时立即知道
- 📈 **统计分析** - 查看用户活跃度、登录次数等

## 适合谁用？

- 在线教育平台（看学生是否在线）
- 企业管理系统（监控员工在线状态）
- 客服系统（管理客服人员）
- 协作工具（显示团队成员）

## 核心功能

✅ 自动追踪在线状态（不需要你手动刷新）  
✅ 处理各种异常情况（断网、崩溃、关闭页面）  
✅ 支持多标签页（同一用户开多个页面）  
✅ 可选的实时通知和统计功能  
✅ 支持 React 和 Vue

---

## 🚀 3 分钟快速开始

### 步骤 1：安装

```bash
npm install supabase-online-tracker @supabase/supabase-js
```

### 步骤 2：在 Supabase 创建数据表

1. 打开 [Supabase 控制台](https://app.supabase.com)，选择你的项目
2. 左侧菜单点击 **SQL Editor**
3. 复制下面的代码，粘贴进去，点 **Run**

```sql
CREATE TABLE online_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_online_users_username ON online_users(username);
CREATE INDEX idx_online_users_last_activity ON online_users(last_activity);
```

### 步骤 3：配置文件

**复制配置文件到你的项目：**

```bash
# 从 node_modules 复制配置文件模板
cp node_modules/supabase-online-tracker/config.example.js ./config.js
```

**编辑 `config.js`，填入你的 Supabase 配置：**

在 Supabase 控制台 → Settings → API 获取这两个值：

```javascript
export default {
  supabase: {
    url: 'https://你的项目.supabase.co',      // 👈 改成你的 Project URL
    anonKey: '你的anon-key',                   // 👈 改成你的 anon public key
  },
  
  // 其他配置保持默认即可
  features: {
    realtime: false,           // 需要实时通知就改成 true
    activityStats: false,      // 需要统计功能就改成 true
  },
};
```

### 步骤 4：在代码中使用

**复制初始化文件：**

```bash
cp node_modules/supabase-online-tracker/src/init.js ./tracker.js
```

**在你的代码中导入使用：**

```javascript
import tracker from './tracker.js';

// 用户登录
await tracker.login('用户名');

// 用户登出
await tracker.logout();

// 获取在线用户
const users = await tracker.getOnlineUsers();
console.log('在线用户:', users);
```

**完成！** 就这么简单。

---

## ⚙️ 配置选项

所有配置都在 `config.js` 文件中，按功能分组，一目了然。

### 基础配置

```javascript
export default {
  // Supabase 连接（必填）
  supabase: {
    url: 'https://xxx.supabase.co',
    anonKey: 'xxx',
  },
  
  // 基础设置
  basic: {
    tableName: 'online_users',        // 在线用户表名
    heartbeatInterval: 30000,         // 心跳间隔（30秒）
    inactiveTimeout: 300000,          // 离线超时（5分钟）
  },
};
```

### 功能开关

```javascript
export default {
  features: {
    realtime: false,              // 实时通知（有人上线/离线时立即知道）
    firstLoginTracking: false,    // 首次登录检测
    activityStats: false,         // 活跃度统计
  },
};
```

### 在线时长限制

```javascript
export default {
  timeLimit: {
    maxOnlineTime: 3600000,       // 最多在线 1 小时
    warningTime: 3000000,         // 50 分钟时警告
  },
  
  callbacks: {
    onTimeWarning: () => {
      alert('您已在线较长时间，建议休息一下');
    },
    onTimeLimit: () => {
      alert('已达到最大在线时长，即将自动登出');
    },
  },
};
```

### 实时通知

```javascript
export default {
  features: {
    realtime: true,               // 👈 开启实时通知
  },
  
  callbacks: {
    onUserJoin: (user) => {
      console.log(`${user.username} 上线了`);
      // 显示通知、播放声音等
    },
    onUserLeave: (user) => {
      console.log(`${user.username} 离线了`);
    },
  },
};
```

### 完整配置示例

查看 `config.example.js` 了解所有可用配置项。

---

## 📊 扩展功能：活跃度统计

如果需要统计用户在线时长、登录次数等数据：

### 第一步：创建统计表

在 Supabase SQL Editor 执行：

```sql
CREATE TABLE user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    duration INTEGER,
    device_type TEXT DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_username ON user_activity_logs(username);
CREATE INDEX idx_activity_logs_login_time ON user_activity_logs(login_time);
```

### 第二步：在配置文件中开启

编辑 `config.js`：

```javascript
export default {
  features: {
    activityStats: true,          // 👈 开启统计功能
  },
  
  retention: {
    days: 30,                     // 保留 30 天数据
    autoCleanup: true,            // 自动清理过期数据
  },
};
```

### 第三步：使用统计功能

```javascript
import tracker from './tracker.js';

// 登录和登出会自动记录统计数据
await tracker.login('username');
await tracker.logout();

// 查看用户统计
const stats = await tracker.getUserStats('username', {
  period: 'today'  // today, week, month, year
});

console.log(stats);
// {
//   loginCount: 3,           // 今天登录了 3 次
//   totalOnlineTime: 7200,   // 在线 2 小时（秒）
//   averageSessionTime: 2400 // 平均每次 40 分钟
// }
```

---

## 🔍 其他常用功能

### 搜索和过滤

```javascript
// 搜索用户名
const users = await tracker.getOnlineUsers({
  search: 'john'
});

// 分页查询
const users = await tracker.getOnlineUsers({
  limit: 20,
  offset: 0
});

// 获取在线人数
const count = await tracker.getOnlineUserCount();
```

### 首次登录检测

**第一步：** 在 Supabase SQL Editor 执行：

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_logged_in BOOLEAN DEFAULT FALSE;
```

**第二步：** 在 `config.js` 中开启：

```javascript
export default {
  features: {
    firstLoginTracking: true,     // 👈 开启首次登录检测
  },
};
```

**第三步：** 使用：

```javascript
const { isFirstLogin } = await tracker.login('username');
if (isFirstLogin) {
  showWelcomeMessage();  // 显示欢迎消息或新手引导
}
```

---

## 📖 API 文档

### 便捷方法（推荐）

使用 `tracker.js` 导出的便捷方法：

```javascript
import tracker from './tracker.js';

// 用户登录
await tracker.login(username);

// 用户登出
await tracker.logout();

// 获取在线用户列表
const users = await tracker.getOnlineUsers(options);

// 获取在线用户数量
const count = await tracker.getOnlineUserCount();

// 获取用户统计（需要开启 activityStats）
const stats = await tracker.getUserStats(username, options);
```

### 原始 API

如果需要更多控制，可以直接使用 `OnlineStatusManager`：

```javascript
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

const supabase = createClient(url, key);
const manager = new OnlineStatusManager(supabase, options);

// 用户登录
await manager.userLogin(username);

// 用户登出
await manager.userLogout();

// 获取在线用户
const users = await manager.getOnlineUsers(options);

// 更新状态
await manager.updateStatus(username);
```

### 配置选项

所有配置都在 `config.js` 中，详见 `config.example.js`。

---

## 💡 工作原理

### 心跳机制
- 用户登录后，每 30 秒自动更新一次 `last_activity` 时间
- 页面隐藏时暂停心跳，重新可见时恢复
- 页面关闭时自动清理在线状态

### 自动清理
- 获取在线用户时，自动删除超过 5 分钟没活动的用户
- 处理浏览器崩溃、断网等异常情况

### 多标签页
- 同一用户开多个标签页，共享一条在线记录
- 任意标签页的心跳都会更新状态
- 所有标签页关闭后才清理

---

## 📝 示例代码

完整的示例代码在 `examples/` 文件夹：

- `basic-usage.html` - 基础用法
- `admin-dashboard.html` - 管理后台示例
- `react-example.jsx` - React 集成
- `vue-example.vue` - Vue 集成

### 运行示例

```bash
cd examples
npx serve .
# 访问 http://localhost:3000/basic-usage.html
```

---

## 🗺️ 路线图

### 已完成 ✅
- 在线状态追踪
- 实时通知
- 在线时长限制
- 活跃度统计
- React/Vue 集成
- 配置文件系统

### 计划中 🚧
- 批量操作（管理员批量管理用户）
- 历史记录查询
- 用户状态扩展（忙碌、离开等）

---

## 📚 更多文档

- [常见问题 FAQ](./docs/FAQ.md)
- [故障排查](./docs/TROUBLESHOOTING.md)
- [性能优化](./docs/PERFORMANCE.md)

---

## 📄 开源协议

MIT License

---

## 🤝 贡献

欢迎提交 Issue 或 PR！
