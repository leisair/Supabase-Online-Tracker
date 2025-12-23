<!--
  Vue 3 集成示例
  
  安装依赖：
  npm install vue @supabase/supabase-js supabase-online-tracker
-->

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

// ============ Composable: 使用在线状态管理 ============
export function useOnlineStatus(username) {
  const isOnline = ref(false);
  const isFirstLogin = ref(false);
  const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
  const onlineManager = new OnlineStatusManager(supabase, {
    enableFirstLoginTracking: true,
    userTable: 'users'
  });

  onMounted(async () => {
    if (!username.value) return;

    try {
      const result = await onlineManager.userLogin(username.value);
      isOnline.value = true;
      isFirstLogin.value = result.isFirstLogin;
    } catch (error) {
      console.error('登录失败:', error);
    }
  });

  onUnmounted(() => {
    onlineManager.userLogout();
    isOnline.value = false;
  });

  return { isOnline, isFirstLogin };
}

// ============ Composable: 获取在线用户列表 ============
export function useOnlineUsers(refreshInterval = 30000) {
  const onlineUsers = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
  const onlineManager = new OnlineStatusManager(supabase);
  let intervalId = null;

  const fetchOnlineUsers = async () => {
    try {
      loading.value = true;
      const users = await onlineManager.getOnlineUsers();
      onlineUsers.value = users;
      error.value = null;
    } catch (err) {
      error.value = err.message;
      console.error('获取在线用户失败:', err);
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchOnlineUsers();
    intervalId = setInterval(fetchOnlineUsers, refreshInterval);
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return { onlineUsers, loading, error, refresh: fetchOnlineUsers };
}
</script>

<!-- ============ 组件示例 1: 用户登录组件 ============ -->
<template>
  <div class="user-login">
    <h2>欢迎, {{ username }}!</h2>
    <p>状态: {{ isOnline ? '🟢 在线' : '⚪ 离线' }}</p>
    <div v-if="isFirstLogin" class="welcome-message">
      <h3>🎉 欢迎首次登录！</h3>
      <p>让我们开始新手引导...</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  username: String
});

const { isOnline, isFirstLogin } = useOnlineStatus(computed(() => props.username));
</script>

<!-- ============ 组件示例 2: 在线用户列表 ============ -->
<template>
  <div class="online-users">
    <div class="header">
      <h2>在线用户 ({{ onlineUsers.length }})</h2>
      <button @click="refresh" :disabled="loading">
        {{ loading ? '刷新中...' : '🔄 刷新' }}
      </button>
    </div>

    <div v-if="loading && onlineUsers.length === 0">
      加载中...
    </div>

    <div v-else-if="error" class="error">
      错误: {{ error }}
    </div>

    <div v-else-if="onlineUsers.length === 0" class="empty-state">
      暂无在线用户
    </div>

    <ul v-else>
      <li v-for="user in onlineUsers" :key="user.username">
        <span class="status-dot">🟢</span>
        <strong>{{ user.username }}</strong>
        <span class="last-active">
          {{ formatLastActive(user.lastActivity) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
const { onlineUsers, loading, error, refresh } = useOnlineUsers();

function formatLastActive(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
</script>

<!-- ============ 组件示例 3: 管理后台仪表板 ============ -->
<template>
  <div class="admin-dashboard">
    <h1>管理后台</h1>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">当前在线</div>
        <div class="value">{{ onlineCount }}</div>
      </div>
      <div class="stat-card">
        <div class="label">总用户数</div>
        <div class="value">{{ totalUsers }}</div>
      </div>
      <div class="stat-card">
        <div class="label">在线率</div>
        <div class="value">{{ onlineRate }}%</div>
      </div>
    </div>

    <!-- 在线用户列表 -->
    <div class="user-list-panel">
      <div class="panel-header">
        <h2>在线用户列表</h2>
        <button @click="refresh" :disabled="loading">
          {{ loading ? '刷新中...' : '🔄 刷新' }}
        </button>
      </div>

      <table class="user-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>状态</th>
            <th>最后活跃时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in onlineUsers" :key="user.username">
            <td>{{ user.username }}</td>
            <td>
              <span class="status-badge online">🟢 在线</span>
            </td>
            <td>{{ new Date(user.lastActivity).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="onlineUsers.length === 0" class="empty-state">
        暂无在线用户
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { createClient } from '@supabase/supabase-js';

const { onlineUsers, loading, refresh } = useOnlineUsers();
const totalUsers = ref(0);
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

const onlineCount = computed(() => onlineUsers.value.length);
const onlineRate = computed(() => {
  return totalUsers.value > 0 
    ? Math.round((onlineCount.value / totalUsers.value) * 100) 
    : 0;
});

onMounted(async () => {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  totalUsers.value = count || 0;
});
</script>

<!-- ============ 完整应用示例 ============ -->
<template>
  <div class="app">
    <div v-if="!currentUser">
      <LoginForm @login="handleLogin" />
    </div>
    <div v-else>
      <UserLogin :username="currentUser" />
      <button @click="handleLogout">登出</button>
      <AdminDashboard />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const currentUser = ref(null);

function handleLogin(username) {
  currentUser.value = username;
}

function handleLogout() {
  currentUser.value = null;
}
</script>

<!-- 简单的登录表单 -->
<template>
  <form @submit.prevent="handleSubmit">
    <input
      v-model="username"
      type="text"
      placeholder="输入用户名"
    />
    <button type="submit">登录</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['login']);
const username = ref('');

function handleSubmit() {
  if (username.value.trim()) {
    emit('login', username.value.trim());
  }
}
</script>

<style scoped>
/* 添加你的样式 */
.admin-dashboard {
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-card .label {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.stat-card .value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
}

.status-badge.online {
  background: #d4edda;
  color: #155724;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
