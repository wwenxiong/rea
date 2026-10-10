import React from 'react';
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '../constants/design';

interface ToolbarProps {
  title: string;
  subtitle?: string;
  fontSize: number;
  areAnswersShown: boolean;
  libraryCount?: number;
  unsolvedCount?: number;
  coursewareType?: 'reading' | 'cloze';
  onToggleCoursewareType?: (newType: 'reading' | 'cloze') => void;
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
  onOpenSettings?: () => void;
  onToggleFullscreen?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  subtitle,
  fontSize,
  areAnswersShown,
  libraryCount,
  coursewareType,
  onToggleCoursewareType,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onSetFontSize,
  onToggleAllAnswers,
  onImport,
  onExport,
  onExportPDF,
  onOpenLibrary,
  onOpenSettings,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 select-none shrink-0 z-10 shadow-xs">
      {/* Brand & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
            RC
          </div>
          <span className="font-bold text-slate-800 text-sm hidden sm:inline tracking-tight">
            精读课件
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

        {/* Paper Type Manual Switcher */}
        {onToggleCoursewareType && (
          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200 text-xs shrink-0 ml-1">
            <button
              type="button"
              onClick={() => onToggleCoursewareType('reading')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                (coursewareType || 'reading') === 'reading'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="手动指定为：阅读理解题型"
            >
              <span>📖 阅读理解</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleCoursewareType('cloze')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                coursewareType === 'cloze'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="手动指定为：完形填空题型"
            >
              <span>✏️ 完形填空</span>
            </button>
          </div>
        )}
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
              <span>📚 课件库</span>
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

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="设置"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
