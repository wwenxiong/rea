import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const { user, activate, isLoading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入授权码');
      return;
    }
    setError('');
    try {
      await activate(code.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCode('');
      }, 1200);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '激活失败，请检查授权码');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-7 text-slate-800 animate-scaleIn relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-base"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">激活系统使用权限</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {reason || `当前账号 @${user?.username || ''} 属于免费体验版（未激活用户每月可上传 5 篇试卷）。输入管理员发放的授权码可解锁永久无限使用权限！`}
          </p>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              系统授权码 (License Key)
            </label>
            <input
              type="text"
              placeholder="REA-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isLoading || success}
              autoFocus
              className="w-full uppercase font-mono tracking-wider bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-center font-bold"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              激活成功！已解锁无限使用权限。
            </div>
          )}

          <div className="pt-1 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>正在验证激活...</span>
                </>
              ) : (
                <span>立即激活</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              暂不激活，继续使用
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
