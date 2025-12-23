/**
 * Supabase Online Tracker 初始化文件
 * 
 * 这个文件会根据 config.js 中的配置自动初始化所有功能
 * 你只需要导入这个文件，然后使用导出的实例即可
 */

import { createClient } from '@supabase/supabase-js';
import { OnlineStatusManager } from './index.js';
import { ActivityStats } from './extensions/stats.js';
import config from './config.js';

// 创建 Supabase 客户端
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// 创建在线状态管理器
export const onlineManager = new OnlineStatusManager(supabase, {
  tableName: config.tables.onlineUsers,
  heartbeatInterval: config.basic.heartbeatInterval,
  inactiveTimeout: config.basic.inactiveTimeout,
  enableRealtime: config.features.realtime,
  enableFirstLoginTracking: config.features.firstLoginTracking,
  userTable: config.tables.users,
  usernameField: 'username',
  maxOnlineTime: config.timeLimit.maxOnlineTime,
  warningTime: config.timeLimit.warningTime,
  onUserJoin: config.callbacks.onUserJoin,
  onUserLeave: config.callbacks.onUserLeave,
  onTimeWarning: config.callbacks.onTimeWarning,
  onTimeLimit: config.callbacks.onTimeLimit,
  onError: config.callbacks.onError,
});

// 创建活跃度统计实例（如果启用）
export const activityStats = config.features.activityStats
  ? new ActivityStats(supabase, {
      tableName: config.tables.activityLogs,
      retentionDays: config.retention.days,
      autoCleanup: config.retention.autoCleanup,
    })
  : null;

/**
 * 便捷方法：用户登录
 * @param {string} username - 用户名
 * @returns {Promise<{isFirstLogin: boolean}>}
 */
export async function login(username) {
  const result = await onlineManager.userLogin(username);
  
  // 如果启用了活跃度统计，记录登录
  if (activityStats) {
    await activityStats.recordLogin(username);
  }
  
  return result;
}

/**
 * 便捷方法：用户登出
 * @returns {Promise<void>}
 */
export async function logout() {
  // 如果启用了活跃度统计，记录登出
  if (activityStats && onlineManager.currentUsername) {
    await activityStats.recordLogout(onlineManager.currentUsername);
  }
  
  await onlineManager.userLogout();
}

/**
 * 便捷方法：获取在线用户列表
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>}
 */
export async function getOnlineUsers(options = {}) {
  return await onlineManager.getOnlineUsers(options);
}

/**
 * 便捷方法：获取在线用户数量
 * @returns {Promise<number>}
 */
export async function getOnlineUserCount() {
  return await onlineManager.getOnlineUserCount();
}

/**
 * 便捷方法：获取用户统计数据
 * @param {string} username - 用户名
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>}
 */
export async function getUserStats(username, options = {}) {
  if (!activityStats) {
    throw new Error('活跃度统计未启用，请在 config.js 中设置 features.activityStats = true');
  }
  return await activityStats.getUserStats(username, options);
}

// 默认导出
export default {
  supabase,
  onlineManager,
  activityStats,
  login,
  logout,
  getOnlineUsers,
  getOnlineUserCount,
  getUserStats,
};
