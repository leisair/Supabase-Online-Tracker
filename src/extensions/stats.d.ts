import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivityStatsOptions {
  /** 活动日志表名，默认 'user_activity_logs' */
  logsTable?: string;
  /** 在线用户表名，默认 'online_users' */
  onlineTable?: string;
  /** 数据保留天数，默认 30 天 */
  retentionDays?: number;
  /** 是否启用自动清理，默认 true */
  autoCleanup?: boolean;
}

export interface LoginMetadata {
  /** 设备类型 */
  deviceType?: string;
  /** 设备详细信息 */
  deviceInfo?: any;
}

export interface UserSession {
  /** 登录时间（时间戳） */
  loginTime: number;
  /** 登出时间（时间戳） */
  logoutTime: number | null;
  /** 会话时长（秒） */
  duration: number;
  /** 设备类型 */
  deviceType: string;
}

export interface UserStats {
  /** 用户名 */
  username: string;
  /** 统计周期 */
  period: string;
  /** 登录次数 */
  loginCount: number;
  /** 总在线时长（秒） */
  totalOnlineTime: number;
  /** 平均会话时长（秒） */
  averageSessionTime: number;
  /** 最后登录时间（时间戳） */
  lastLogin: number | null;
  /** 会话列表 */
  sessions: UserSession[];
}

export interface TopActiveUser {
  /** 用户名 */
  username: string;
  /** 总在线时长（秒） */
  totalTime: number;
  /** 会话数量 */
  sessionCount: number;
}

export interface GetStatsOptions {
  /** 统计周期：today, week, month, year */
  period?: 'today' | 'week' | 'month' | 'year';
}

export interface GetTopUsersOptions {
  /** 返回数量限制 */
  limit?: number;
  /** 统计周期 */
  period?: 'today' | 'week' | 'month' | 'year';
}

export class ActivityStats {
  constructor(supabase: SupabaseClient, options?: ActivityStatsOptions);

  /**
   * 记录用户登录
   * @param username 用户名
   * @param metadata 额外信息
   */
  recordLogin(username: string, metadata?: LoginMetadata): Promise<any>;

  /**
   * 记录用户登出
   * @param username 用户名
   */
  recordLogout(username: string): Promise<any>;

  /**
   * 获取用户统计数据
   * @param username 用户名
   * @param options 选项
   */
  getUserStats(username: string, options?: GetStatsOptions): Promise<UserStats>;

  /**
   * 获取活跃用户排行
   * @param options 选项
   */
  getTopActiveUsers(options?: GetTopUsersOptions): Promise<TopActiveUser[]>;

  /**
   * 清理过期记录
   * @param days 保留天数（可选，默认使用构造函数配置）
   */
  cleanupOldRecords(days?: number): Promise<{ deletedCount: number; cutoffDate: Date }>;

  /**
   * 获取数据库统计信息
   */
  getStorageStats(): Promise<{
    totalRecords: number;
    oldestRecord: string | null;
    newestRecord: string | null;
    dataSpanDays: number;
    retentionDays: number;
    autoCleanupEnabled: boolean;
    estimatedSize: string;
  }>;

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void;

  /**
   * 销毁实例
   */
  destroy(): void;
}
