import React, { useState, useEffect, useRef } from 'react';
import type { ArticleAnnotation, AIWordAnalysis, AITranslation } from '../types';
import { explainWordWithAI, translateTextWithAI } from '../utils/aiLexiconService';

export const DEFAULT_HIGHLIGHT_COLOR = '#FEF08A';
export const HIGHLIGHT_COLORS = [
  { name: '经典暖黄', hex: '#FEF08A', border: '#FACC15', text: '#854D0E', dot: '#EAB308' },
];

interface ArticleAnnotationModalProps {
  isOpen: boolean;
  targetText: string;
  contextSentence: string;
  paragraphText: string;
  passageTitle: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  existingAnnotation?: ArticleAnnotation | null;
  initialMode?: 'note' | 'ai' | 'translate';
  anchorRect?: { top: number; right: number; bottom: number; left: number; width?: number; height?: number } | null;
  onSave: (data: {
    text: string;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    color: string;
    note: string;
    aiAnalysis?: AIWordAnalysis;
    aiTranslation?: AITranslation;
  }, id?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const ArticleAnnotationModal: React.FC<ArticleAnnotationModalProps> = ({
  isOpen,
  targetText,
  contextSentence,
  paragraphText,
  passageTitle,
  paragraphIndex,
  startOffset,
  endOffset,
  existingAnnotation,
  initialMode = 'note',
  anchorRect,
  onSave,
  onDelete,
  onClose,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    existingAnnotation?.color || HIGHLIGHT_COLORS[0].hex
  );
  const [noteText, setNoteText] = useState<string>(existingAnnotation?.note || '');
  const [aiAnalysis, setAiAnalysis] = useState<AIWordAnalysis | undefined>(
    existingAnnotation?.aiAnalysis
  );
  const [aiTranslation, setAiTranslation] = useState<AITranslation | undefined>(
    existingAnnotation?.aiTranslation
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'note' | 'ai' | 'translate'>(initialMode);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const dialogWidth = 400;
      const dialogHeight = 460;
      if (anchorRect) {
        // Upper-right of the selected word/range:
        let posX = anchorRect.right + 10;
        let posY = anchorRect.top - 20;

        if (posX + dialogWidth > window.innerWidth - 16) {
          posX = Math.max(16, window.innerWidth - dialogWidth - 16);
        }
        if (posY + dialogHeight > window.innerHeight - 16) {
          posY = Math.max(16, window.innerHeight - dialogHeight - 16);
        }
        if (posY < 16) posY = 16;
        if (posX < 16) posX = 16;

        setPosition({ x: posX, y: posY });
      } else {
        setPosition({
          x: Math.max(16, window.innerWidth - dialogWidth - 24),
          y: 70,
        });
      }
    }
  }, [isOpen, anchorRect, targetText]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 150, dragStartRef.current.startX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 80, dragStartRef.current.startY + dy)),
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(existingAnnotation?.color || HIGHLIGHT_COLORS[0].hex);
      setNoteText(existingAnnotation?.note || '');
      setAiAnalysis(existingAnnotation?.aiAnalysis);
      setAiTranslation(existingAnnotation?.aiTranslation);
      setAiError('');
      setTranslateError('');
      setActiveTab(initialMode);

      // Auto trigger AI if opened with 'ai' and no analysis yet
      if (initialMode === 'ai' && !existingAnnotation?.aiAnalysis) {
        handleRunAI();
      } else if (initialMode === 'translate' && !existingAnnotation?.aiTranslation) {
        handleRunTranslation();
      }
    }
  }, [isOpen, existingAnnotation, initialMode]);

  if (!isOpen) return null;

  const handleRunAI = async () => {
    setIsAiLoading(true);
    setAiError('');
    try {
      const res = await explainWordWithAI(
        targetText,
        contextSentence,
        paragraphText,
        passageTitle
      );
      setAiAnalysis(res);
      setActiveTab('ai');
    } catch (err: any) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRunTranslation = async () => {
    setIsTranslating(true);
    setTranslateError('');
    try {
      const res = await translateTextWithAI(
        targetText,
        contextSentence,
        paragraphText,
        passageTitle
      );
      setAiTranslation(res);
      setActiveTab('translate');
    } catch (err: any) {
      setTranslateError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleInsertAIToNote = () => {
    if (!aiAnalysis) return;
    const aiSummary = `【语境义】[${aiAnalysis.contextualMeaning.pos}] ${aiAnalysis.contextualMeaning.definition}\n${aiAnalysis.contextualMeaning.explanation}\n\n【全部词义】\n${aiAnalysis.allMeanings.map(m => `• [${m.pos}] ${m.definition}${m.example ? ` (${m.example})` : ''}`).join('\n')}`;

    if (noteText.trim()) {
      setNoteText(prev => `${prev}\n\n${aiSummary}`);
    } else {
      setNoteText(aiSummary);
    }
    setActiveTab('note');
  };

  const handleInsertTranslationToNote = () => {
    if (!aiTranslation) return;
    const parts: string[] = [];
    parts.push(`【AI 语境译文】\n${aiTranslation.translation}`);
    if (aiTranslation.literalTranslation) {
      parts.push(`【直译对照】\n${aiTranslation.literalTranslation}`);
    }
    if (aiTranslation.syntaxBreakdown) {
      parts.push(`【句法解析】\n${aiTranslation.syntaxBreakdown}`);
    }
    if (aiTranslation.keyVocabulary && aiTranslation.keyVocabulary.length > 0) {
      parts.push(`【重点词汇】\n${aiTranslation.keyVocabulary.map(v => `• ${v.word}: ${v.meaning}`).join('\n')}`);
    }

    const transSummary = parts.join('\n\n');
    if (noteText.trim()) {
      setNoteText(prev => `${prev}\n\n${transSummary}`);
    } else {
      setNoteText(transSummary);
    }
    setActiveTab('note');
  };

  const handleSave = () => {
    onSave(
      {
        text: targetText,
        paragraphIndex,
        startOffset,
        endOffset,
        color: selectedColor,
        note: noteText.trim(),
        aiAnalysis,
        aiTranslation,
      },
      existingAnnotation?.id
    );
    onClose();
  };

  return (
    <div
      className="annotation-modal-container fixed z-50 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        maxWidth: 'calc(100vw - 20px)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[480px] overflow-hidden animate-scaleIn">
        {/* Header (Draggable) */}
        <div
          onMouseDown={handleHeaderMouseDown}
          className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-indigo-50/40 cursor-move select-none"
          title="按住标题栏可拖拽移动"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs shadow-2xs font-bold shrink-0">
              📝
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-extrabold text-slate-800">
                  划词精读标记
                </h3>
                <span className="text-[10px] text-slate-400 font-normal">
                  (按住可拖拽)
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 font-mono font-bold truncate max-w-[210px]">
                "{targetText}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors text-base shrink-0 cursor-pointer"
            title="关闭"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 pt-1 border-b border-slate-100 bg-slate-50/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`px-2.5 py-1.5 rounded-t-lg transition-all border-b-2 flex items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'note'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🖍️ 笔记</span>
            {noteText.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-2.5 py-1.5 rounded-t-lg transition-all border-b-2 flex items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'ai'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🤖 AI 释义</span>
            {aiAnalysis && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('translate')}
            className={`px-2.5 py-1.5 rounded-t-lg transition-all border-b-2 flex items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'translate'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🌐 AI 翻译</span>
            {aiTranslation && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2.5 text-xs font-sans custom-scrollbar">
          {/* Target Word in Sentence Quote */}
          {contextSentence && (
            <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-600 italic leading-snug text-[11px]">
              <span className="font-bold text-slate-800 not-italic mr-1">例句:</span>
              "{contextSentence}"
            </div>
          )}

          {activeTab === 'note' ? (
            /* Tab 1: Note & Color */
            <div className="space-y-2.5">
              {/* Highlight Color Info */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700">高亮颜色:</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                  style={{
                    backgroundColor: '#FEF08A',
                    borderColor: '#FACC15',
                    color: '#854D0E',
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>经典暖黄</span>
                </span>
              </div>

              {/* Note Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    我的学习笔记 (可自由填写考点、释义等):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {aiTranslation && (
                      <button
                        type="button"
                        onClick={handleInsertTranslationToNote}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>📋 填入翻译</span>
                      </button>
                    )}
                    {aiAnalysis && (
                      <button
                        type="button"
                        onClick={handleInsertAIToNote}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>📋 填入释义</span>
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="在此输入关于该词/句的学习笔记..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-2xs font-sans resize-y"
                />
              </div>

              {/* AI Quick Trigger Banners */}
              {(!aiAnalysis || !aiTranslation) && (
                <div className="space-y-1.5 pt-0.5">
                  {!aiAnalysis && !isAiLoading && (
                    <div className="px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-lg flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900">🤖 需要语境词义解析？</span>
                      <button
                        type="button"
                        onClick={handleRunAI}
                        className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>开始解析</span>
                      </button>
                    </div>
                  )}
                  {!aiTranslation && !isTranslating && (
                    <div className="px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-100 rounded-lg flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900">🌐 需要语境翻译剖析？</span>
                      <button
                        type="button"
                        onClick={handleRunTranslation}
                        className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>开始翻译</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'translate' ? (
            /* Tab 3: AI Translation */
            <div className="space-y-4">
              {isTranslating ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-bold text-slate-800 text-xs">
                    AI 正在结合课文语境精准翻译与分析句法结构...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    正在生成：地道语境意译 · 直译对照 · 长难句句法剖析 · 核心词汇
                  </p>
                </div>
              ) : translateError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ 翻译失败</span>
                  </div>
                  <p className="text-[11px]">{translateError}</p>
                  <button
                    type="button"
                    onClick={handleRunTranslation}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
                  >
                    重新尝试
                  </button>
                </div>
              ) : aiTranslation ? (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Header: Target text + Re-translate */}
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900 line-clamp-1">
                        "{aiTranslation.text}"
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunTranslation}
                      className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                    >
                      🔄 重新翻译
                    </button>
                  </div>

                  {/* 1. Contextual Translation Card */}
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>📖 语境精准译文 (Contextual Translation)</span>
                    </div>
                    <div className="text-emerald-950 font-bold text-sm leading-relaxed pt-0.5">
                      {aiTranslation.translation}
                    </div>
                    {aiTranslation.literalTranslation && (
                      <div className="pt-2 border-t border-emerald-200/60 mt-1">
                        <span className="text-[11px] font-semibold text-emerald-800 block mb-0.5">
                          【直译对照】：
                        </span>
                        <p className="text-emerald-900/90 leading-relaxed text-[11px]">
                          {aiTranslation.literalTranslation}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. Syntax Breakdown Card */}
                  {aiTranslation.syntaxBreakdown && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>🧩 长难句与句法拆解 (Syntax Breakdown)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs pt-0.5 whitespace-pre-line">
                        {aiTranslation.syntaxBreakdown}
                      </p>
                    </div>
                  )}

                  {/* 3. Key Vocabulary Badges */}
                  {aiTranslation.keyVocabulary && aiTranslation.keyVocabulary.length > 0 && (
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1.5">
                      <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>💡 核心词汇与短语 (Key Vocabulary)</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {aiTranslation.keyVocabulary.map((item, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1 bg-white border border-purple-200 text-purple-950 rounded-lg text-[11px] shadow-2xs flex items-baseline gap-1.5"
                          >
                            <span className="font-bold text-purple-800">{item.word}</span>
                            <span className="text-slate-600">{item.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action: Copy Translation to Note */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleInsertTranslationToNote}
                      className="w-full py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📝 一键将翻译存入笔记 (并转到笔记编辑)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <p className="text-slate-600 text-xs">
                    尚未为此选段生成 AI 语境翻译。
                  </p>
                  <button
                    type="button"
                    onClick={handleRunTranslation}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🌐 立即开始 AI 语境翻译</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: AI Lexicon Analysis */
            <div className="space-y-4">
              {isAiLoading ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-bold text-slate-800 text-xs">
                    AI 正在结合课文原句深度剖析该词...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    正在分析：本文语境词性与释义 · 字典全词性义项 · 核心搭配与考点
                  </p>
                </div>
              ) : aiError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ 解析失败</span>
                  </div>
                  <p className="text-[11px]">{aiError}</p>
                  <button
                    type="button"
                    onClick={handleRunAI}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                  >
                    重新尝试
                  </button>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Header: Target word + Phonetic */}
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900">
                        {aiAnalysis.word}
                      </span>
                      {aiAnalysis.phonetic && (
                        <span className="font-mono text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                          {aiAnalysis.phonetic}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRunAI}
                      className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      🔄 重新解析
                    </button>
                  </div>

                  {/* 1. Contextual Meaning Card */}
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>📖 本文语境精准释义 (Contextual Meaning)</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-bold rounded text-[11px]">
                        {aiAnalysis.contextualMeaning.pos}
                      </span>
                      <span className="font-bold text-emerald-950 text-sm">
                        {aiAnalysis.contextualMeaning.definition}
                      </span>
                    </div>
                    {aiAnalysis.contextualMeaning.explanation && (
                      <p className="text-emerald-900/90 leading-relaxed text-[11px] pt-1 border-t border-emerald-200/60 mt-1">
                        {aiAnalysis.contextualMeaning.explanation}
                      </p>
                    )}
                  </div>

                  {/* 2. All General Meanings */}
                  {aiAnalysis.allMeanings && aiAnalysis.allMeanings.length > 0 && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>📚 该词的所有常见词义与词性 (All Meanings)</span>
                      </div>
                      <div className="space-y-2 pt-0.5">
                        {aiAnalysis.allMeanings.map((m, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded text-[10px] shrink-0 mt-0.5">
                              {m.pos}
                            </span>
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">
                                {m.definition}
                              </span>
                              {m.example && (
                                <p className="text-slate-500 italic text-[11px] mt-0.5">
                                  例：{m.example}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Collocations / Synonyms */}
                  {aiAnalysis.collocations && aiAnalysis.collocations.length > 0 && (
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1.5">
                      <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>💡 核心搭配与考点 (Collocations & Points)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiAnalysis.collocations.map((col, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white border border-purple-200 text-purple-900 rounded-md text-[11px] font-medium shadow-2xs"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action: Copy to Note */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleInsertAIToNote}
                      className="w-full py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>📝 一键存入我的笔记 (并转到笔记编辑)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <p className="text-slate-600 text-xs">
                    尚未为此词生成 AI 深度释义。
                  </p>
                  <button
                    type="button"
                    onClick={handleRunAI}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🤖 立即开始 AI 深度解析</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div>
            {existingAnnotation && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(existingAnnotation.id);
                  onClose();
                }}
                className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              >
                🗑️ 删除标记
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              保存高亮与笔记
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
