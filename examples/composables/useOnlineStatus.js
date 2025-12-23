import { ref, onMounted, onUnmounted } from 'vue';
import { OnlineStatusManager } from 'supabase-online-tracker';

/**
 * Vue Composable - 在线状态管理
 * @param {Object} supabase - Supabase 客户端
 * @param {Object} options - 配置选项
 * @returns {Object} 在线状态管理器和状态
 */
export function useOnlineStatus(supabase, options = {}) {
  const isOnline = ref(false);
  const error = ref(null);
  let manager = null;

  onMounted(() => {
    if (!supabase) return;

    // 创建管理器实例
    manager = new OnlineStatusManager(supabase, {
      ...options,
      onError: (err, operation) => {
        console.error(`操作失败: ${operation}`, err);
        error.value = err;
        if (options.onError) {
          options.onError(err, operation);
        }
      }
    });
  });

  onUnmounted(() => {
    if (manager) {
      manager.destroy();
    }
  });

  const login = async (username) => {
    if (!manager) {
      throw new Error('管理器未初始化');
    }

    try {
      error.value = null;
      const result = await manager.userLogin(username);
      isOnline.value = true;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    }
  };

  const logout = async () => {
    if (!manager) return;

    try {
      error.value = null;
      await manager.userLogout();
      isOnline.value = false;
    } catch (err) {
      error.value = err;
      throw err;
    }
  };

  return {
    manager,
    isOnline,
    error,
    login,
    logout
  };
}

/**
 * Vue Composable - 在线用户列表
 * @param {Object} supabase - Supabase 客户端
 * @param {Object} options - 配置选项
 * @returns {Object} 在线用户列表和刷新函数
 */
export function useOnlineUsers(supabase, options = {}) {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let manager = null;

  onMounted(() => {
    if (!supabase) return;

    // 创建管理器实例
    manager = new OnlineStatusManager(supabase, {
      ...options,
      enableRealtime: options.enableRealtime !== false, // 默认启用实时订阅
      onUserJoin: (user) => {
        // 避免重复添加
        if (!users.value.some(u => u.username === user.username)) {
          users.value.push(user);
        }
        if (options.onUserJoin) {
          options.onUserJoin(user);
        }
      },
      onUserLeave: (user) => {
        users.value = users.value.filter(u => u.username !== user.username);
        if (options.onUserLeave) {
          options.onUserLeave(user);
        }
      },
      onError: (err, operation) => {
        console.error(`操作失败: ${operation}`, err);
        error.value = err;
        if (options.onError) {
          options.onError(err, operation);
        }
      }
    });

    // 启动实时订阅
    if (options.enableRealtime !== false) {
      manager.startRealtimeSubscription();
    }

    // 初始加载
    refresh();
  });

  onUnmounted(() => {
    if (manager) {
      manager.destroy();
    }
  });

  const refresh = async () => {
    if (!manager) return;

    try {
      loading.value = true;
      error.value = null;
      const onlineUsers = await manager.getOnlineUsers();
      users.value = onlineUsers;
    } catch (err) {
      error.value = err;
      console.error('获取在线用户失败:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    users,
    loading,
    error,
    refresh
  };
}
