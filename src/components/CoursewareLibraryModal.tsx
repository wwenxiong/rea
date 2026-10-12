import React, { useState, useEffect, useRef } from 'react';
import type { Courseware } from '../types';
import {
  getSavedCoursewares,
  saveCoursewareToStorage,
  deleteCoursewareFromStorage,
  exportCoursewareToJSON,
  exportAllCoursewaresBackup,
} from '../utils/coursewareStorage';
import { useAuth } from '../context/AuthContext';

interface CoursewareLibraryModalProps {
  isOpen: boolean;
  currentCourseware: Courseware | null;
  onClose: () => void;
  onSelectCourseware: (courseware: Courseware) => void;
  onOpenImport: () => void;
}

export const CoursewareLibraryModal: React.FC<CoursewareLibraryModalProps> = ({
  isOpen,
  currentCourseware,
  onClose,
  onSelectCourseware,
  onOpenImport,
}) => {
  const [coursewares, setCoursewares] = useState<Courseware[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const { user, syncDeleteCourseware, syncCourseware } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const list = getSavedCoursewares(user?.id);
      setCoursewares(list);
    }
  }, [isOpen, user?.id]);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleSaveCurrent = () => {
    if (!currentCourseware) return;
    const updated = saveCoursewareToStorage(currentCourseware, user?.id);
    setCoursewares(updated);
    syncCourseware(currentCourseware);
    showToast(`《${currentCourseware.title}》已成功保存至课件库！`);
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (coursewares.length <= 1) {
      alert('课件库中至少需保留一篇试卷！');
      return;
    }
    if (window.confirm(`确定要从课件库中删除《${title}》吗？`)) {
      const updated = deleteCoursewareFromStorage(id, user?.id);
      setCoursewares(updated);
      showToast(`《${title}》已从课件库移除`);
      syncDeleteCourseware(id);
      // If deleted active courseware, switch to the first remaining one
      if (currentCourseware?.id === id && updated[0]) {
        onSelectCourseware(updated[0]);
      }
    }
  };


  const handleJSONFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          // Backup list
          parsed.forEach((item) => {
            if (item.title && Array.isArray(item.paragraphs)) {
              saveCoursewareToStorage(item, user?.id);
              syncCourseware(item);
            }
          });
          setCoursewares(getSavedCoursewares(user?.id));
          showToast(`已批量导入并恢复 ${parsed.length} 篇课件！`);
        } else if (parsed.title && Array.isArray(parsed.paragraphs)) {
          // Single courseware
          const updated = saveCoursewareToStorage(parsed, user?.id);
          setCoursewares(updated);
          syncCourseware(parsed);
          onSelectCourseware(parsed);
          showToast(`已成功导入《${parsed.title}》并切换！`);
        } else {
          alert('无效的课件 JSON 文件格式');
        }
      } catch (err) {
        console.error('Failed to parse json file', err);
        alert('解析 JSON 文件失败，请确认文件格式正确。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const filtered = coursewares.filter((cw) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cw.title.toLowerCase().includes(q) ||
      (cw.subtitle && cw.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">课件库</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                  共 {coursewares.length} 篇
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                管理已导入课件，支持多套试卷随时切换与本地备份
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="关闭窗口"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toast Alert */}
        {saveToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-800 animate-fadeIn">
            <span className="flex items-center gap-1.5 font-semibold">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saveToast}
            </span>
          </div>
        )}

        {/* Toolbar Bar: Search & Actions */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索试卷标题或副标题..."
              className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentCourseware && (
              <button
                onClick={handleSaveCurrent}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="将当前页面正在查看编辑的试卷保存至库中"
              >
                <span>保存当前课件</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>导入新试卷</span>
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="导入此前导出的课件 JSON 文件"
            >
              <span>导入备份</span>
            </button>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleJSONFileImport}
              className="hidden"
            />

            <button
              onClick={exportAllCoursewaresBackup}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="将整个课件库打包导出为 JSON 备份文件"
            >
              <span>导出全部</span>
            </button>
          </div>
        </div>

        {/* Courseware List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm font-medium">未找到匹配的试卷课件</p>
              <p className="text-xs text-slate-400 mt-1">您可以尝试更改搜索词，或点击上方“导入新试卷”生成新课件</p>
            </div>
          ) : (
            filtered.map((cw) => {
              const isCurrent = currentCourseware?.id === cw.id;
              const questionCount =
                (cw.summaryGroup ? cw.summaryGroup.items.length : 0) +
                (cw.questions ? cw.questions.length : 0);
              const paraCount = cw.paragraphs ? cw.paragraphs.length : 0;
              const updatedDate = cw.updatedAt
                ? new Date(cw.updatedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '默认预设';

              return (
                <div
                  key={cw.id}
                  onClick={() => {
                    onSelectCourseware(cw);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                    isCurrent
                      ? 'border-indigo-400/80 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {cw.title}
                      </h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          当前使用
                        </span>
                      )}
                    </div>

                    {cw.subtitle && (
                      <p className="text-xs text-slate-500 truncate">
                        {cw.subtitle}
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono flex-wrap">
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-700 font-sans">{paraCount}</strong> 个段落
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-700 font-sans">{questionCount}</strong> 道题目
                      </span>
                      {(cw.coursewareType === 'cloze' || cw.questions.some(q => q.type === 'cloze')) && (
                        <>
                          <span>•</span>
                          <span className="text-orange-700 bg-orange-50 border border-orange-200/80 px-1.5 py-0.2 rounded font-sans font-bold">
                            完形填空
                          </span>
                        </>
                      )}
                      {cw.summaryGroup && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-sans font-semibold">
                            含摘要填空 ({cw.summaryGroup.idRange})
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-slate-400">更新: {updatedDate}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourseware(cw);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      {isCurrent ? '使用中' : '立即切换'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCoursewareToJSON(cw);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                      title="导出此课件为单独 JSON"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(cw.id, cw.title, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                      title="从课件库中删除此试卷"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>课件数据安全存储于当前浏览器本地缓存 (Local Storage)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
