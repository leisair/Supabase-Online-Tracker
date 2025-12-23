# 故障排查指南

## 常见问题排查

### 1. 用户登录后没有显示在线

#### 症状
调用 `userLogin()` 后，`getOnlineUsers()` 返回空数组或不包含该用户。

#### 可能原因

**A. 数据库表未创建**

检查：
```sql
SELECT * FROM online_users;
```

解决：执行 `sql/create-table.sql` 中的 SQL 语句。

**B. Supabase 配置错误**

检查：
```javascript
console.log(supabase.supabaseUrl);  // 应该是你的项目 URL
console.log(supabase.supabaseKey);  // 应该是 anon key
```

解决：确认 URL 和 Key 正确。

**C. RLS 策略阻止写入**

检查：
```sql
-- 查看 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'online_users';
```

解决：
```sql
-- 临时禁用 RLS 测试
ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;

-- 或添加正确的策略
CREATE POLICY "允许所有人插入"
ON online_users FOR INSERT
WITH CHECK (true);
```

**D. 网络请求失败**

检查浏览器控制台是否有错误：
```javascript
// 添加错误日志
try {
  await onlineManager.userLogin('username');
} catch (error) {
  console.error('登录失败:', error);
}
```

### 2. 用户一直显示在线（即使已关闭页面）

#### 症状
用户关闭浏览器后，仍然显示在线状态。

#### 可能原因

**A. beforeunload 事件未触发**

某些情况下（如浏览器崩溃），`beforeunload` 不会执行。

解决：这是正常的，系统会在 5 分钟后自动清理。如果需要更快清理：
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  inactiveTimeout: 120000  // 2分钟
});
```

**B. 多标签页问题**

如果用户打开了多个标签页，只要有一个标签页还开着，就会保持在线。

解决：这是预期行为。如果需要每个标签页独立追踪，需要修改实现逻辑。

**C. 自动清理未执行**

检查：
```javascript
const users = await onlineManager.getOnlineUsers();
console.log('在线用户:', users);
// 应该自动清理过期用户
```

解决：确保调用了 `getOnlineUsers()`，它会触发自动清理。

### 3. 心跳停止工作

#### 症状
用户在线一段时间后被标记为离线。

#### 可能原因

**A. 页面进入后台**

浏览器可能会限制后台标签页的定时器。

解决：已内置处理，页面重新可见时会恢复心跳。如果仍有问题：
```javascript
// 检查心跳是否在运行
console.log('心跳定时器:', onlineManager.heartbeatTimer);
```

**B. 网络不稳定**

心跳请求失败但不会抛出错误。

解决：
```javascript
// 监控心跳状态
const originalUpdate = onlineManager.updateStatus.bind(onlineManager);
onlineManager.updateStatus = async function(username) {
  try {
    await originalUpdate(username);
    console.log('心跳成功:', new Date());
  } catch (error) {
    console.error('心跳失败:', error);
  }
};
```

**C. 定时器被清除**

某些代码可能意外清除了定时器。

解决：检查是否有其他代码调用了 `clearInterval`。

### 4. 首次登录检测不工作

#### 症状
`isFirstLogin` 始终返回 `false`。

#### 可能原因

**A. 未启用首次登录检测**

检查：
```javascript
console.log(onlineManager.enableFirstLoginTracking);  // 应该是 true
```

解决：
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  enableFirstLoginTracking: true,
  userTable: 'users'
});
```

**B. 用户表中没有 has_logged_in 字段**

检查：
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'has_logged_in';
```

解决：
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_logged_in BOOLEAN DEFAULT FALSE;
```

**C. 用户名字段不匹配**

如果你的用户表用的不是 `username` 字段：
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  enableFirstLoginTracking: true,
  userTable: 'users',
  usernameField: 'email'  // 或其他字段名
});
```

### 5. 性能问题

#### 症状
页面卡顿，数据库负载高。

#### 可能原因

**A. 心跳间隔太短**

检查：
```javascript
console.log(onlineManager.heartbeatInterval);  // 应该 >= 30000
```

解决：
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 60000  // 增加到60秒
});
```

**B. 在线用户太多**

如果有数千个在线用户，查询可能变慢。

解决：
1. 添加分页
2. 使用数据库视图
3. 考虑使用 Redis 等缓存

**C. 缺少数据库索引**

检查：
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'online_users';
```

解决：执行 `sql/create-table.sql` 中的索引创建语句。

### 6. TypeScript 类型错误

#### 症状
TypeScript 报错找不到类型定义。

#### 解决方案

确保 `package.json` 中的 `types` 字段正确：
```json
{
  "types": "src/index.d.ts"
}
```

如果仍有问题，手动导入类型：
```typescript
import type { OnlineStatusManager, OnlineUser } from 'supabase-online-tracker';
```

## 调试技巧

### 启用详细日志

```javascript
// 包装所有方法添加日志
const originalLogin = onlineManager.userLogin.bind(onlineManager);
onlineManager.userLogin = async function(username) {
  console.log('[DEBUG] 用户登录:', username);
  const result = await originalLogin(username);
  console.log('[DEBUG] 登录结果:', result);
  return result;
};

const originalGetUsers = onlineManager.getOnlineUsers.bind(onlineManager);
onlineManager.getOnlineUsers = async function() {
  console.log('[DEBUG] 获取在线用户');
  const users = await originalGetUsers();
  console.log('[DEBUG] 在线用户数:', users.length);
  return users;
};
```

### 检查数据库状态

```sql
-- 查看所有在线用户
SELECT * FROM online_users ORDER BY last_activity DESC;

-- 查看过期的在线状态
SELECT *, 
  EXTRACT(EPOCH FROM (NOW() - last_activity)) as seconds_inactive
FROM online_users
WHERE last_activity < NOW() - INTERVAL '5 minutes';

-- 清理所有在线状态（测试用）
DELETE FROM online_users;
```

### 监控网络请求

打开浏览器开发者工具 → Network 标签，筛选 Supabase 请求：
- 查看请求是否成功（状态码 200/201）
- 查看请求频率（应该是每30秒一次）
- 查看请求内容和响应

### 测试自动清理

```javascript
// 手动触发清理
const users = await onlineManager.getOnlineUsers();
console.log('清理后的在线用户:', users);

// 检查数据库
const { data } = await supabase.from('online_users').select('*');
console.log('数据库中的记录:', data);
```

## 获取帮助

如果以上方法都无法解决问题：

1. **收集信息**
   - 浏览器控制台的完整错误信息
   - 网络请求的详细信息
   - 数据库表结构和数据
   - 你的配置代码

2. **创建最小复现示例**
   - 使用 `examples/basic-usage.html` 测试
   - 确认是否是你的代码问题

3. **提交 Issue**
   - 到 GitHub 仓库提交 Issue
   - 包含上述收集的信息
   - 描述预期行为和实际行为

---

**提示：** 90% 的问题都是配置错误或数据库权限问题，请先仔细检查这两项。
