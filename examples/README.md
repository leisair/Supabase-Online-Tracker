# 示例

本目录包含多种使用场景的示例代码。

## 📁 文件列表

### 1. basic-usage.html
基础使用示例，展示核心功能：
- 用户登录/登出
- 查看在线用户列表
- 自动刷新在线状态

**适合：** 快速了解基本用法

### 2. admin-dashboard.html
完整的管理后台示例：
- 实时统计卡片（在线人数、总用户数、在线率）
- 在线用户列表表格
- 自动刷新功能
- 美观的 UI 设计

**适合：** 实际项目参考

### 3. react-example.jsx
React 集成示例：
- 自定义 Hooks (`useOnlineStatus`, `useOnlineUsers`)
- 完整的组件示例
- 管理后台实现

**适合：** React 项目集成

### 4. vue-example.vue
Vue 3 集成示例：
- Composables (`useOnlineStatus`, `useOnlineUsers`)
- 完整的组件示例
- 管理后台实现

**适合：** Vue 项目集成

## 🚀 使用方法

### 前置准备

1. **创建 Supabase 项目**
   - 访问 [supabase.com](https://supabase.com) 创建项目

2. **执行数据库脚本**
   - 在 Supabase SQL Editor 中执行 `../sql/create-table.sql`

3. **获取 API 凭证**
   - 进入 Project Settings > API
   - 复制 `Project URL` 和 `anon public` key

### HTML 示例

1. 修改 Supabase 配置：
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // 替换为你的项目 URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // 替换为你的 anon key
```

2. 使用 HTTP 服务器运行（避免 CORS 问题）：
```bash
# 方式一：使用 npx
npx serve .

# 方式二：使用 Python
python -m http.server 8000
```

3. 访问 http://localhost:8000/basic-usage.html

### React 示例

1. 安装依赖：
```bash
npm install react @supabase/supabase-js supabase-online-tracker
```

2. 复制代码到你的项目

3. 修改 Supabase 配置

### Vue 示例

1. 安装依赖：
```bash
npm install vue @supabase/supabase-js supabase-online-tracker
```

2. 复制代码到你的项目

3. 修改 Supabase 配置

## 🧪 测试跨设备功能

1. 在设备 A 打开示例页面，用户 A 登录
2. 在设备 B 打开示例页面，点击"刷新列表"
3. 应该能看到用户 A 在线
4. 在设备 A 登出，设备 B 刷新后应该看不到用户 A

## 💡 提示

- 所有示例都需要先创建数据库表（参考 `sql/create-table.sql`）
- 确保 Supabase 项目的 RLS 策略正确配置
- 建议先在本地测试，确认功能正常后再部署

## 📚 更多资源

- [API 文档](../README.md#api-参考)
- [常见问题](../docs/FAQ.md)
- [故障排查](../docs/TROUBLESHOOTING.md)
- [性能优化](../docs/PERFORMANCE.md)
