import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { authApi, syncApi, setToken, clearToken, type User, type UserQuota } from '../utils/apiClient';
import type { Courseware } from '../types';

interface AuthContextValue {
  user: User | null;
  quota: UserQuota | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isActive: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string): Promise<void>;
  activate(code: string): Promise<void>;
  refreshQuota(): Promise<UserQuota | null>;
  consumeImport(): Promise<{ ok: boolean; remaining: number }>;
  logout(): void;
  // 保存课件时同步到云端
  syncCourseware(cw: Courseware): void;
  // 删除课件时同步删除
  syncDeleteCourseware(id: string): void;
  // 拉取云端全部课件
  pullCoursewares(): Promise<Courseware[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('rc_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<AuthContextValue['syncStatus']>('idle');

  const persistUser = (u: User) => {
    setUser(u);
    localStorage.setItem('rc_auth_user', JSON.stringify(u));
  };

  const refreshQuota = useCallback(async (): Promise<UserQuota | null> => {
    try {
      const q = await authApi.getQuota();
      setQuota(q);
      return q;
    } catch {
      return null;
    }
  }, []);

  // 监听 401 事件（Token 过期时 apiClient 会广播）
  useEffect(() => {
    const handle = () => {
      setUser(null);
      setQuota(null);
    };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  // 每次页面加载如果已有登录状态，从服务器刷新获取最新状态与配额
  useEffect(() => {
    const token = localStorage.getItem('rc_auth_token');
    if (!token) return;

    authApi.me()
      .then(({ user: freshUser }) => {
        persistUser(freshUser);
        refreshQuota();
      })
      .catch(() => {
        // Token 失效已由 apiClient 内部处理
      });
  }, [refreshQuota]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { token, user: u } = await authApi.login(username, password);
      setToken(token);
      persistUser(u);
      await refreshQuota();
    } finally {
      setIsLoading(false);
    }
  }, [refreshQuota]);

  const register = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { token, user: u } = await authApi.register(username, password);
      setToken(token);
      persistUser(u);
      await refreshQuota();
    } finally {
      setIsLoading(false);
    }
  }, [refreshQuota]);

  const activate = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const { token, user: u } = await authApi.activate(code);
      setToken(token);
      persistUser(u);
      await refreshQuota();
    } finally {
      setIsLoading(false);
    }
  }, [refreshQuota]);

  const consumeImport = useCallback(async (): Promise<{ ok: boolean; remaining: number }> => {
    const res = await authApi.consumeImportQuota();
    await refreshQuota();
    return { ok: res.ok, remaining: res.remaining };
  }, [refreshQuota]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('rc_saved_coursewares_v1');
      localStorage.removeItem('rc_active_courseware_id_v1');
      if (user?.id) {
        localStorage.removeItem(`rc_coursewares_u_${user.id}`);
        localStorage.removeItem(`rc_coursewares_u_${user.id}_active_id`);
      }
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    setQuota(null);
  }, [user?.id]);

  const syncCourseware = useCallback(
    (cw: Courseware) => {
      if (!user) return;
      setSyncStatus('syncing');
      syncApi
        .pushCoursewares([cw])
        .then(() => setSyncStatus('idle'))
        .catch(() => setSyncStatus('error'));
    },
    [user]
  );

  const syncDeleteCourseware = useCallback(
    (id: string) => {
      if (!user) return;
      syncApi.deleteCourseware(id).catch(console.warn);
    },
    [user]
  );

  const pullCoursewares = useCallback(async (): Promise<Courseware[]> => {
    if (!user) return [];
    setSyncStatus('syncing');
    try {
      const { coursewares } = await syncApi.pullCoursewares();
      setSyncStatus('idle');
      return coursewares as Courseware[];
    } catch {
      setSyncStatus('offline');
      return [];
    }
  }, [user]);

  const isAdmin = user?.role === 'admin';
  const isActive = Boolean(user && (user.role === 'admin' || user.is_active === 1));

  return (
    <AuthContext.Provider
      value={{
        user,
        quota,
        isLoggedIn: !!user,
        isAdmin,
        isActive,
        isLoading,
        syncStatus,
        login,
        register,
        activate,
        refreshQuota,
        consumeImport,
        logout,
        syncCourseware,
        syncDeleteCourseware,
        pullCoursewares,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
