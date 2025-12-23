-- 创建在线用户表（必需）
CREATE TABLE IF NOT EXISTS online_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_online_users_username ON online_users(username);
CREATE INDEX IF NOT EXISTS idx_online_users_last_activity ON online_users(last_activity);

-- 添加注释
COMMENT ON TABLE online_users IS '在线用户状态表';
COMMENT ON COLUMN online_users.username IS '用户名（唯一）';
COMMENT ON COLUMN online_users.last_activity IS '最后活跃时间';
COMMENT ON COLUMN online_users.created_at IS '记录创建时间';

-- 如果需要首次登录检测功能，在你的用户表中添加字段
-- 注意：请将 'users' 替换为你实际的用户表名
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_logged_in BOOLEAN DEFAULT FALSE;

-- 为现有用户设置默认值
UPDATE users SET has_logged_in = FALSE WHERE has_logged_in IS NULL;

COMMENT ON COLUMN users.has_logged_in IS '用户是否曾经登录过（首次登录检测）';
