import { useEffect, useState, useCallback, useRef } from 'react';
import { OnlineStatusManager } from 'supabase-online-tracker';

/**
 * React Hook - 在线状态管理
 * @param {Object} supabase - Supabase 客户端
 * @param {Object} options - 配置选项
 * @returns {Object} 在线状态管理器和状态
 */
export function useOnlineStatus(supabase, options = {}) {
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;

    // 创建管理器实例
    managerRef.current = new OnlineStatusManager(supabase, {
      ...options,
      onError: (err, operation) => {
        console.error(`操作失败: ${operation}`, err);
        setError(err);
        if (options.onError) {
          options.onError(err, operation);
        }
      }
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [supabase]);

  const login = useCallback(async (username) => {
    if (!managerRef.current) {
      throw new Error('管理器未初始化');
    }

    try {
      setError(null);
      const result = await managerRef.current.userLogin(username);
      setIsOnline(true);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      setError(null);
      await managerRef.current.userLogout();
      setIsOnline(false);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    manager: managerRef.current,
    isOnline,
    error,
    login,
    logout
  };
}

/**
 * React Hook - 在线用户列表
 * @param {Object} supabase - Supabase 客户端
 * @param {Object} options - 配置选项
 * @returns {Object} 在线用户列表和刷新函数
 */
export function useOnlineUsers(supabase, options = {}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;

    // 创建管理器实例
    managerRef.current = new OnlineStatusManager(supabase, {
      ...options,
      enableRealtime: options.enableRealtime !== false, // 默认启用实时订阅
      onUserJoin: (user) => {
        setUsers(prev => {
          // 避免重复添加
          if (prev.some(u => u.username === user.username)) {
            return prev;
          }
          return [...prev, user];
        });
        if (options.onUserJoin) {
          options.onUserJoin(user);
        }
      },
      onUserLeave: (user) => {
        setUsers(prev => prev.filter(u => u.username !== user.username));
        if (options.onUserLeave) {
          options.onUserLeave(user);
        }
      },
      onError: (err, operation) => {
        console.error(`操作失败: ${operation}`, err);
        setError(err);
        if (options.onError) {
          options.onError(err, operation);
        }
      }
    });

    // 启动实时订阅
    if (options.enableRealtime !== false) {
      managerRef.current.startRealtimeSubscription();
    }

    // 初始加载
    refresh();

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const onlineUsers = await managerRef.current.getOnlineUsers();
      setUsers(onlineUsers);
    } catch (err) {
      setError(err);
      console.error('获取在线用户失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    refresh
  };
}
