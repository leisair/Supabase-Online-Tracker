import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OnlineStatusManager } from './index.js';

// Mock Supabase 客户端
const createMockSupabase = () => {
  const mockData = new Map();
  
  return {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
    from: (table) => ({
      select: vi.fn().mockReturnValue({
        data: Array.from(mockData.values()).filter(item => item._table === table),
        error: null,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }),
      upsert: vi.fn().mockImplementation((data) => {
        const key = data.username;
        mockData.set(key, { ...data, _table: table });
        return { data, error: null };
      }),
      delete: vi.fn().mockImplementation(() => {
        const deleteQuery = {
          eq: vi.fn().mockImplementation((field, value) => {
            mockData.delete(value);
            return { data: null, error: null };
          }),
          in: vi.fn().mockImplementation((field, values) => {
            values.forEach(v => mockData.delete(v));
            return { data: null, error: null };
          })
        };
        return deleteQuery;
      }),
      update: vi.fn().mockImplementation((data) => ({
        eq: vi.fn().mockImplementation((field, value) => {
          const existing = mockData.get(value);
          if (existing) {
            mockData.set(value, { ...existing, ...data });
          }
          return { data, error: null };
        }),
        single: vi.fn().mockReturnValue({ data, error: null })
      }))
    }),
    _mockData: mockData,
    _clearMockData: () => mockData.clear()
  };
};

