/**
 * Supabase Online Tracker
 * 基于 Supabase 的跨设备实时在线状态管理库
 */

export class OnlineStatusManager {
    constructor(supabase, options = {}) {
        if (!supabase) {
            throw new Error('Supabase 客户端实例是必需的');
        }

        this.supabase = supabase;
        
        // 在线状态配置
        this.tableName = options.tableName || 'online_users';
        this.heartbeatInterval = options.heartbeatInterval || 30000; // 30秒
        this.inactiveTimeout = options.inactiveTimeout || 300000; // 5分钟
        
        // 首次登录检测配置
        this.enableFirstLoginTracking = options.enableFirstLoginTracking || false;
        this.userTable = options.userTable || 'users';
        this.usernameField = options.usernameField || 'username';
        
        // 错误处理配置
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // 1秒
        this.onError = options.onError || null; // 错误回调
        
        // 实时订阅配置
        this.enableRealtime = options.enableRealtime || false;
        this.onUserJoin = options.onUserJoin || null; // 用户上线回调
        this.onUserLeave = options.onUserLeave || null; // 用户离线回调
        
        // 在线时长限制配置
        this.maxOnlineTime = options.maxOnlineTime || null; // 最大在线时长（毫秒）
        this.warningTime = options.warningTime || null; // 警告时间（毫秒）
        this.onTimeWarning = options.onTimeWarning || null; // 时长警告回调
        this.onTimeLimit = options.onTimeLimit || null; // 时长限制回调
        
        this.heartbeatTimer = null;
        this.currentUsername = null;
        this.retryCount = 0;
        this.realtimeChannel = null;
        this.loginTime = null;
        this.timeLimitTimer = null;
        this.timeWarningTimer = null;
    }

