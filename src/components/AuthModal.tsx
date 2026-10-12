import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  forceMode?: boolean;
}

type Tab = 'login' | 'register';

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, forceMode = false }) => {
  const { login, register, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setUsername('');
    setPassword('');
    setConfirmPwd('');
    setError('');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (tab === 'login') {
        await login(username.trim(), password);
        onClose?.();
      } else {
        if (password !== confirmPwd) {
          setError('两次密码不一致');
          return;
        }
        await register(username.trim(), password);
        onClose?.();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const formCard = (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 sm:p-7 text-slate-100 animate-scaleIn">
      {/* Brand logo & title when in force mode */}
      {forceMode && (
        <div className="text-center mb-6 space-y-1.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base tracking-tighter mx-auto shadow-md">
            RC
          </div>
          <h1 className="text-base font-bold text-white tracking-tight">雅思阅读精读课件系统</h1>
          <p className="text-[11px] text-slate-400">请先登录或注册账号以使用系统所有功能</p>
        </div>
      )}

      {/* Tab */}
      <div className="flex mb-5 bg-slate-800 rounded-xl p-1 gap-1">
        {(['login', 'register'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              tab === t
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'login' ? '账号登录' : '新用户注册'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">用户名</label>
          <input
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">密码</label>
          <input
            type="password"
            placeholder="至少 6 位字符"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {tab === 'register' && (
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">确认密码</label>
            <input
              type="password"
              placeholder="再次输入密码"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/40 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
        >
          {isLoading ? '处理中...' : tab === 'login' ? '立即登录' : '立即注册'}
        </button>
      </form>
    </div>
  );

  if (forceMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4">
        {formCard}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {formCard}
    </div>
  );
};
