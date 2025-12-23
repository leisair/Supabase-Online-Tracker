/**
 * 活跃度统计扩展
 * 提供用户在线时长、登录次数等统计功能
 */

export class ActivityStats {
    constructor(supabase, options = {}) {
        if (!supabase) {
            throw new Error('Supabase 客户端实例是必需的');
        }

        this.supabase = supabase;
        this.logsTable = options.logsTable || 'user_activity_logs';
        this.onlineTable = options.onlineTable || 'online_users';
        
        // 数据保留配置
        this.retentionDays = options.retentionDays || 30; // 默认保留30天
        this.autoCleanup = options.autoCleanup !== false; // 默认启用自动清理
        
        // 如果启用自动清理，设置定时器
        if (this.autoCleanup) {
            this._setupAutoCleanup();
        }
    }

    /**
     * 设置自动清理定时器
     * @private
     */
    _setupAutoCleanup() {
        // 每天检查一次（可配置）
        const cleanupInterval = 24 * 60 * 60 * 1000; // 24小时
        
        this._cleanupTimer = setInterval(async () => {
            try {
                await this.cleanupOldRecords(this.retentionDays);
            } catch (error) {
                console.error('自动清理失败:', error);
            }
        }, cleanupInterval);
        
        // 立即执行一次清理
        this.cleanupOldRecords(this.retentionDays).catch(err => {
            console.error('初始清理失败:', err);
        });
    }

