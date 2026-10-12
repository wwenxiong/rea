import type { Courseware } from '../types';

// 用户隔离 Storage Key
function getStorageKey(userId?: number | string | null): string {
  if (!userId) {
    try {
      const raw = localStorage.getItem('rc_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id) return `rc_coursewares_u_${u.id}`;
      }
    } catch {
      // ignore
    }
    return 'rc_coursewares_guest';
  }
  return `rc_coursewares_u_${userId}`;
}

function getActiveIdKey(userId?: number | string | null): string {
  return `${getStorageKey(userId)}_active_id`;
}

// 清除旧版本全局共享的脏缓存（避免跨账号串数据）
export function cleanLegacyGlobalStorage(): void {
  try {
    localStorage.removeItem('rc_saved_coursewares_v1');
    localStorage.removeItem('rc_active_courseware_id_v1');
  } catch {
    // ignore
  }
}

// 供账号注销/切换时清空某个用户或所有临时数据
export function clearUserCoursewares(userId?: number | string | null): void {
  try {
    localStorage.removeItem(getStorageKey(userId));
    localStorage.removeItem(getActiveIdKey(userId));
  } catch {
    // ignore
  }
}

export function getSavedCoursewares(userId?: number | string | null): Courseware[] {
  cleanLegacyGlobalStorage();
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load coursewares from user storage', e);
    return [];
  }
}

export function saveCoursewareToStorage(courseware: Courseware, userId?: number | string | null): Courseware[] {
  try {
    const list = getSavedCoursewares(userId);
    const existingIndex = list.findIndex((c) => c.id === courseware.id);
    let updatedList: Courseware[];
    const updatedItem = {
      ...courseware,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = updatedItem;
    } else {
      updatedList = [updatedItem, ...list];
    }

    localStorage.setItem(getStorageKey(userId), JSON.stringify(updatedList));
    localStorage.setItem(getActiveIdKey(userId), courseware.id);
    return updatedList;
  } catch (e) {
    console.error('Failed to save courseware to user storage', e);
    return [courseware];
  }
}

export function setAllCoursewaresToStorage(coursewares: Courseware[], userId?: number | string | null): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(coursewares));
  } catch (e) {
    console.error('Failed to set all coursewares to storage', e);
  }
}

export function deleteCoursewareFromStorage(id: string, userId?: number | string | null): Courseware[] {
  try {
    const list = getSavedCoursewares(userId);
    const updatedList = list.filter((c) => c.id !== id);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.error('Failed to delete courseware', e);
    return [];
  }
}

export function getActiveCoursewareId(userId?: number | string | null): string | null {
  try {
    return localStorage.getItem(getActiveIdKey(userId));
  } catch {
    return null;
  }
}

export function setActiveCoursewareId(id: string, userId?: number | string | null): void {
  try {
    localStorage.setItem(getActiveIdKey(userId), id);
  } catch (e) {
    console.error('Failed to set active courseware id', e);
  }
}

export function exportCoursewareToJSON(courseware: Courseware): void {
  const jsonStr = JSON.stringify(courseware, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (courseware.title || 'courseware').replace(/[^\w\u4e00-\u9fa5-_]/g, '_');
  a.download = `${safeTitle}_课件.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllCoursewaresBackup(): void {
  const list = getSavedCoursewares();
  const jsonStr = JSON.stringify(list, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `全部课件备份_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