describe('OnlineStatusManager', () => {
  let supabase;
  let manager;

  beforeEach(() => {
    supabase = createMockSupabase();
    manager = new OnlineStatusManager(supabase);
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    supabase._clearMockData();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('构造函数', () => {
    it('应该抛出错误如果没有提供 Supabase 客户端', () => {
      expect(() => new OnlineStatusManager()).toThrow('Supabase 客户端实例是必需的');
    });

    it('应该使用默认配置', () => {
      expect(manager.tableName).toBe('online_users');
      expect(manager.heartbeatInterval).toBe(30000);
      expect(manager.inactiveTimeout).toBe(300000);
      expect(manager.enableFirstLoginTracking).toBe(false);
    });

    it('应该接受自定义配置', () => {
      const customManager = new OnlineStatusManager(supabase, {
        tableName: 'custom_table',
        heartbeatInterval: 60000,
        inactiveTimeout: 600000,
        enableFirstLoginTracking: true,
        userTable: 'custom_users'
      });

      expect(customManager.tableName).toBe('custom_table');
      expect(customManager.heartbeatInterval).toBe(60000);
      expect(customManager.inactiveTimeout).toBe(600000);
      expect(customManager.enableFirstLoginTracking).toBe(true);
      expect(customManager.userTable).toBe('custom_users');

      customManager.destroy();
    });
  });

  describe('userLogin', () => {
    it('应该抛出错误如果用户名为空', async () => {
      await expect(manager.userLogin('')).rejects.toThrow('用户名不能为空');
      await expect(manager.userLogin(null)).rejects.toThrow('用户名不能为空');
    });

    it('应该成功登录并设置当前用户名', async () => {
      const result = await manager.userLogin('testuser');
      
      expect(manager.currentUsername).toBe('testuser');
      expect(result).toHaveProperty('isFirstLogin');
      expect(result.isFirstLogin).toBe(false);
    });

    it('应该启动心跳定时器', async () => {
      await manager.userLogin('testuser');
      
      expect(manager.heartbeatTimer).not.toBeNull();
    });

    it('应该立即更新一次在线状态', async () => {
      const updateSpy = vi.spyOn(manager, 'updateStatus');
      
      await manager.userLogin('testuser');
      
      expect(updateSpy).toHaveBeenCalledWith('testuser');
    });
  });

  describe('userLogout', () => {
    it('应该移除在线状态', async () => {
      await manager.userLogin('testuser');
      const removeSpy = vi.spyOn(manager, 'removeStatus');
      
      await manager.userLogout();
      
      expect(removeSpy).toHaveBeenCalledWith('testuser');
    });

    it('应该停止心跳定时器', async () => {
      await manager.userLogin('testuser');
      await manager.userLogout();
      
      expect(manager.heartbeatTimer).toBeNull();
    });

    it('应该清除当前用户名', async () => {
      await manager.userLogin('testuser');
      await manager.userLogout();
      
      expect(manager.currentUsername).toBeNull();
    });

    it('应该安全处理未登录状态', async () => {
      await expect(manager.userLogout()).resolves.not.toThrow();
    });
  });

  describe('updateStatus', () => {
    it('应该更新用户在线状态', async () => {
      const fromSpy = vi.spyOn(supabase, 'from');
      
      await manager.updateStatus('testuser');
      
      expect(fromSpy).toHaveBeenCalledWith('online_users');
    });

    it('应该使用 upsert 操作', async () => {
      await manager.updateStatus('testuser');
      
      const data = supabase._mockData.get('testuser');
      expect(data).toBeDefined();
      expect(data.username).toBe('testuser');
      expect(data.last_activity).toBeDefined();
    });
  });

  describe('removeStatus', () => {
    it('应该删除用户在线状态', async () => {
      await manager.updateStatus('testuser');
      expect(supabase._mockData.has('testuser')).toBe(true);
      
      await manager.removeStatus('testuser');
      expect(supabase._mockData.has('testuser')).toBe(false);
    });
  });

  describe('getOnlineUsers', () => {
    it('应该返回空数组如果没有在线用户', async () => {
      const users = await manager.getOnlineUsers();
      
      expect(users).toEqual([]);
    });

    it('应该返回活跃用户列表', async () => {
      // 添加活跃用户
      await manager.updateStatus('user1');
      await manager.updateStatus('user2');
      
      // 重新创建 mock 以返回正确的数据
      const mockUsers = [
        { username: 'user1', last_activity: new Date().toISOString(), _table: 'online_users' },
        { username: 'user2', last_activity: new Date().toISOString(), _table: 'online_users' }
      ];
      
      const mockQuery = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        data: mockUsers,
        error: null
      };
      
      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
        delete: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({ data: null, error: null })
        })
      });
      
      const users = await manager.getOnlineUsers();
      
      expect(users.length).toBe(2);
      expect(users[0]).toHaveProperty('username');
      expect(users[0]).toHaveProperty('lastActivity');
    });

    it('应该自动清理过期用户', async () => {
      const now = new Date();
      const expiredTime = new Date(now.getTime() - 400000); // 6分钟前
      const activeTime = new Date(now.getTime() - 60000); // 1分钟前
      
      const mockUsers = [
        { username: 'expired_user', last_activity: expiredTime.toISOString(), _table: 'online_users' },
        { username: 'active_user', last_activity: activeTime.toISOString(), _table: 'online_users' }
      ];
      
      const deleteSpy = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({ data: null, error: null })
      });
      
      const mockQuery = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        data: mockUsers,
        error: null
      };
      
      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
        delete: deleteSpy
      });
      
      const users = await manager.getOnlineUsers();
      
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('active_user');
      expect(deleteSpy).toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          data: null,
          error: new Error('Database error')
        })
      });
      
      const users = await manager.getOnlineUsers();
      
      expect(users).toEqual([]);
    });
  });

  describe('心跳机制', () => {
    it('应该定期更新在线状态', async () => {
      const updateSpy = vi.spyOn(manager, 'updateStatus');
      
      await manager.userLogin('testuser');
      updateSpy.mockClear(); // 清除登录时的调用
      
      // 快进 30 秒
      vi.advanceTimersByTime(30000);
      
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith('testuser');
      
      // 再快进 30 秒
      vi.advanceTimersByTime(30000);
      
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    it('应该在停止心跳后不再更新', async () => {
      const updateSpy = vi.spyOn(manager, 'updateStatus');
      
      await manager.userLogin('testuser');
      updateSpy.mockClear();
      
      manager.stopHeartbeat();
      
      vi.advanceTimersByTime(30000);
      
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('应该清理所有资源', async () => {
      await manager.userLogin('testuser');
      
      manager.destroy();
      
      expect(manager.heartbeatTimer).toBeNull();
    });
  });
});
