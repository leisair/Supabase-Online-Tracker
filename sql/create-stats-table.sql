-- 创建用户活动日志表（用于统计功能）
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    duration INTEGER,  -- 在线时长（秒）
    device_type TEXT DEFAULT 'unknown',
    device_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON user_activity_logs(username);
CREATE INDEX IF NOT EXISTS idx_activity_logs_login_time ON user_activity_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username_login_time ON user_activity_logs(username, login_time);

-- 添加注释
COMMENT ON TABLE user_activity_logs IS '用户活动日志表（用于统计分析）';
COMMENT ON COLUMN user_activity_logs.username IS '用户名';
COMMENT ON COLUMN user_activity_logs.login_time IS '登录时间';
COMMENT ON COLUMN user_activity_logs.logout_time IS '登出时间';
COMMENT ON COLUMN user_activity_logs.duration IS '在线时长（秒）';
COMMENT ON COLUMN user_activity_logs.device_type IS '设备类型';
COMMENT ON COLUMN user_activity_logs.device_info IS '设备详细信息（JSON）';

-- 可选：创建自动清理函数（清理30天前的记录）
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM user_activity_logs
    WHERE login_time < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 可选：创建定时任务（每天凌晨2点执行清理）
-- 需要安装 pg_cron 扩展
-- SELECT cron.schedule('cleanup-activity-logs', '0 2 * * *', 'SELECT cleanup_old_activity_logs()');

-- 注意：
-- 1. 默认保留30天数据，可根据需求调整
-- 2. 如果使用 ActivityStats 的 autoCleanup 功能，不需要设置数据库定时任务
-- 3. 建议定期检查数据量，避免堆积