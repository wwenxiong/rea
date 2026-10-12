import React, { useState, useEffect } from 'react';
import { adminApi, type AdminUserItem, type LicenseItem } from '../utils/apiClient';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'users' | 'licenses';

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // 生成授权码输入
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const res = await adminApi.getUsers();
        setUsers(res.users);
      } else {
        const res = await adminApi.getLicenses();
        setLicenses(res.licenses);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // 切换用户激活状态
  const handleToggleUserActive = async (user: AdminUserItem) => {
    if (user.role === 'admin') return;
    try {
      const res = await adminApi.toggleUserActive(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: res.is_active } : u))
      );
      showToast(`已${res.is_active === 1 ? '激活' : '停用'}用户 @${user.username}`);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 生成授权码
  const handleGenerateLicenses = async () => {
    setIsGenerating(true);
    try {
      const res = await adminApi.generateLicenses(generateCount);
      setNewlyGenerated(res.codes);
      showToast(`成功生成 ${res.count} 个授权码`);
      const updated = await adminApi.getLicenses();
      setLicenses(updated.licenses);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制文本
  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    showToast('已复制到剪贴板');
  };

  // 作废/删除授权码
  const handleDeleteLicense = async (lic: LicenseItem) => {
    if (!window.confirm(`确定删除授权码 ${lic.code} 吗？`)) return;
    try {
      await adminApi.deleteLicense(lic.id);
      setLicenses((prev) => prev.filter((l) => l.id !== lic.id));
      showToast('授权码已移除');
    } catch (err: any) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">系统管理后台</h2>
            <p className="text-[11px] text-slate-500">用户权限审核与激活授权码分发中心</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer text-lg"
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>用户管理</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('licenses')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'licenses'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>授权码管理</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'licenses' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {licenses.length}
              </span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            <span>刷新</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="bg-slate-900 text-white text-xs px-4 py-2 font-medium text-center animate-fadeIn shadow-xs">
            {toast}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {isLoading && users.length === 0 && licenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">加载中...</div>
          ) : activeTab === 'users' ? (
            /* Tab 1: Users */
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">UID</th>
                    <th className="py-3 px-4">用户名</th>
                    <th className="py-3 px-4">角色</th>
                    <th className="py-3 px-4">课件总数</th>
                    <th className="py-3 px-4">本月上传</th>
                    <th className="py-3 px-4">注册时间</th>
                    <th className="py-3 px-4">授权状态</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isActive = isAdmin || u.is_active === 1;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">#{u.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {u.username}
                          {isAdmin && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">
                              管理员
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isAdmin ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {u.courseware_count} 篇
                        </td>
                        <td className="py-3 px-4">
                          {isAdmin || isActive ? (
                            <span className="text-emerald-700 font-medium text-[11px]">无限</span>
                          ) : (
                            <span className={`font-mono text-[11px] font-bold ${Number(u.monthly_imports || 0) >= 5 ? 'text-red-600' : 'text-amber-700'}`}>
                              {u.monthly_imports || 0} / 5 篇
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>已激活</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>未激活</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAdmin ? (
                            <span className="text-[11px] text-slate-400 italic">超级权限</span>
                          ) : (
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                u.is_active === 1
                                  ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.is_active === 1 ? '停用' : '一键激活'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Tab 2: Licenses */
            <div className="space-y-5">
              {/* Generator Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">批量生成授权码</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    生成的授权码可直接发放给注册用户，用户核销后自动激活使用权限。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <span className="text-[11px] px-2 text-slate-500 font-medium">数量:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 py-1 px-1 text-xs text-center font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerateLicenses}
                    disabled={isGenerating}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <span>立即生成</span>
                  </button>
                </div>
              </div>

              {/* Newly Generated Batch Quick Copy Banner */}
              {newlyGenerated.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      本次新生成 {newlyGenerated.length} 个授权码:
                    </span>
                    <button
                      onClick={() => copyText(newlyGenerated.join('\n'))}
                      className="text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-100 transition-colors"
                    >
                      全部复制
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-100 max-h-28 overflow-y-auto space-y-1">
                    {newlyGenerated.map((code, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{code}</span>
                        <button
                          onClick={() => copyText(code)}
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 px-1"
                        >
                          复制
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Licenses Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">授权码</th>
                      <th className="py-3 px-4">状态</th>
                      <th className="py-3 px-4">使用用户</th>
                      <th className="py-3 px-4">生成时间</th>
                      <th className="py-3 px-4">核销时间</th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {licenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          暂无授权码，请点击上方按钮生成
                        </td>
                      </tr>
                    ) : (
                      licenses.map((lic) => {
                        const isUsed = lic.status === 'used';

                        return (
                          <tr key={lic.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 flex items-center gap-2">
                              <span>{lic.code}</span>
                              <button
                                onClick={() => copyText(lic.code)}
                                className="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] font-sans border border-slate-200"
                                title="复制"
                              >
                                复制
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              {isUsed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  已使用
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  未使用
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {lic.used_by_username ? (
                                <span className="font-semibold text-slate-900">
                                  @{lic.used_by_username}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {formatDate(lic.created_at)}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {formatDate(lic.used_at)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!isUsed && (
                                <button
                                  onClick={() => handleDeleteLicense(lic)}
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                  作废
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
