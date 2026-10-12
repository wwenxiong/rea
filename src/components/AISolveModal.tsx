import React, { useState } from 'react';
import type { Courseware } from '../types';
import {
  solvePaperWithAI,
  countUnsolvedQuestions,
} from '../utils/aiSolveService';
import { loadSavedAIConfig } from '../utils/aiVisionService';
import type { AIServiceConfig } from '../utils/aiVisionService';

interface AISolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseware: Courseware | null;
  onSuccess: (updatedCourseware: Courseware) => void;
}

export const AISolveModal: React.FC<AISolveModalProps> = ({
  isOpen,
  onClose,
  courseware,
  onSuccess,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !courseware) return null;

  const aiConfig: AIServiceConfig = loadSavedAIConfig();
  const hasKey = Boolean(aiConfig.apiKey && aiConfig.apiKey.trim().length > 0);
  const { total, unsolved } = countUnsolvedQuestions(courseware);

  const handleStartSolve = async () => {
    if (!hasKey) {
      setErrorMessage('未配置 API Key，请点击下方【前往设置】填写接口密钥');
      return;
    }

    setIsRunning(true);
    setErrorMessage('');
    setIsSuccess(false);
    setProgressStatus('正在准备解析服务...');

    try {
      const updated = await solvePaperWithAI(
        courseware,
        aiConfig,
        (status) => setProgressStatus(status)
      );

      setIsSuccess(true);
      onSuccess(updated);
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    if (isRunning) return;
    setErrorMessage('');
    setIsSuccess(false);
    setProgressStatus('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">试卷答案与解析生成</h3>
              <p className="text-[11px] text-slate-400">自动匹配原文依据句，并生成试题参考答案与解析</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isRunning}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Paper Info Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm truncate max-w-[280px]">
                {courseware.title}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200/80 text-slate-700">
                共 {courseware.paragraphs.length} 个自然段
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-600 pt-1 border-t border-slate-200/60">
              <span>试题总数：<strong className="text-slate-900">{total}</strong> 题</span>
              <span>
                待生成答案与依据：
                <strong className={unsolved > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {unsolved}
                </strong> 题
              </span>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-indigo-950">当前模型：</span>
                <span className="font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {aiConfig.model || 'sensenova-6.8-flash-lite'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-500 truncate max-w-[320px]">
                端点：{aiConfig.baseUrl}
              </p>
            </div>
          </div>


          {/* Running State */}
          {isRunning && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">正在生成试卷答案与解析...</p>
                <p className="text-[11px] text-blue-600 mt-1 font-medium">{progressStatus}</p>
              </div>
              <p className="text-[10px] text-slate-400">
                正在匹配原文依据句与生成试题解析
              </p>
            </div>
          )}

          {/* Success State */}
          {isSuccess && !isRunning && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-emerald-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
                <span className="font-bold text-sm">答案与原文依据已生成完成</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                已为 {total} 道题目生成参考答案并关联原文依据。
              </p>
            </div>
          )}

          {/* Error State */}
          {errorMessage && !isRunning && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1.5 text-red-700">
              <div className="font-bold flex items-center gap-1.5">
                <span>✕</span>
                <span>生成中断</span>
              </div>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleClose}
            disabled={isRunning}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-40"
          >
            {isSuccess ? '关闭' : '取消'}
          </button>

          <div className="flex items-center gap-2">
            {isSuccess ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                完成
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSolve}
                disabled={isRunning || !hasKey}
                className="px-5 py-1.5 text-xs font-semibold text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <span>开始生成解析</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
