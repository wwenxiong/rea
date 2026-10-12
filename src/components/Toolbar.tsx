import React from 'react';
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '../constants/design';
import type { User } from '../utils/apiClient';

interface ToolbarProps {
  title: string;
  subtitle?: string;
  fontSize: number;
  areAnswersShown: boolean;
  libraryCount?: number;
  unsolvedCount?: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onSetFontSize: (size: number) => void;
  onToggleAllAnswers: () => void;
  onImport: () => void;
  onExport?: () => void;
  onExportPDF?: () => void;
  onOpenLibrary?: () => void;
  onSaveCurrent?: () => void;
  onAISolve?: () => void;
  onToggleFullscreen?: () => void;
  // Auth
  user?: User | null;
  isAdmin?: boolean;
  quota?: import('../utils/apiClient').UserQuota | null;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'offline';
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onOpenActivation?: () => void;
}



const SyncDot: React.FC<{ status: ToolbarProps['syncStatus'] }> = ({ status }) => {
  if (status === 'idle') return null;
  const map = {
    syncing: { cls: 'bg-blue-400 animate-pulse', title: '同步中…' },
    error:   { cls: 'bg-red-400', title: '同步失败，将在下次操作时重试' },
    offline: { cls: 'bg-slate-400', title: '离线，数据已保存到本地' },
  } as const;
  if (!status || !(status in map)) return null;
  const { cls, title } = map[status as keyof typeof map];
  return <span className={`w-2 h-2 rounded-full ${cls} shrink-0`} title={title} />;
};

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  subtitle,
  fontSize,
  areAnswersShown,
  libraryCount,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onSetFontSize,
  onToggleAllAnswers,
  onImport,
  onExport,
  onExportPDF,
  onOpenLibrary,
  user,
  isAdmin,
  quota,
  syncStatus,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenActivation,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="no-print bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 select-none shrink-0 z-10 shadow-xs">
      {/* Brand & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-tighter shadow-xs">
            SR
          </div>
          <span className="font-bold text-slate-800 text-sm hidden sm:inline tracking-tight">
            SmartRead
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Clickable Title to open Courseware Library */}
        <button
          onClick={onOpenLibrary}
          className="min-w-0 text-left px-2 py-1 -mx-2 rounded-lg hover:bg-slate-100 transition-colors group flex items-center gap-1.5"
          title="点击打开课件库"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                {title}
              </h1>
              <span className="text-[11px] text-slate-400 group-hover:text-slate-700 transition-colors">
                ▾
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 truncate -mt-0.5 font-normal">
                {subtitle}
              </p>
            )}
          </div>
        </button>
      </div>

      {/* Right Controls: Font Sizing + Tools */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Font Size Step */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
          <button
            onClick={onDecreaseFontSize}
            disabled={fontSize <= MIN_FONT_SIZE}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="缩小字号"
          >
            A-
          </button>

          {/* Quick preset selector */}
          <div className="flex items-center px-1 gap-1">
            {[16, 20, 24].map((size) => (
              <button
                key={size}
                onClick={() => onSetFontSize(size)}
                className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                  fontSize === size
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <button
            onClick={onIncreaseFontSize}
            disabled={fontSize >= MAX_FONT_SIZE}
            className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="放大字号"
          >
            A+
          </button>
        </div>

        {/* Unified Toggle Answers Button */}
        <div className="flex items-center border-l border-slate-200 pl-3">
          <button
            onClick={onToggleAllAnswers}
            title={areAnswersShown ? '隐藏答案' : '显示答案与依据'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs select-none ${
              areAnswersShown
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/90'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/90'
            }`}
          >
            {areAnswersShown ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
                <span>隐藏答案</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>全览答案</span>
              </>
            )}
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          {onOpenLibrary && (
            <button
              onClick={onOpenLibrary}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
              title="打开课件库"
            >
              <span>课件库</span>
              {libraryCount !== undefined && libraryCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-slate-700 shadow-2xs">
                  {libraryCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onImport}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            title="导入新试卷"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>导入试卷</span>
          </button>

          <button
            onClick={onExport || onExportPDF}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            title="导出独立 HTML 课件文件"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>导出</span>
          </button>

          {/* 用户账号 */}
          <div className="relative flex items-center gap-1.5 border-l border-slate-200 pl-3" ref={userMenuRef}>
            <SyncDot status={syncStatus} />
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
                  title="账号与额度"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                    {user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold max-w-[100px] truncate">{user.username}</span>
                  {!isAdmin && user.is_active !== 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                      {quota ? `${quota.remaining}/${quota.limit}` : '5/5'}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                      管理员
                    </span>
                  )}
                  <svg className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Panel */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-scaleIn">
                    {/* User Header */}
                    <div className="pb-2.5 mb-2.5 border-b border-slate-100 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">
                          {user.username}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isAdmin ? '系统超级管理员' : user.is_active === 1 ? '已激活正版用户' : '体验版账号'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAdmin
                          ? 'bg-purple-100 text-purple-800'
                          : user.is_active === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isAdmin ? '管理员' : user.is_active === 1 ? '永久有效' : '体验中'}
                      </span>
                    </div>

                    {/* Quota details card inside account menu */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">上传额度:</span>
                        <span className="font-bold text-slate-800">
                          {isAdmin || user.is_active === 1
                            ? '不限篇数'
                            : quota
                            ? `${quota.remaining} / ${quota.limit} 篇`
                            : '5 / 5 篇'}
                        </span>
                      </div>
                      {!isAdmin && user.is_active !== 1 && (
                        <div className="text-[10px] text-slate-400 leading-normal">
                          每月可免费导入 5 篇试卷（识别成功后计入 1 次）。
                        </div>
                      )}
                      {(isAdmin || user.is_active === 1) && (
                        <div className="text-[10px] text-emerald-700 leading-normal">
                          已享有完整试题解析与课件导入权限。
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-1">
                      {isAdmin && onOpenAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-purple-700 hover:bg-purple-50 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>打开管理后台</span>
                          <span className="text-[10px] text-purple-400">用户与授权码</span>
                        </button>
                      )}

                      {!isAdmin && user.is_active !== 1 && onOpenActivation && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenActivation();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>输入授权码激活</span>
                          <span className="text-[10px] text-indigo-500">升级无限制</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>退出当前账号</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                登录 / 注册
              </button>
            )}
          </div>


        </div>
      </div>
    </header>
  );
};
