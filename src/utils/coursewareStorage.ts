import type { Courseware } from '../types';
import { sampleCourseware, sampleClozeCourseware, sampleWordBankCourseware } from '../data/sampleCourseware';

const STORAGE_KEY = 'rc_saved_coursewares_v1';
const ACTIVE_ID_KEY = 'rc_active_courseware_id_v1';

export function getSavedCoursewares(): Courseware[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [sampleCourseware, sampleWordBankCourseware, sampleClozeCourseware];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let changed = false;
      if (!parsed.some((c: Courseware) => c.id === sampleWordBankCourseware.id)) {
        parsed.splice(1, 0, sampleWordBankCourseware);
        changed = true;
      }
      if (!parsed.some((c: Courseware) => c.id === sampleClozeCourseware.id)) {
        parsed.push(sampleClozeCourseware);
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    return [sampleCourseware, sampleWordBankCourseware, sampleClozeCourseware];
  } catch (e) {
    console.error('Failed to load coursewares from localStorage', e);
    return [sampleCourseware, sampleWordBankCourseware, sampleClozeCourseware];
  }
}

export function saveCoursewareToStorage(courseware: Courseware): Courseware[] {
  try {
    const list = getSavedCoursewares();
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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    localStorage.setItem(ACTIVE_ID_KEY, courseware.id);
    return updatedList;
  } catch (e) {
    console.error('Failed to save courseware to localStorage', e);
    return [courseware];
  }
}

export function deleteCoursewareFromStorage(id: string): Courseware[] {
  try {
    const list = getSavedCoursewares();
    const updatedList = list.filter((c) => c.id !== id);
    const final = updatedList.length > 0 ? updatedList : [sampleCourseware];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    return final;
  } catch (e) {
    console.error('Failed to delete courseware', e);
    return [sampleCourseware];
  }
}

export function getActiveCoursewareId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveCoursewareId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
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
  a.download = `${safeTitle}_精读课件.json`;
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
  a.download = `全部精读课件备份_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
