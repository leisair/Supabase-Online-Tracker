/**
 * React 集成示例
 * 
 * 安装依赖：
 * npm install react @supabase/supabase-js supabase-online-tracker
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from 'supabase-online-tracker';

// 配置 Supabase
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// 创建在线状态管理器（全局单例）
const onlineManager = new OnlineStatusManager(supabase, {
  enableFirstLoginTracking: true,
  userTable: 'users'
});

// ============ Hook: 使用在线状态管理 ============
export function useOnlineStatus(username) {
  const [isOnline, setIsOnline] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    if (!username) return;

    // 用户登录
    const login = async () => {
      try {
        const result = await onlineManager.userLogin(username);
        setIsOnline(true);
        setIsFirstLogin(result.isFirstLogin);
      } catch (error) {
        console.error('登录失败:', error);
      }
    };

    login();

    // 清理：用户登出
    return () => {
      onlineManager.userLogout();
      setIsOnline(false);
    };
  }, [username]);

  return { isOnline, isFirstLogin };
}

// ============ Hook: 获取在线用户列表 ============
export function useOnlineUsers(refreshInterval = 30000) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      setLoading(true);
      const users = await onlineManager.getOnlineUsers();
      setOnlineUsers(users);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('获取在线用户失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 立即获取一次
    fetchOnlineUsers();

    // 定期刷新
    const interval = setInterval(fetchOnlineUsers, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchOnlineUsers, refreshInterval]);

  return { onlineUsers, loading, error, refresh: fetchOnlineUsers };
}

// ============ 组件示例 1: 用户登录组件 ============
export function UserLogin({ username }) {
  const { isOnline, isFirstLogin } = useOnlineStatus(username);

  return (
    <div>
      <h2>欢迎, {username}!</h2>
      <p>状态: {isOnline ? '🟢 在线' : '⚪离线'}</p>
      {isFirstLogin && (
        <div className="welcome-message">
          <h3>🎉 欢迎首次登录！</h3>
          <p>让我们开始新手引导...</p>
        </div>
      )}
    </div>
  );
}

// ============ 组件示例 2: 在线用户列表 ============
export function OnlineUserList() {
  const { onlineUsers, loading, error, refresh } = useOnlineUsers();

  if (loading && onlineUsers.length === 0) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div className="online-users">
      <div className="header">
        <h2>在线用户 ({onlineUsers.length})</h2>
        <button onClick={refresh} disabled={loading}>
          {loading ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {onlineUsers.length === 0 ? (
        <p>暂无在线用户</p>
      ) : (
        <ul>
          {onlineUsers.map((user) => (
            <li key={user.username}>
              <span className="status-dot">🟢</span>
              <strong>{user.username}</strong>
              <span className="last-active">
                {formatLastActive(user.lastActivity)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============ 组件示例 3: 管理后台仪表板 ============
export function AdminDashboard() {
  const { onlineUsers, loading, refresh } = useOnlineUsers();
  const [totalUsers, setTotalUsers] = useState(0);

  // 获取总用户数
  useEffect(() => {
    const fetchTotalUsers = async () => {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(count || 0);
    };
    fetchTotalUsers();
  }, []);

  const onlineCount = onlineUsers.length;
  const onlineRate = totalUsers > 0 
    ? Math.round((onlineCount / totalUsers) * 100) 
    : 0;

  return (
    <div className="admin-dashboard">
      <h1>管理后台</h1>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">当前在线</div>
          <div className="value">{onlineCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">总用户数</div>
          <div className="value">{totalUsers}</div>
        </div>
        <div className="stat-card">
          <div className="label">在线率</div>
          <div className="value">{onlineRate}%</div>
        </div>
      </div>

      {/* 在线用户列表 */}
      <div className="user-list-panel">
        <div className="panel-header">
          <h2>在线用户列表</h2>
          <button onClick={refresh} disabled={loading}>
            {loading ? '刷新中...' : '🔄 刷新'}
          </button>
        </div>

        <table className="user-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>状态</th>
              <th>最后活跃时间</th>
            </tr>
          </thead>
          <tbody>
            {onlineUsers.map((user) => (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>
                  <span className="status-badge online">
                    🟢 在线
                  </span>
                </td>
                <td>{new Date(user.lastActivity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {onlineUsers.length === 0 && (
          <div className="empty-state">暂无在线用户</div>
        )}
      </div>
    </div>
  );
}

// ============ 工具函数 ============
function formatLastActive(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

// ============ 完整应用示例 ============
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (username) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="app">
      {!currentUser ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <>
          <UserLogin username={currentUser} />
          <button onClick={handleLogout}>登出</button>
          <AdminDashboard />
        </>
      )}
    </div>
  );
}

// 简单的登录表单
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="输入用户名"
      />
      <button type="submit">登录</button>
    </form>
  );
}
