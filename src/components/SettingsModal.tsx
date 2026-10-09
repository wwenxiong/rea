import React, { useState } from 'react';
import {
  loadSavedAIConfig,
  saveAIConfig,
  fetchWithAutoProxy,
} from '../utils/aiVisionService';
import type { AIServiceConfig } from '../utils/aiVisionService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: AIServiceConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<AIServiceConfig>(loadSavedAIConfig);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAIConfig(config);
    onConfigSaved?.(config);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      setTestResult({ success: false, msg: '请先填写 API Key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetchWithAutoProxy(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.model.trim() || 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        let errorDetail = '';
        try {
          const errJson = await res.json();
          errorDetail = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorDetail = await res.text();
        }

        if (res.status === 429) {
          throw new Error(`429 频次限制: ${errorDetail || '账号并发或 TPM 达上限，请稍后再试'}`);
        } else if (res.status === 401) {
          throw new Error('401 认证失败: API Key 无效或已过期，请核对密钥');
        } else if (res.status === 404) {
          throw new Error(`404 路径不存在: 请核对 Base URL (${config.baseUrl}) 或模型名称是否正确`);
        }

        throw new Error(`HTTP ${res.status}: ${errorDetail.slice(0, 150)}`);
      }

      setTestResult({ success: true, msg: '接口连通成功，模型响应正常！' });
    } catch (e) {
      setTestResult({
        success: false,
        msg: `连接失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">系统设置</h3>
              <p className="text-[11px] text-slate-400">配置模型服务接口，支持试卷图文识别与解析生成</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">服务接口地址 (Base URL)</label>
              <span className="text-[10px] text-slate-400">支持各类兼容接口</span>
            </div>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400">常用预设:</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' })}
                className="text-[10px] text-slate-600 hover:text-slate-900 underline"
              >
                官方 OpenAI
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    baseUrl: 'https://token.sensenova.cn/v1',
                    model: 'sensenova-6.8-flash-lite',
                  })
                }
                className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
              >
                商汤日日新 (SenseNova)
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                    model: 'qwen-vl-max',
                  })
                }
                className="text-[10px] text-slate-600 hover:text-slate-900 underline"
              >
                阿里通义兼容端
              </button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">API 密钥 (API Key)</label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              密钥仅保存在当前浏览器本地，确保安全私密。
            </p>
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">模型名称 (Model)</label>
              <div className="flex items-center gap-1 flex-wrap">
                {['sensenova-6.8-flash-lite', 'gpt-4o', 'qwen-vl-max'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig({ ...config, model: m })}
                    className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
                      config.model === m
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="sensenova-6.8-flash-lite"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <p className="text-[11px] text-amber-600 mt-1">
              注意：图片识卷必须使用支持视觉的多模态模型（商汤账号请选 sensenova-6.8-flash-lite；DeepSeek 系列仅支持纯文本）。
            </p>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <span>{testResult.success ? '✓' : '✕'}</span>
              <span className="flex-1">{testResult.msg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {testing ? '正在测试...' : '测试连接'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
