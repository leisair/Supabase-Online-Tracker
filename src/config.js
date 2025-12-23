/**
 * ========================================
 * Supabase Online Tracker 配置文件
 * ========================================
 * 
 * 使用步骤：
 * 1. 修改下面的 SUPABASE_URL 和 SUPABASE_ANON_KEY
 * 2. 根据需要开启其他功能
 */

export default {
  
  // ==========================================
  // 【必填】Supabase 连接配置
  // ==========================================
  // 在 Supabase 控制台 -> Settings -> API 获取
  
  supabase: {
    url: 'https://你的项目.supabase.co',      // Project URL
    anonKey: '你的anon-key',                   // anon public key
  },

  // ==========================================
  // 【可选】基础设置
  // ==========================================
  
  basic: {
    tableName: 'online_users',        // 在线用户表名
    heartbeatInterval: 30000,         // 心跳间隔（30秒）
    inactiveTimeout: 300000,          // 离线超时（5分钟）
  },

  // ==========================================
  // 【可选】功能开关
  // ==========================================
  
  features: {
    // 实时通知（有人上线/离线时立即知道）
    realtime: false,
    
    // 首次登录检测（需要在用户表添加 has_logged_in 字段）
    firstLoginTracking: false,
    
    // 活跃度统计（需要创建 user_activity_logs 表）
    activityStats: false,
  },

  // ==========================================
  // 【可选】在线时长限制
  // ==========================================
  // 设置为 0 表示不限制
  
  timeLimit: {
    maxOnlineTime: 0,                 // 最大在线时长（0 = 不限制）
    warningTime: 0,                   // 警告时间（0 = 不警告）
    // 示例：限制 1 小时，50 分钟时警告
    // maxOnlineTime: 3600000,        // 1 小时
    // warningTime: 3000000,          // 50 分钟
  },

  // ==========================================
  // 【可选】数据库表名配置
  // ==========================================
  
  tables: {
    onlineUsers: 'online_users',      // 在线用户表
    activityLogs: 'user_activity_logs', // 活动日志表
    users: 'users',                   // 用户表（首次登录检测用）
  },

  // ==========================================
  // 【可选】数据保留设置
  // ==========================================
  
  retention: {
    days: 30,                         // 保留 30 天数据
    autoCleanup: true,                // 自动清理过期数据
  },

  // ==========================================
  // 【可选】事件回调
  // ==========================================
  // 在这里定义当特定事件发生时要做什么
  
  callbacks: {
    
    // 用户上线时（需要开启 realtime）
    onUserJoin: (user) => {
      console.log(`${user.username} 上线了`);
    },
    
    // 用户离线时（需要开启 realtime）
    onUserLeave: (user) => {
      console.log(`${user.username} 离线了`);
    },
    
    // 在线时长警告
    onTimeWarning: () => {
      alert('您已在线较长时间，建议休息一下');
    },
    
    // 达到最大在线时长（会自动登出）
    onTimeLimit: () => {
      alert('已达到最大在线时长，即将自动登出');
    },
    
    // 发生错误时
    onError: (error) => {
      console.error('在线状态错误:', error);
    },
  },
};
