import { SupabaseClient } from '@supabase/supabase-js';

export interface OnlineStatusManagerOptions {
  /** 在线用户表名，默认 'online_users' */
  tableName?: string;
  /** 心跳间隔（毫秒），默认 30000 */
  heartbeatInterval?: number;
  /** 不活跃超时时间（毫秒），默认 300000 */
  inactiveTimeout?: number;
  /** 是否启用首次登录检测，默认 false */
  enableFirstLoginTracking?: boolean;
  /** 用户表名（启用首次登录检测时必需），默认 'users' */
  userTable?: string;
  /** 用户名字段名，默认 'username' */
  usernameField?: string;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 错误回调函数 */
  onError?: (error: Error, operation: string) => void;
  /** 是否启用实时订阅，默认 false */
  enableRealtime?: boolean;
  /** 用户上线回调 */
  onUserJoin?: (user: OnlineUser) => void;
  /** 用户离线回调 */
  onUserLeave?: (user: { username: string }) => void;
  /** 最大在线时长（毫秒），默认 null（不限制） */
  maxOnlineTime?: number | null;
  /** 警告时间（毫秒），默认 null */
  warningTime?: number | null;
  /** 时长警告回调 */
  onTimeWarning?: (timeLeft: number) => void;
  /** 时长限制回调 */
  onTimeLimit?: () => void;
}

export interface GetOnlineUsersOptions {
  /** 搜索关键词（用户名模糊匹配） */
  search?: string;
  /** 自定义过滤条件 */
  filter?: Record<string, any>;
  /** 排序字段 */
  orderBy?: string;
  /** 是否升序排序，默认 false */
  ascending?: boolean;
  /** 限制返回数量 */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
}

export interface OnlineUser {
  /** 用户名 */
  username: string;
  /** 最后活跃时间（时间戳） */
  lastActivity: number;
}

export interface LoginResult {
  /** 是否为首次登录 */
  isFirstLogin: boolean;
}

export class OnlineStatusManager {
  constructor(supabase: SupabaseClient, options?: OnlineStatusManagerOptions);

  /**
   * 用户登录 - 启动在线状态追踪
   * @param username 用户名
   * @returns 返回是否首次登录
   */
  userLogin(username: string): Promise<LoginResult>;

  /**
   * 用户登出 - 停止在线状态追踪
   */
  userLogout(): Promise<void>;

  /**
   * 更新用户在线状态
   * @param username 用户名
   */
  updateStatus(username: string): Promise<void>;

  /**
   * 移除用户在线状态
   * @param username 用户名
   */
  removeStatus(username: string): Promise<void>;

  /**
   * 获取在线用户列表（自动清理过期用户）
   * @param options 查询选项
   * @returns 在线用户列表
   */
  getOnlineUsers(options?: GetOnlineUsersOptions): Promise<OnlineUser[]>;

  /**
   * 获取在线用户总数
   * @param options 查询选项
   * @returns 在线用户数量
   */
  getOnlineUserCount(options?: GetOnlineUsersOptions): Promise<number>;

  /**
   * 获取当前在线时长（毫秒）
   */
  getCurrentOnlineTime(): number;

  /**
   * 获取剩余在线时长（毫秒）
   */
  getRemainingTime(): number | null;

  /**
   * 启动心跳定时器
   */
  startHeartbeat(): void;

  /**
   * 停止心跳定时器
   */
  stopHeartbeat(): void;

  /**
   * 启动实时订阅
   */
  startRealtimeSubscription(): void;

  /**
   * 停止实时订阅
   */
  stopRealtimeSubscription(): void;

  /**
   * 销毁实例
   */
  destroy(): void;
}
