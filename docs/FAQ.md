# 常见问题解答 (FAQ)

## 安装和配置

### Q: 如何安装这个库？

```bash
npm install supabase-online-tracker
# 或
yarn add supabase-online-tracker
```

### Q: 需要安装其他依赖吗？

需要安装 `@supabase/supabase-js`：

```bash
npm install @supabase/supabase-js
```

### Q: 如何在浏览器中直接使用？

可以使用 UMD 版本：

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="path/to/dist/index.umd.min.js"></script>

<script>
  const { OnlineStatusManager } = SupabaseOnlineTracker;
  // 使用...
</script>
```

## 功能相关

### Q: 心跳间隔可以自定义吗？

可以，在初始化时配置：

```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 60000  // 60秒
});
```

**建议：** 不要设置太短（< 10秒），会增加数据库负载。

### Q: 如何判断用户是否真的离线了？

系统会自动清理超过 `inactiveTimeout`（默认5分钟）未活跃的用户。你可以自定义这个时间：

```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  inactiveTimeout: 600000  // 10分钟
});
```

### Q: 首次登录检测是必需的吗？

不是，这是可选功能。如果不需要，不要启用：

```javascript
// 不启用首次登录检测（默认）
const onlineManager = new OnlineStatusManager(supabase);

// 启用首次登录检测
const onlineManager = new OnlineStatusManager(supabase, {
  enableFirstLoginTracking: true,
  userTable: 'users'
});
```

### Q: 同一用户打开多个标签页会怎样？

- 多个标签页共享同一条在线记录
- 任意标签页的心跳都会更新状态
- 只有所有标签页都关闭后才会清理在线状态

### Q: 用户刷新页面会被标记为离线吗？

不会。刷新页面时：
1. `beforeunload` 事件会尝试清理在线状态
2. 新页面加载后立即重新标记为在线
3. 整个过程通常在1秒内完成

如果担心这个问题，可以增加 `inactiveTimeout` 时间。

## 数据库相关

### Q: 需要创建哪些数据库表？

必需：
```sql
CREATE TABLE online_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

可选（如果启用首次登录检测）：
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_logged_in BOOLEAN DEFAULT FALSE;
```

### Q: 数据库表名可以自定义吗？

可以：

```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  tableName: 'my_online_users',  // 自定义在线用户表名
  userTable: 'my_users'          // 自定义用户表名
});
```

### Q: 需要设置 RLS（行级安全）吗？

建议设置，示例：

```sql
-- 允许所有人读取在线用户
CREATE POLICY "允许读取在线用户"
ON online_users FOR SELECT
USING (true);

-- 只允许用户更新自己的在线状态
CREATE POLICY "允许更新自己的在线状态"
ON online_users FOR ALL
USING (auth.uid() = user_id);
```

## 性能相关

### Q: 这个库会影响性能吗？

影响很小：
- 心跳请求：每30秒一次，数据量很小（< 1KB）
- 查询在线用户：按需调用，有索引优化
- 自动清理：在查询时进行，不额外增加负载

### Q: 支持多少在线用户？

理论上无限制，实际取决于：
- Supabase 项目的配额
- 数据库性能
- 网络带宽

测试数据：
- 100 用户：无压力
- 1000 用户：流畅
- 10000+ 用户：建议优化心跳间隔和清理策略

### Q: 如何优化大量用户的性能？

1. **增加心跳间隔**
```javascript
heartbeatInterval: 60000  // 从30秒改为60秒
```

2. **增加超时时间**
```javascript
inactiveTimeout: 600000  // 从5分钟改为10分钟
```

3. **使用数据库索引**（已在 SQL 脚本中包含）

4. **分页查询在线用户**
```javascript
// 自己实现分页逻辑
const { data } = await supabase
  .from('online_users')
  .select('*')
  .range(0, 99);  // 只获取前100个
```

## 错误处理

### Q: 网络断开时会怎样？

- 心跳更新会失败，但不会抛出错误
- 网络恢复后自动继续心跳
- 如果断网超过 `inactiveTimeout`，会被自动清理

### Q: 浏览器崩溃时会怎样？

- 无法执行 `beforeunload` 清理
- 但会在 `inactiveTimeout` 后自动清理
- 这就是为什么需要自动清理机制

### Q: Supabase 请求失败时会怎样？

- 错误会被捕获并打印到控制台
- 不会中断程序运行
- 下次心跳会自动重试

## 集成相关

### Q: 如何在 React 中使用？

```javascript
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

const supabase = createClient(URL, KEY);
const onlineManager = new OnlineStatusManager(supabase);

function App() {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // 用户登录
    onlineManager.userLogin('username');

    // 定期刷新在线用户
    const interval = setInterval(async () => {
      const users = await onlineManager.getOnlineUsers();
      setOnlineUsers(users);
    }, 30000);

    return () => {
      clearInterval(interval);
      onlineManager.userLogout();
    };
  }, []);

  return (
    <div>
      <h2>在线用户: {onlineUsers.length}</h2>
      {/* ... */}
    </div>
  );
}
```

### Q: 如何在 Vue 中使用？

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

export default {
  setup() {
    const onlineUsers = ref([]);
    const supabase = createClient(URL, KEY);
    const onlineManager = new OnlineStatusManager(supabase);
    let interval;

    onMounted(async () => {
      await onlineManager.userLogin('username');
      
      interval = setInterval(async () => {
        onlineUsers.value = await onlineManager.getOnlineUsers();
      }, 30000);
    });

    onUnmounted(() => {
      clearInterval(interval);
      onlineManager.userLogout();
    });

    return { onlineUsers };
  }
};
```

## 其他

### Q: 支持 TypeScript 吗？

支持，已包含类型定义文件 `index.d.ts`。

### Q: 可以用于生产环境吗？

可以，但建议：
1. 充分测试
2. 监控数据库性能
3. 根据实际情况调整配置

### Q: 如何贡献代码？

欢迎提交 PR 或 Issue 到 GitHub 仓库。

### Q: 有技术支持吗？

可以通过以下方式获取帮助：
- GitHub Issues
- 查看文档和示例
- 社区讨论

---

**还有其他问题？** 请在 GitHub 上提交 Issue。
