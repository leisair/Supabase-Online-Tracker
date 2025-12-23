# 性能优化指南

本文档提供性能优化建议，帮助你在大规模场景下高效使用 Supabase Online Tracker。

## 📊 性能基准

### 测试环境
- Supabase Free Tier
- 心跳间隔：30秒
- 超时时间：5分钟

### 测试结果

| 在线用户数 | 数据库负载 | 响应时间 | 建议 |
|-----------|-----------|---------|------|
| < 100 | 极低 | < 100ms | 默认配置即可 |
| 100-1000 | 低 | < 200ms | 默认配置即可 |
| 1000-5000 | 中 | < 500ms | 建议优化配置 |
| 5000-10000 | 高 | < 1s | 需要优化 |
| > 10000 | 很高 | > 1s | 需要架构优化 |

## 🚀 优化策略

### 1. 调整心跳间隔

**默认配置：** 30秒

**优化建议：**

```javascript
// 小规模（< 1000 用户）- 默认配置
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 30000  // 30秒
});

// 中等规模（1000-5000 用户）- 增加间隔
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 60000  // 60秒
});

// 大规模（> 5000 用户）- 进一步增加
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 120000  // 2分钟
});
```

**权衡：**
- ✅ 减少数据库写入次数
- ✅ 降低网络流量
- ❌ 在线状态更新延迟增加

### 2. 调整超时时间

**默认配置：** 5分钟

**优化建议：**

```javascript
// 严格模式 - 快速清理离线用户
const onlineManager = new OnlineStatusManager(supabase, {
  inactiveTimeout: 180000  // 3分钟
});

// 宽松模式 - 减少误判
const onlineManager = new OnlineStatusManager(supabase, {
  inactiveTimeout: 600000  // 10分钟
});
```

**建议：** `inactiveTimeout` 应该是 `heartbeatInterval` 的 3-5 倍。

### 3. 数据库索引优化

**必需索引：**（已在 SQL 脚本中包含）

```sql
-- 用户名索引（用于查询和更新）
CREATE INDEX idx_online_users_username ON online_users(username);

-- 活跃时间索引（用于清理过期用户）
CREATE INDEX idx_online_users_last_activity ON online_users(last_activity);
```

**验证索引：**

```sql
-- 查看索引使用情况
EXPLAIN ANALYZE 
SELECT * FROM online_users 
WHERE last_activity > NOW() - INTERVAL '5 minutes';
```

### 4. 分页查询

对于大量在线用户，使用分页查询：

```javascript
// 自定义分页查询
async function getOnlineUsersPaginated(page = 1, pageSize = 100) {
  const offset = (page - 1) * pageSize;
  
  const { data, error } = await supabase
    .from('online_users')
    .select('*')
    .order('last_activity', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  
  // 手动清理过期用户
  const now = Date.now();
  return data.filter(user => {
    const lastActivity = new Date(user.last_activity).getTime();
    return (now - lastActivity) < 300000; // 5分钟
  });
}
```

### 5. 使用数据库视图

创建视图自动过滤活跃用户：

```sql
-- 创建活跃用户视图
CREATE VIEW active_online_users AS
SELECT *
FROM online_users
WHERE last_activity > NOW() - INTERVAL '5 minutes';

-- 使用视图查询
SELECT * FROM active_online_users;
```

在代码中使用：

```javascript
const { data } = await supabase
  .from('active_online_users')
  .select('*');
```

### 6. 批量清理

定期批量清理过期记录，而不是每次查询时清理：

```javascript
// 创建定时任务（服务端）
async function cleanupExpiredUsers() {
  const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
  
  const { error } = await supabase
    .from('online_users')
    .delete()
    .lt('last_activity', fiveMinutesAgo);

  if (error) {
    console.error('清理失败:', error);
  } else {
    console.log('清理完成');
  }
}

// 每分钟执行一次
setInterval(cleanupExpiredUsers, 60000);
```

### 7. 缓存策略

在前端缓存在线用户列表：

```javascript
class CachedOnlineManager {
  constructor(onlineManager, cacheTime = 10000) {
    this.onlineManager = onlineManager;
    this.cacheTime = cacheTime;
    this.cache = null;
    this.lastFetch = 0;
  }

  async getOnlineUsers() {
    const now = Date.now();
    
    // 如果缓存有效，直接返回
    if (this.cache && (now - this.lastFetch) < this.cacheTime) {
      return this.cache;
    }

    // 否则重新获取
    this.cache = await this.onlineManager.getOnlineUsers();
    this.lastFetch = now;
    return this.cache;
  }
}

// 使用
const cachedManager = new CachedOnlineManager(onlineManager, 10000); // 缓存10秒
const users = await cachedManager.getOnlineUsers();
```