    /**
     * 停止自动清理
     */
    stopAutoCleanup() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
    }

    /**
     * 记录用户登录
     * @param {string} username - 用户名
     * @param {Object} metadata - 额外信息（设备类型等）
     */
    async recordLogin(username, metadata = {}) {
        try {
            const { data, error } = await this.supabase
                .from(this.logsTable)
                .insert({
                    username,
                    login_time: new Date().toISOString(),
                    device_type: metadata.deviceType || 'unknown',
                    device_info: metadata.deviceInfo || null
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('记录登录失败:', error);
            throw error;
        }
    }

    /**
     * 记录用户登出
     * @param {string} username - 用户名
     */
    async recordLogout(username) {
        try {
            // 查找最近的未完成登录记录
            const { data: logs, error: queryError } = await this.supabase
                .from(this.logsTable)
                .select('*')
                .eq('username', username)
                .is('logout_time', null)
                .order('login_time', { ascending: false })
                .limit(1);

            if (queryError) throw queryError;
            if (!logs || logs.length === 0) return null;

            const log = logs[0];
            const logoutTime = new Date();
            const loginTime = new Date(log.login_time);
            const duration = Math.floor((logoutTime - loginTime) / 1000); // 秒

            // 更新登出时间和时长
            const { data, error } = await this.supabase
                .from(this.logsTable)
                .update({
                    logout_time: logoutTime.toISOString(),
                    duration
                })
                .eq('id', log.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('记录登出失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户统计数据
     * @param {string} username - 用户名
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 统计数据
     */
    async getUserStats(username, options = {}) {
        const period = options.period || 'today';
        const startDate = this._getStartDate(period);

        try {
            // 获取登录记录
            const { data: logs, error } = await this.supabase
                .from(this.logsTable)
                .select('*')
                .eq('username', username)
                .gte('login_time', startDate.toISOString())
                .order('login_time', { ascending: false });

            if (error) throw error;

            // 计算统计数据
            const stats = {
                username,
                period,
                loginCount: logs.length,
                totalOnlineTime: 0,
                averageSessionTime: 0,
                lastLogin: null,
                sessions: []
            };

            if (logs.length > 0) {
                stats.lastLogin = new Date(logs[0].login_time).getTime();

                // 计算总在线时长
                logs.forEach(log => {
                    if (log.duration) {
                        stats.totalOnlineTime += log.duration;
                        stats.sessions.push({
                            loginTime: new Date(log.login_time).getTime(),
                            logoutTime: log.logout_time ? new Date(log.logout_time).getTime() : null,
                            duration: log.duration,
                            deviceType: log.device_type
                        });
                    }
                });

                // 计算平均会话时长
                const completedSessions = logs.filter(log => log.duration);
                if (completedSessions.length > 0) {
                    stats.averageSessionTime = Math.floor(
                        stats.totalOnlineTime / completedSessions.length
                    );
                }
            }

            return stats;
        } catch (error) {
            console.error('获取用户统计失败:', error);
            throw error;
        }
    }

    /**
     * 获取活跃用户排行
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 排行榜
     */
    async getTopActiveUsers(options = {}) {
        const limit = options.limit || 10;
        const period = options.period || 'today';
        const startDate = this._getStartDate(period);

        try {
            const { data: logs, error } = await this.supabase
                .from(this.logsTable)
                .select('username, duration')
                .gte('login_time', startDate.toISOString())
                .not('duration', 'is', null);

            if (error) throw error;

            // 按用户聚合
            const userStats = {};
            logs.forEach(log => {
                if (!userStats[log.username]) {
                    userStats[log.username] = {
                        username: log.username,
                        totalTime: 0,
                        sessionCount: 0
                    };
                }
                userStats[log.username].totalTime += log.duration;
                userStats[log.username].sessionCount += 1;
            });

            // 转换为数组并排序
            const ranking = Object.values(userStats)
                .sort((a, b) => b.totalTime - a.totalTime)
                .slice(0, limit);

            return ranking;
        } catch (error) {
            console.error('获取活跃用户排行失败:', error);
            throw error;
        }
    }

    /**
     * 清理过期记录
     * @param {number} days - 保留天数（默认使用构造函数中的配置）
     */
    async cleanupOldRecords(days) {
        const retentionDays = days !== undefined ? days : this.retentionDays;
        
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const { data, error } = await this.supabase
                .from(this.logsTable)
                .delete()
                .lt('login_time', cutoffDate.toISOString())
                .select();

            if (error) throw error;

            const deletedCount = data ? data.length : 0;
            console.log(`已清理 ${retentionDays} 天前的记录，删除 ${deletedCount} 条`);
            
            return { deletedCount, cutoffDate };
        } catch (error) {
            console.error('清理记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getStorageStats() {
        try {
            // 获取总记录数
            const { count: totalRecords, error: countError } = await this.supabase
                .from(this.logsTable)
                .select('*', { count: 'exact', head: true });

            if (countError) throw countError;

            // 获取最早和最新的记录
            const { data: oldestRecord, error: oldestError } = await this.supabase
                .from(this.logsTable)
                .select('login_time')
                .order('login_time', { ascending: true })
                .limit(1)
                .single();

            const { data: newestRecord, error: newestError } = await this.supabase
                .from(this.logsTable)
                .select('login_time')
                .order('login_time', { ascending: false })
                .limit(1)
                .single();

            const now = new Date();
            const oldestDate = oldestRecord ? new Date(oldestRecord.login_time) : null;
            const newestDate = newestRecord ? new Date(newestRecord.login_time) : null;
            
            const dataSpanDays = oldestDate && newestDate 
                ? Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                totalRecords: totalRecords || 0,
                oldestRecord: oldestDate ? oldestDate.toISOString() : null,
                newestRecord: newestDate ? newestDate.toISOString() : null,
                dataSpanDays,
                retentionDays: this.retentionDays,
                autoCleanupEnabled: this.autoCleanup,
                estimatedSize: `~${Math.ceil((totalRecords || 0) * 0.2 / 1024)} KB` // 粗略估算
            };
        } catch (error) {
            console.error('获取存储统计失败:', error);
            throw error;
        }
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stopAutoCleanup();
    }

    /**
     * 获取时间段的起始日期
     * @private
     */
    _getStartDate(period) {
        const now = new Date();
        const startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setHours(0, 0, 0, 0);
        }

        return startDate;
    }
}