    /**
     * 重试包装器
     * @param {Function} fn - 要执行的函数
     * @param {string} operation - 操作名称（用于日志）
     * @returns {Promise<any>}
     */
    async _retryOperation(fn, operation) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, attempt); // 指数退避
                    console.warn(`${operation} 失败，${delay}ms 后重试 (${attempt + 1}/${this.maxRetries})`, error);
                    await this._sleep(delay);
                } else {
                    console.error(`${operation} 失败，已达最大重试次数`, error);
                    if (this.onError) {
                        this.onError(error, operation);
                    }
                }
            }
        }
        
        throw lastError;
    }

    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 用户登录 - 启动在线状态追踪
     * @param {string} username - 用户名
     * @returns {Promise<{isFirstLogin: boolean}>} 返回是否首次登录
     */
    async userLogin(username) {
        if (!username) {
            throw new Error('用户名不能为空');
        }

        this.currentUsername = username;
        
        // 检查并标记首次登录（如果启用了该功能）
        let isFirstLogin = false;
        if (this.enableFirstLoginTracking) {
            try {
                isFirstLogin = await this._retryOperation(
                    () => this.markUserLoggedIn(username),
                    '首次登录检测'
                );
            } catch (error) {
                // 首次登录检测失败不影响主流程
                console.warn('首次登录检测失败，继续登录流程', error);
            }
        }
        
        // 立即更新一次在线状态（带重试）
        await this._retryOperation(
            () => this.updateStatus(username),
            '更新在线状态'
        );
        
        // 启动心跳
        this.startHeartbeat();
        
        // 设置离线检测
        this.setupOfflineDetection();
        
        // 启动实时订阅（如果启用）
        if (this.enableRealtime) {
            this.startRealtimeSubscription();
        }
        
        // 启动在线时长监控（如果启用）
        if (this.maxOnlineTime) {
            this.startTimeLimitMonitor();
        }
        
        return { isFirstLogin };
    }

    /**
     * 启动在线时长监控
     */
    startTimeLimitMonitor() {
        this.loginTime = Date.now();
        
        // 清除已存在的定时器
        this.stopTimeLimitMonitor();
        
        // 设置警告定时器
        if (this.warningTime && this.onTimeWarning) {
            this.timeWarningTimer = setTimeout(() => {
                const timeLeft = this.maxOnlineTime - (Date.now() - this.loginTime);
                if (this.onTimeWarning) {
                    this.onTimeWarning(timeLeft);
                }
            }, this.warningTime);
        }
        
        // 设置限制定时器
        this.timeLimitTimer = setTimeout(async () => {
            console.log('在线时长已达上限');
            
            if (this.onTimeLimit) {
                this.onTimeLimit();
            }
            
            // 自动登出
            await this.userLogout();
        }, this.maxOnlineTime);
    }

    /**
     * 停止在线时长监控
     */
    stopTimeLimitMonitor() {
        if (this.timeWarningTimer) {
            clearTimeout(this.timeWarningTimer);
            this.timeWarningTimer = null;
        }
        
        if (this.timeLimitTimer) {
            clearTimeout(this.timeLimitTimer);
            this.timeLimitTimer = null;
        }
        
        this.loginTime = null;
    }

    /**
     * 获取当前在线时长（毫秒）
     */
    getCurrentOnlineTime() {
        if (!this.loginTime) return 0;
        return Date.now() - this.loginTime;
    }

    /**
     * 获取剩余在线时长（毫秒）
     */
    getRemainingTime() {
        if (!this.maxOnlineTime || !this.loginTime) return null;
        const elapsed = Date.now() - this.loginTime;
        return Math.max(0, this.maxOnlineTime - elapsed);
    }

    /**
     * 启动实时订阅
     */
    startRealtimeSubscription() {
        if (this.realtimeChannel) {
            return; // 已经订阅
        }

        try {
            this.realtimeChannel = this.supabase
                .channel(`online_users_${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        if (this.onUserJoin && payload.new.username !== this.currentUsername) {
                            this.onUserJoin({
                                username: payload.new.username,
                                lastActivity: new Date(payload.new.last_activity).getTime()
                            });
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        if (this.onUserLeave && payload.old.username !== this.currentUsername) {
                            this.onUserLeave({
                                username: payload.old.username
                            });
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('实时订阅已启动');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('实时订阅错误');
                        if (this.onError) {
                            this.onError(new Error('实时订阅失败'), '实时订阅');
                        }
                    }
                });
        } catch (error) {
            console.error('启动实时订阅失败:', error);
            if (this.onError) {
                this.onError(error, '启动实时订阅');
            }
        }
    }

    /**
     * 停止实时订阅
     */
    stopRealtimeSubscription() {
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
            console.log('实时订阅已停止');
        }
    }

    /**
     * 用户登出 - 停止在线状态追踪
     */
    async userLogout() {
        if (this.currentUsername) {
            await this.removeStatus(this.currentUsername);
        }
        
        this.stopHeartbeat();
        this.stopTimeLimitMonitor();
        this.currentUsername = null;
    }

    /**
     * 更新用户在线状态
     * @param {string} username - 用户名
     */
    async updateStatus(username) {
        try {
            const now = new Date().toISOString();
            
            const { error } = await this.supabase
                .from(this.tableName)
                .upsert({
                    username: username,
                    last_activity: now
                }, {
                    onConflict: 'username'
                });

            if (error) throw error;
        } catch (error) {
            console.error('更新在线状态失败:', error);
            throw error;
        }
    }

    /**
     * 移除用户在线状态
     * @param {string} username - 用户名
     */
    async removeStatus(username) {
        try {
            const { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('username', username);

            if (error) throw error;
        } catch (error) {
            console.error('移除在线状态失败:', error);
            throw error;
        }
    }

    /**
     * 获取在线用户列表（自动清理过期用户）
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 在线用户列表
     */
    async getOnlineUsers(options = {}) {
        try {
            // 构建查询
            let query = this.supabase
                .from(this.tableName)
                .select('*');
            
            // 搜索过滤
            if (options.search) {
                query = query.ilike('username', `%${options.search}%`);
            }
            
            // 自定义过滤条件
            if (options.filter) {
                Object.keys(options.filter).forEach(key => {
                    query = query.eq(key, options.filter[key]);
                });
            }
            
            // 排序
            if (options.orderBy) {
                query = query.order(options.orderBy, { 
                    ascending: options.ascending !== false 
                });
            } else {
                query = query.order('last_activity', { ascending: false });
            }
            
            // 分页
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;

            if (error) throw error;
            
            // 清理超时的在线状态
            const now = new Date();
            const activeUsers = [];
            const expiredUsers = [];
            
            (data || []).forEach(user => {
                const lastActivity = new Date(user.last_activity);
                const timeDiff = now - lastActivity;
                
                if (timeDiff < this.inactiveTimeout) {
                    activeUsers.push({
                        username: user.username,
                        lastActivity: lastActivity.getTime(),
                        // 包含其他自定义字段
                        ...Object.keys(user).reduce((acc, key) => {
                            if (!['id', 'username', 'last_activity', 'created_at'].includes(key)) {
                                acc[key] = user[key];
                            }
                            return acc;
                        }, {})
                    });
                } else {
                    expiredUsers.push(user.username);
                }
            });
            
            // 删除过期的在线状态
            if (expiredUsers.length > 0) {
                await this.supabase
                    .from(this.tableName)
                    .delete()
                    .in('username', expiredUsers);
            }
            
            return activeUsers;
        } catch (error) {
            console.error('获取在线用户失败:', error);
            return [];
        }
    }

    /**
     * 获取在线用户总数
     * @param {Object} options - 查询选项
     * @returns {Promise<number>} 在线用户数量
     */
    async getOnlineUserCount(options = {}) {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });
            
            // 搜索过滤
            if (options.search) {
                query = query.ilike('username', `%${options.search}%`);
            }
            
            // 自定义过滤条件
            if (options.filter) {
                Object.keys(options.filter).forEach(key => {
                    query = query.eq(key, options.filter[key]);
                });
            }
            
            // 只统计活跃用户
            const cutoffTime = new Date(Date.now() - this.inactiveTimeout);
            query = query.gte('last_activity', cutoffTime.toISOString());

            const { count, error } = await query;

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('获取在线用户数量失败:', error);
            return 0;
        }
    }

    /**
     * 启动心跳定时器
     */
    startHeartbeat() {
        if (!this.currentUsername) return;

        // 清除已存在的定时器
        this.stopHeartbeat();
        
        // 设置新的定时器
        this.heartbeatTimer = setInterval(async () => {
            if (this.currentUsername) {
                try {
                    await this._retryOperation(
                        () => this.updateStatus(this.currentUsername),
                        '心跳更新'
                    );
                    this.retryCount = 0; // 成功后重置重试计数
                } catch (error) {
                    this.retryCount++;
                    console.error('心跳更新失败:', error);
                    
                    // 如果连续失败次数过多，停止心跳
                    if (this.retryCount >= 5) {
                        console.error('心跳连续失败次数过多，停止心跳');
                        this.stopHeartbeat();
                        if (this.onError) {
                            this.onError(new Error('心跳连续失败'), '心跳停止');
                        }
                    }
                }
            }
        }, this.heartbeatInterval);
    }

    /**
     * 停止心跳定时器
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * 设置离线检测
     */
    setupOfflineDetection() {
        if (!this.currentUsername) return;

        const username = this.currentUsername;

        // 页面卸载时移除在线状态
        const handleBeforeUnload = () => {
            // 使用同步请求确保在页面关闭前完成
            // 注意：这是最后的手段，现代浏览器可能会阻止同步请求
            try {
                // 尝试使用 sendBeacon（异步但更可靠）
                const apiKey = this.supabase.supabaseKey;
                const url = `${this.supabase.supabaseUrl}/rest/v1/${this.tableName}?username=eq.${encodeURIComponent(username)}`;
                
                // sendBeacon 需要正确的请求格式
                const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
                const headers = new Headers();
                headers.append('apikey', apiKey);
                headers.append('Authorization', `Bearer ${apiKey}`);
                
                // 由于 sendBeacon 不支持自定义 headers 和 DELETE 方法
                // 我们使用同步 XMLHttpRequest 作为备选方案
                const xhr = new XMLHttpRequest();
                xhr.open('DELETE', url, false); // false = 同步请求
                xhr.setRequestHeader('apikey', apiKey);
                xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send();
            } catch (error) {
                // 静默失败，依赖自动清理机制
                console.warn('页面卸载时清理在线状态失败，将依赖自动清理机制');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // 页面可见性变化
        const handleVisibilityChange = () => {
            if (document.hidden) {
                this.stopHeartbeat();
            } else {
                this.startHeartbeat();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 保存清理函数
        this._cleanupListeners = () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }

    /**
     * 标记用户已登录（首次登录检测）
     * @param {string} username - 用户名
     * @returns {Promise<boolean>} 返回是否为首次登录
     */
    async markUserLoggedIn(username) {
        try {
            // 先查询用户当前状态
            const { data, error: queryError } = await this.supabase
                .from(this.userTable)
                .select('has_logged_in')
                .eq(this.usernameField, username)
                .single();

            if (queryError) {
                console.error('查询用户登录状态失败:', queryError);
                return false;
            }

            const isFirstLogin = !data?.has_logged_in;

            // 如果是首次登录，更新标记
            if (isFirstLogin) {
                const { error: updateError } = await this.supabase
                    .from(this.userTable)
                    .update({ has_logged_in: true })
                    .eq(this.usernameField, username);

                if (updateError) {
                    console.error('标记用户登录状态失败:', updateError);
                }
            }

            return isFirstLogin;
        } catch (error) {
            console.error('标记用户登录失败:', error);
            return false;
        }
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stopHeartbeat();
        this.stopRealtimeSubscription();
        this.stopTimeLimitMonitor();
        if (this._cleanupListeners) {
            this._cleanupListeners();
        }
    }
}
