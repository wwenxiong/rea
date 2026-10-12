// 轻量 API 客户端，统一处理 Token 注入与 401 自动清除
const BASE_URL = '';

function getToken(): string | null {
  return localStorage.getItem('rc_auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rc_auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rc_auth_token');
  localStorage.removeItem('rc_auth_user');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('未登录或登录已过期');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data as T;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active: number;
}

export interface UserQuota {
  is_active: boolean;
  is_admin: boolean;
  is_unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  month: string;
}

export interface AdminUserItem {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_active: number;
  created_at: number;
  activated_at: number | null;
  courseware_count: number;
  monthly_imports?: number;
}

export interface LicenseItem {
  id: number;
  code: string;
  status: 'unused' | 'used';
  created_at: number;
  used_at: number | null;
  used_by_username: string | null;
}

// Auth API
export const authApi = {
  register(username: string, password: string) {
    return request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  login(username: string, password: string) {
    return request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    return request<{ user: User }>('/api/auth/me');
  },
  activate(code: string) {
    return request<{ ok: boolean; user: User; token: string }>('/api/auth/activate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  getQuota() {
    return request<UserQuota>('/api/auth/quota');
  },
  consumeImportQuota() {
    return request<{ ok: boolean; is_unlimited: boolean; used: number; remaining: number; month: string }>(
      '/api/auth/consume-import',
      { method: 'POST' }
    );
  },
};


// Sync API
export const syncApi = {
  pullCoursewares() {
    return request<{ coursewares: unknown[] }>('/api/sync/coursewares');
  },
  pushCoursewares(coursewares: unknown[]) {
    return request<{ ok: boolean }>('/api/sync/coursewares', {
      method: 'POST',
      body: JSON.stringify({ coursewares }),
    });
  },
  deleteCourseware(id: string) {
    return request<{ ok: boolean }>(`/api/sync/coursewares/${id}`, {
      method: 'DELETE',
    });
  },
  clearAllCoursewares() {
    return request<{ ok: boolean }>('/api/sync/coursewares', {
      method: 'DELETE',
    });
  },
};

// Admin API
export const adminApi = {
  getUsers() {
    return request<{ users: AdminUserItem[] }>('/api/admin/users');
  },
  toggleUserActive(userId: number) {
    return request<{ ok: boolean; is_active: number }>(`/api/admin/users/${userId}/toggle-active`, {
      method: 'POST',
    });
  },
  getLicenses() {
    return request<{ licenses: LicenseItem[] }>('/api/admin/licenses');
  },
  generateLicenses(count: number = 1) {
    return request<{ ok: boolean; count: number; codes: string[] }>('/api/admin/licenses/generate', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },
  deleteLicense(licenseId: number) {
    return request<{ ok: boolean }>(`/api/admin/licenses/${licenseId}`, {
      method: 'DELETE',
    });
  },
};
