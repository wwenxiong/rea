import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Question, SummaryGroup } from '../types';
import { getQuestionColor } from '../constants/colors';
import { SummaryCard } from './SummaryCard';

interface QuestionPanelProps {
  questions: Question[];
  summaryGroup?: SummaryGroup;
  activeQuestionId: number | null;
  showAnswers: Record<number, boolean>;
  areAnswersShown: boolean;
  fontSize: number;
  onQuestionClick: (questionId: number) => void;
  onToggleAnswer: (questionId: number) => void;
  onAISolve?: () => void;
}

export interface QuestionPanelHandle {
  scrollToQuestion: (questionId: number) => void;
}

export const QuestionPanel = forwardRef<QuestionPanelHandle, QuestionPanelProps>(
  (
    {
      questions,
      summaryGroup,
      activeQuestionId,
      showAnswers,
      areAnswersShown,
      fontSize,
      onQuestionClick,
      onToggleAnswer,
      onAISolve,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const scrollToCard = useCallback((questionId: number) => {
      const el = cardRefs.current.get(questionId);
      if (el && containerRef.current) {
        const container = containerRef.current;
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top;
        const targetScrollTop = container.scrollTop + relativeTop - 32;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      }
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToQuestion: (questionId: number) => {
        setTimeout(() => {
          scrollToCard(questionId);
        }, 40);
      },
    }), [scrollToCard]);

    useEffect(() => {
      if (activeQuestionId !== null) {
        setTimeout(() => {
          scrollToCard(activeQuestionId);
        }, 40);
      }
    }, [activeQuestionId, scrollToCard]);

    const registerCardRef = useCallback((questionId: number, el: HTMLDivElement | null) => {
      if (el) {
        cardRefs.current.set(questionId, el);
      }
    }, []);

    const isAnswerVisible = (qId: number) => {
      return areAnswersShown || activeQuestionId === qId || (showAnswers[qId] ?? false);
    };

    const questionFontSize = Math.max(15, fontSize - 1);

    // Filter out questions that are already rendered inside the summaryGroup
    const nonSummaryQuestions = summaryGroup
      ? questions.filter((q) => !summaryGroup.items.some((it) => it.id === q.id))
      : questions;

    const totalCount = (summaryGroup ? summaryGroup.items.length : 0) + nonSummaryQuestions.length;

    const unsolvedCount =
      (summaryGroup
        ? summaryGroup.items.filter((it) => !it.answer?.trim() || !it.evidenceText?.trim()).length
        : 0) +
      nonSummaryQuestions.filter((q) => !q.answer?.trim() || !q.evidenceText?.trim()).length;

    const [showAnswerKey, setShowAnswerKey] = useState(true);

    // Collect all items across summaryGroup and nonSummaryQuestions for Answer Key
    const answerKeyItems = (() => {
      const map = new Map<number, string>();
      if (summaryGroup) {
        for (const item of summaryGroup.items) {
          map.set(item.id, item.answer || '');
        }
      }
      for (const q of questions) {
        if (!map.has(q.id)) {
          map.set(q.id, q.answer || '');
        } else if (!map.get(q.id) && q.answer) {
          map.set(q.id, q.answer);
        }
      }
      return Array.from(map.entries())
        .map(([id, answer]) => ({ id, answer }))
        .sort((a, b) => a.id - b.id);
    })();

    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto custom-scrollbar bg-slate-50 border-l border-slate-200"
        style={{ padding: '24px 20px 48px 20px' }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              练习与解析 · 共 {totalCount} 题
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            点击题目定位原文
          </span>
        </div>

        {/* Unsolved Questions Notice Banner */}
        {unsolvedCount > 0 && onAISolve && (
          <div className="mb-4 bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">📝</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-indigo-950 truncate">
                  尚有 {unsolvedCount} 道题目未补充答案或解析
                </h4>
                <p className="text-[11px] text-indigo-600 truncate">
                  点击自动生成参考答案与原文依据句
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onAISolve}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
            >
              生成解析
            </button>
          </div>
        )}

        {/* 1. Render Summary Group Card (Questions 1–7) if present */}
        {summaryGroup && (
          <div ref={(el) => registerCardRef(summaryGroup.items[0]?.id || 1, el)}>
            <SummaryCard
              summaryGroup={summaryGroup}
              activeQuestionId={activeQuestionId}
              areAnswersShown={areAnswersShown}
              fontSize={fontSize}
              onSelectBlank={onQuestionClick}
            />
          </div>
        )}

        {/* 2. Render Independent Multiple-choice / Short-answer Questions (Questions 8–13) */}
        {nonSummaryQuestions.length > 0 && (
          <div className="space-y-4">
            {summaryGroup && (
              <div className="pt-2 pb-1 border-t border-slate-200/80">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                  选择题与简答题 (Questions 8–13)
                </span>
              </div>
            )}

            {nonSummaryQuestions.map((q) => {
              const color = getQuestionColor(q.id - 1);
              const isActive = activeQuestionId === q.id;
              const isColored = areAnswersShown || isActive;
              const showAnswer = isAnswerVisible(q.id);

              return (
                <div
                  key={q.id}
                  ref={(el) => registerCardRef(q.id, el)}
                  onClick={() => onQuestionClick(q.id)}
                  className={`bg-white rounded-xl transition-all duration-200 cursor-pointer overflow-hidden border ${
                    isActive
                      ? 'shadow-md border-transparent ring-2'
                      : 'shadow-2xs hover:shadow-xs border-slate-200/90 hover:border-slate-300'
                  }`}
                  style={{
                    borderLeft: isColored ? `5px solid ${color.primary}` : '4px solid #e2e8f0',
                    ...(isActive ? { ringColor: color.border } : {}),
                  }}
                >
                  {/* Header: Badge + Stem */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex items-center justify-center rounded-lg font-bold shrink-0 shadow-2xs transition-colors duration-200"
                        style={{
                          backgroundColor: isColored ? color.primary : '#f1f5f9',
                          color: isColored ? '#ffffff' : '#475569',
                          border: isColored ? 'none' : '1px solid #e2e8f0',
                          fontSize: '12px',
                          minWidth: '32px',
                          height: '24px',
                          padding: '0 6px',
                          marginTop: '1px',
                        }}
                      >
                        第{q.id}题
                      </span>

                      <p
                        className="leading-relaxed tracking-normal transition-colors duration-200"
                        style={{
                          fontSize: `${questionFontSize}px`,
                          color: isColored ? color.primary : '#0f172a',
                          fontWeight: isColored ? 700 : 600,
                        }}
                      >
                        {q.stem}
                      </p>
                    </div>
                  </div>

                  {/* Options List */}
                  {q.options.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="space-y-2 pl-11">
                        {q.options.map((opt, optIdx) => {
                          const trimmed = opt.trim();
                          const matchLetter = trimmed.match(/^([A-D])[.、\s]?(.*)/i);
                          const letter = matchLetter ? matchLetter[1].toUpperCase() : '';
                          const content = matchLetter ? matchLetter[2] : trimmed;
                          const isCorrect = showAnswer && letter && q.answer.toUpperCase().includes(letter);

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2.5 py-1.5 px-3 rounded-lg text-sm transition-all border ${
                                isCorrect
                                  ? 'font-semibold border-transparent shadow-xs'
                                  : 'text-slate-700 border-transparent hover:bg-slate-50'
                              }`}
                              style={{
                                fontSize: `${questionFontSize - 2}px`,
                                lineHeight: '1.6',
                                ...(isCorrect
                                  ? {
                                      backgroundColor: color.bgLight,
                                      color: color.primary,
                                      borderColor: color.border,
                                    }
                                  : {}),
                              }}
                            >
                              {letter ? (
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                                    isCorrect ? 'text-white' : 'bg-slate-100 text-slate-500'
                                  }`}
                                  style={{
                                    backgroundColor: isCorrect ? color.primary : undefined,
                                  }}
                                >
                                  {letter}
                                </span>
                              ) : null}
                              <span className="flex-1">{content}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="px-4 pb-3 pl-15 flex items-center justify-between border-t border-slate-100 pt-2.5 bg-slate-50/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAnswer(q.id);
                      }}
                      className="text-xs font-medium px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1.5"
                      style={{
                        color: isActive ? color.primary : '#475569',
                        backgroundColor: isActive ? color.bgLight : '#f1f5f9',
                      }}
                    >
                      <span>{showAnswer ? '收起解析' : '查看解析'}</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          showAnswer ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {isActive ? '已定位对应原文' : '点击定位原文'}
                    </span>
                  </div>

                  {/* Collapsible Answer & Explanation Drawer */}
                  {showAnswer && (
                    <div
                      className="p-4 border-t border-slate-200/60 space-y-3"
                      style={{
                        backgroundColor: `${color.bgLight}55`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white tracking-wide"
                          style={{ backgroundColor: color.primary }}
                        >
                          参考答案
                        </span>
                        <span
                          className="font-extrabold text-base tracking-wider"
                          style={{ color: q.answer ? color.primary : '#94a3b8' }}
                        >
                          {q.answer || '（暂无）'}
                        </span>
                      </div>

                      {!q.answer && !q.evidenceText && onAISolve && (
                        <div className="bg-white/95 border border-indigo-200/80 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2 shadow-2xs">
                          <span className="text-indigo-900 font-medium">题目暂无答案与依据</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAISolve();
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-[11px] shrink-0 transition-colors"
                          >
                            生成解析
                          </button>
                        </div>
                      )}

                      {q.evidenceText && (
                        <div
                          className="rounded-lg p-3 border-l-4 text-xs leading-relaxed space-y-1 shadow-xs bg-white"
                          style={{
                            borderLeftColor: color.primary,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-bold text-[11px] uppercase tracking-wider"
                              style={{ color: color.primary }}
                            >
                              原文定位依据
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              [Q{q.id} 原文依据]
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 italic">
                            "{q.evidenceText}"
                          </p>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="bg-white/80 rounded-lg p-3 text-xs leading-relaxed space-y-1 text-slate-700 border border-slate-200/50">
                          <span className="font-bold text-[11px] text-slate-500 block uppercase tracking-wider">
                            试题解析
                          </span>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 答案速查 (Answer Key) Section matching reference screenshot */}
        {answerKeyItems.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3.5 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">✅</span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>答案速查</span>
                  <span className="text-slate-700 font-semibold text-sm">Answer Key</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                  点击答案定位原文
                </span>
                <button
                  type="button"
                  onClick={() => setShowAnswerKey((prev) => !prev)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  {showAnswerKey ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {/* Answer Pills Grid */}
            <div className="flex flex-wrap gap-2.5 items-center pt-0.5">
              {answerKeyItems.map(({ id, answer }) => {
                const color = getQuestionColor(id - 1);
                const isSelected = activeQuestionId === id;
                const displayText = showAnswerKey ? (answer || '____') : '____';

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onQuestionClick(id)}
                    title={`点击查看第 ${id} 题答案解析并联动原文`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer select-none shadow-2xs hover:scale-105 ${
                      isSelected
                        ? 'ring-2 ring-offset-1 scale-105'
                        : 'hover:shadow-xs'
                    }`}
                    style={{
                      backgroundColor: color.bgLight,
                      color: color.primary,
                      borderColor: color.border,
                    }}
                  >
                    <span className="font-bold font-mono">{id}</span>
                    <span className="font-semibold tracking-wide">
                      {displayText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

QuestionPanel.displayName = 'QuestionPanel';