### 8. 连接池优化

对于服务端应用，配置 Supabase 连接池：

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY',
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-connection-pool-size': '10',
      },
    },
  }
);
```

## 📈 监控和分析

### 1. 监控数据库性能

```sql
-- 查看表大小
SELECT 
  pg_size_pretty(pg_total_relation_size('online_users')) as total_size,
  pg_size_pretty(pg_relation_size('online_users')) as table_size,
  pg_size_pretty(pg_indexes_size('online_users')) as indexes_size;

-- 查看表统计
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE tablename = 'online_users';

-- 查看慢查询
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%online_users%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 2. 前端性能监控

```javascript
// 监控心跳性能
const originalUpdate = onlineManager.updateStatus.bind(onlineManager);
onlineManager.updateStatus = async function(username) {
  const start = performance.now();
  
  try {
    await originalUpdate(username);
    const duration = performance.now() - start;
    
    // 记录性能数据
    console.log(`心跳耗时: ${duration.toFixed(2)}ms`);
    
    // 如果超过阈值，发出警告
    if (duration > 1000) {
      console.warn('心跳响应慢，可能需要优化');
    }
  } catch (error) {
    console.error('心跳失败:', error);
  }
};
```

### 3. 使用 Supabase Dashboard

在 Supabase Dashboard 中监控：
- Database → Performance
- Database → Query Performance
- Database → Table Statistics

## 🏗️ 架构优化

### 大规模场景（> 10000 用户）

#### 方案 1: 使用 Redis

```javascript
// 使用 Redis 存储在线状态
import Redis from 'ioredis';

const redis = new Redis();

class RedisOnlineManager {
  async userLogin(username) {
    // 使用 Redis Set 存储在线用户
    await redis.zadd('online_users', Date.now(), username);
  }

  async getOnlineUsers() {
    const fiveMinutesAgo = Date.now() - 300000;
    
    // 清理过期用户
    await redis.zremrangebyscore('online_users', 0, fiveMinutesAgo);
    
    // 获取在线用户
    const users = await redis.zrange('online_users', 0, -1);
    return users;
  }
}
```

#### 方案 2: 分片策略

```javascript
// 根据用户名哈希分片
function getShardKey(username) {
  const hash = username.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  return hash % 10; // 10个分片
}

// 使用不同的表
const tableName = `online_users_shard_${getShardKey(username)}`;
```

#### 方案 3: 使用消息队列

```javascript
// 使用消息队列批量处理心跳
import { Queue } from 'bull';

const heartbeatQueue = new Queue('heartbeat');

// 生产者：添加心跳任务
heartbeatQueue.add({ username: 'user1' });

// 消费者：批量处理
heartbeatQueue.process(async (job) => {
  const { username } = job.data;
  await onlineManager.updateStatus(username);
});
```

## 💡 最佳实践总结

### 小规模（< 1000 用户）
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 30000,   // 30秒
  inactiveTimeout: 300000,    // 5分钟
});
```

### 中等规模（1000-5000 用户）
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 60000,   // 60秒
  inactiveTimeout: 300000,    // 5分钟
});

// + 使用数据库视图
// + 前端缓存（10秒）
```

### 大规模（> 5000 用户）
```javascript
const onlineManager = new OnlineStatusManager(supabase, {
  heartbeatInterval: 120000,  // 2分钟
  inactiveTimeout: 600000,    // 10分钟
});

// + 使用数据库视图
// + 前端缓存（30秒）
// + 分页查询
// + 服务端定时清理
// + 考虑使用 Redis
```

## 🔍 性能检查清单

- [ ] 数据库索引已创建
- [ ] 心跳间隔根据规模调整
- [ ] 超时时间合理设置
- [ ] 使用数据库视图（可选）
- [ ] 实现前端缓存（可选）
- [ ] 分页查询大量数据（可选）
- [ ] 服务端定时清理（可选）
- [ ] 监控数据库性能
- [ ] 监控前端性能
- [ ] 负载测试通过

## 📚 相关资源

- [Supabase 性能优化](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL 索引优化](https://www.postgresql.org/docs/current/indexes.html)
- [FAQ - 性能相关](./FAQ.md#性能相关)

---

**需要帮助？** 如果遇到性能问题，请在 GitHub 上提交 Issue，并提供：
- 在线用户数量
- 当前配置
- 性能监控数据
