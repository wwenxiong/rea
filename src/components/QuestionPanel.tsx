import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Question, SummaryGroup } from '../types';
import { getQuestionColor } from '../constants/colors';
import { SummaryCard } from './SummaryCard';
import { resolveSummaryWord } from '../utils/summaryWordBank';

interface QuestionPanelProps {
  questions: Question[];
  summaryGroup?: SummaryGroup;
  coursewareType?: 'reading' | 'cloze';
  paragraphs?: string[];
  activeQuestionId: number | null;
  showAnswers: Record<number, boolean>;
  areAnswersShown: boolean;
  fontSize: number;
  userAnswers?: Record<number, string>;
  isSubmitted?: boolean;
  onQuestionClick: (questionId: number) => void;
  onToggleAnswer: (questionId: number) => void;
  onSelectOption?: (questionId: number, optionKey: string) => void;
  onSubmitAnswers?: () => void;
  onResetAnswers?: () => void;
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
      coursewareType,
      paragraphs = [],
      activeQuestionId,
      showAnswers,
      areAnswersShown,
      fontSize,
      userAnswers = {},
      isSubmitted = false,
      onQuestionClick,
      onToggleAnswer,
      onSelectOption,
      onSubmitAnswers,
      onResetAnswers,
      onAISolve,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const [showAnswerKey, setShowAnswerKey] = useState(true);

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
      return areAnswersShown || (showAnswers[qId] ?? false);
    };

    const questionFontSize = Math.max(15, fontSize - 1);

    // Filter out questions that are already rendered inside the summaryGroup
    const nonSummaryQuestions = summaryGroup
      ? questions.filter((q) => !summaryGroup.items.some((it) => it.id === q.id))
      : questions;

    // Statistics for quiz mode
    const answeredCount = nonSummaryQuestions.filter((q) => !!userAnswers[q.id]).length;
    const correctCount = nonSummaryQuestions.filter((q) => {
      const choice = userAnswers[q.id];
      if (!choice || !q.answer) return false;
      const cleanAns = q.answer.trim().charAt(0).toUpperCase();
      return choice.trim().toUpperCase() === cleanAns;
    }).length;

    const unsolvedCount =
      (summaryGroup
        ? summaryGroup.items.filter((it) => !it.answer?.trim() || !it.evidenceText?.trim()).length
        : 0) +
      nonSummaryQuestions.filter((q) => !q.answer?.trim() || !q.evidenceText?.trim()).length;

    // Collect all items across summaryGroup and nonSummaryQuestions for Answer Key
    const answerKeyItems = (() => {
      const map = new Map<number, string>();
      if (summaryGroup) {
        for (const item of summaryGroup.items) {
          map.set(item.id, resolveSummaryWord(item.answer || '', summaryGroup));
        }
      }
      for (const q of questions) {
        if (!map.has(q.id)) {
          const ans = q.type === 'summary' ? resolveSummaryWord(q.answer || '', summaryGroup) : (q.answer || '');
          map.set(q.id, ans);
        } else if (!map.get(q.id) && q.answer) {
          const ans = q.type === 'summary' ? resolveSummaryWord(q.answer, summaryGroup) : q.answer;
          map.set(q.id, ans);
        }
      }
      return Array.from(map.entries())
        .map(([id, answer]) => ({ id, answer }))
        .sort((a, b) => a.id - b.id);
    })();

    return (
      <div className="h-full flex flex-col bg-white overflow-hidden relative">
        {/* Card Header matching reference screenshot */}
        <div className="px-5 py-3 border-b border-[#f0ebd9] bg-[#fdfbf7] flex items-center justify-between shrink-0 select-none flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shrink-0 shadow-2xs" />
            <span className="font-extrabold text-xs text-[#7c2d12] tracking-tight">
              题目 · {nonSummaryQuestions.length} 题，点击可定位原文
            </span>
          </div>

          {/* Interactive Quiz Mode Submission & Reset Controls */}
          {nonSummaryQuestions.length > 0 && (
            <div className="flex items-center gap-2">
              {!isSubmitted ? (
                <button
                  type="button"
                  onClick={onSubmitAnswers}
                  title="完成选择后点击提交，系统将判定对错并显示解析"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-2xs transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5"
                >
                  <span>提交答案</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                    {answeredCount}/{nonSummaryQuestions.length}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#92400e] bg-[#fef9ee] border border-[#fde68a] px-2.5 py-1 rounded-lg shadow-2xs">
                    得分: {correctCount}/{nonSummaryQuestions.length} ({Math.round((correctCount / (nonSummaryQuestions.length || 1)) * 100)}%)
                  </span>
                  <button
                    type="button"
                    onClick={onResetAnswers}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-600 bg-[#f4efe6] hover:bg-[#eadecc] transition-colors cursor-pointer"
                  >
                    重新答题
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Questions Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-3.5 bg-white"
        >
          {/* Unsolved Questions Notice Banner */}
          {unsolvedCount > 0 && onAISolve && (
            <div className="mb-4 bg-[#fffbf0] border border-[#fde68a] rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0 select-none">📝</span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#78350f] truncate">
                    尚有 {unsolvedCount} 道题目未补充答案或解析
                  </h4>
                  <p className="text-[11px] text-[#b45309] truncate">
                    点击自动生成参考答案与原文依据句
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onAISolve}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
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
                paragraphs={paragraphs}
                activeQuestionId={activeQuestionId}
                areAnswersShown={areAnswersShown}
                fontSize={fontSize}
                onSelectBlank={onQuestionClick}
              />
            </div>
          )}

          {/* 2. Render Questions (Cloze 2x2 grid & Standard options) */}
          {nonSummaryQuestions.length > 0 && (
            <div className="space-y-4">
              {summaryGroup && (
                <div className="pt-2 pb-1 border-t border-[#ede7dc]">
                  <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wide">
                    试题列表 (Questions {nonSummaryQuestions[0]?.id}–{nonSummaryQuestions[nonSummaryQuestions.length - 1]?.id})
                  </span>
                </div>
              )}

              {nonSummaryQuestions.map((q) => {
                const color = getQuestionColor(q.id - 1);
                const isActive = activeQuestionId === q.id;
                const isColored = areAnswersShown || isActive;
                const showAnswer = isAnswerVisible(q.id);
                const isClozeQuestion =
                  coursewareType === 'reading'
                    ? false
                    : coursewareType === 'cloze'
                    ? true
                    : q.type === 'cloze' || (q.options && q.options.length === 4 && (!q.stem || q.stem.includes('完形') || q.stem.includes(`第 ${q.id} 题`) || q.stem.length < 20));

                return (
                  <div
                    key={q.id}
                    ref={(el) => registerCardRef(q.id, el)}
                    onClick={() => onQuestionClick(q.id)}
                    className={`bg-white rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden border ${
                      isActive
                        ? 'shadow-md border-transparent ring-2 ring-[#ea580c]/60'
                        : 'shadow-2xs hover:shadow-xs border-[#ede7dc] hover:border-[#ddd4c4]'
                    }`}
                    style={{
                      borderLeft: isColored ? `5px solid ${color.primary}` : '4px solid #e8e2d8',
                    }}
                  >
                    {/* Card Header: Orange Round Badge + Stem + (Optional) Right Arrow Answer Hint */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 select-none mt-0.5">
                            {q.id}
                          </span>

                          {!isClozeQuestion && q.stem && (
                            <p
                              className="leading-relaxed tracking-normal transition-colors duration-200"
                              style={{
                                fontSize: `${questionFontSize}px`,
                                color: isColored ? color.primary : '#1c1917',
                                fontWeight: isColored ? 700 : 600,
                              }}
                            >
                              {q.stem}
                            </p>
                          )}
                        </div>

                        {/* Right-aligned hint e.g. → A. taken */}
                        {(showAnswer || isSubmitted) && q.answer && (
                          <span className="text-xs font-bold text-[#ea580c] bg-[#fff7ed] border border-[#ffedd5] px-2 py-0.5 rounded-md shrink-0 select-none">
                            → {q.answer}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Options Layout: 2x2 Grid for Cloze (matching user screenshot) or Standard List */}
                    {q.options && q.options.length > 0 && (
                      <div className="px-4 pb-3">
                        <div className={isClozeQuestion ? 'grid grid-cols-2 gap-2.5' : 'space-y-2'}>
                          {q.options.map((opt, optIdx) => {
                            const trimmed = opt.trim();
                            const matchLetter = trimmed.match(/^([A-D])[.、\s]?(.*)/i);
                            const letter = matchLetter ? matchLetter[1].toUpperCase() : String.fromCharCode(65 + optIdx);
                            const content = matchLetter ? matchLetter[2].trim() : trimmed;

                            const isSelectedByUser = userAnswers[q.id] === letter;

                            // Comprehensive check for whether this option is the correct answer
                            const checkIsCorrect = (): boolean => {
                              if (!q.answer) return false;
                              const rawAns = q.answer.trim();
                              if (!rawAns) return false;

                              // 1. Single letter match, e.g. "B" or "B." or "B. The need..."
                              const letterMatch = rawAns.match(/^([A-D])\b/i);
                              if (letterMatch && letterMatch[1].toUpperCase() === letter) return true;

                              // 2. Character-0 match if single character
                              if (rawAns.length === 1 && rawAns.toUpperCase() === letter) return true;

                              // 3. Exact full match or content match
                              const rawLower = rawAns.toLowerCase();
                              if (rawLower === trimmed.toLowerCase() || rawLower === content.toLowerCase()) return true;

                              // 4. True / False / Yes / No
                              if (/^true$/i.test(rawAns) && /^(a[.\s]+)?true/i.test(trimmed)) return true;
                              if (/^false$/i.test(rawAns) && /^(b[.\s]+)?false/i.test(trimmed)) return true;
                              if (/^not given$/i.test(rawAns) && /^(c[.\s]+)?not given/i.test(trimmed)) return true;
                              if (/^yes$/i.test(rawAns) && /^(a[.\s]+)?yes/i.test(trimmed)) return true;
                              if (/^no$/i.test(rawAns) && /^(b[.\s]+)?no/i.test(trimmed)) return true;

                              return false;
                            };
                            const isCorrectChoice = checkIsCorrect();

                            // When viewing reference answer (drawer expanded or global all-shown)
                            const isAnswerRevealed = showAnswer;

                            let cardBg = '#ffffff';
                            let cardBorder = '#e8e2d8';
                            let textColor = '#292524';
                            let badgeBg = '#f4efe6';
                            let badgeColor = '#57534e';
                            let rightTag: React.ReactNode = null;

                            if (isSubmitted) {
                              if (isSelectedByUser && isCorrectChoice) {
                                cardBg = '#F0FBF5';
                                cardBorder = '#3C986D';
                                textColor = '#166534';
                                badgeBg = '#3C986D';
                                badgeColor = '#ffffff';
                                rightTag = <span className="text-emerald-600 font-black text-sm shrink-0">✓</span>;
                              } else if (isSelectedByUser && !isCorrectChoice) {
                                cardBg = '#FFF3F3';
                                cardBorder = '#CF5F52';
                                textColor = '#991b1b';
                                badgeBg = '#CF5F52';
                                badgeColor = '#ffffff';
                                rightTag = <span className="text-red-500 font-black text-sm shrink-0">✗</span>;
                              } else if (!isSelectedByUser && isCorrectChoice) {
                                cardBg = '#F0FBF5';
                                cardBorder = '#3C986D';
                                textColor = '#166534';
                                badgeBg = '#3C986D';
                                badgeColor = '#ffffff';
                                rightTag = (
                                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 shadow-2xs">
                                    ✓ 正确答案
                                  </span>
                                );
                              }
                            } else if (isAnswerRevealed) {
                              // 查看参考答案状态下，把正确答案选中标记！
                              if (isCorrectChoice) {
                                cardBg = '#F0FBF5';
                                cardBorder = '#3C986D';
                                textColor = '#166534';
                                badgeBg = '#3C986D';
                                badgeColor = '#ffffff';
                                rightTag = (
                                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 shadow-2xs">
                                    ✓ 正确答案
                                  </span>
                                );
                              } else if (isSelectedByUser) {
                                cardBg = '#FFF3F3';
                                cardBorder = '#CF5F52';
                                textColor = '#991b1b';
                                badgeBg = '#CF5F52';
                                badgeColor = '#ffffff';
                                rightTag = (
                                  <span className="text-[11px] font-bold text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 shadow-2xs">
                                    ✗ 你的选择
                                  </span>
                                );
                              }
                            } else {
                              if (isSelectedByUser) {
                                cardBg = '#fef9ee';
                                cardBorder = '#f59e0b';
                                textColor = '#92400e';
                                badgeBg = '#ea580c';
                                badgeColor = '#ffffff';
                              }
                            }

                            return (
                              <div
                                key={optIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSubmitted && onSelectOption) {
                                    onSelectOption(q.id, letter);
                                  }
                                }}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all select-none shadow-2xs ${
                                  (isAnswerRevealed || isSubmitted) && isCorrectChoice
                                    ? 'ring-1 ring-emerald-400/40 shadow-xs'
                                    : isSelectedByUser && !isAnswerRevealed && !isSubmitted
                                    ? 'ring-1 ring-[#f59e0b]/40 shadow-xs'
                                    : ''
                                } ${
                                  isSubmitted ? 'cursor-default' : 'cursor-pointer hover:border-[#d6cebf] hover:scale-[1.01]'
                                }`}
                                style={{
                                  backgroundColor: cardBg,
                                  borderColor: cardBorder,
                                  color: textColor,
                                }}
                              >
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-md font-black shrink-0 transition-colors text-[11px]"
                                  style={{
                                    backgroundColor: badgeBg,
                                    color: badgeColor,
                                  }}
                                >
                                  {letter}
                                </span>
                                <span
                                  className="truncate flex-1"
                                  style={{
                                    fontSize: `${questionFontSize - 3}px`,
                                    fontWeight: (isAnswerRevealed || isSubmitted) && isCorrectChoice ? 700 : 500,
                                  }}
                                >
                                  {content}
                                </span>

                                {rightTag}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Card Bottom: Toggle Analysis Drawer */}
                    <div className="px-4 pb-2.5 pt-2 flex items-center justify-between border-t border-[#f4efe6] bg-[#fdfbf7]/70">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAnswer(q.id);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer bg-[#f5f0e6] hover:bg-[#ede5d8] text-stone-700"
                      >
                        <span>{showAnswer ? '收起解析' : '查看答案和解析'}</span>
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
                      <span className="text-[11px] text-stone-400">
                        {isActive ? '已定位对应原文空格' : '点击定位原文'}
                      </span>
                    </div>

                    {/* Collapsible Answer & Explanation Drawer */}
                    {showAnswer && (
                      <div
                        className="p-4 border-t border-[#f0ebd9] space-y-3 bg-[#fdfbf7]/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white tracking-wide bg-[#ea580c]">
                            参考答案
                          </span>
                          <span className="font-extrabold text-base tracking-wider text-[#ea580c]">
                            {q.answer || '（暂无）'}
                          </span>
                        </div>

                        {!q.answer && !q.evidenceText && onAISolve && (
                          <div className="bg-white border border-[#fde68a] rounded-xl p-2.5 text-xs flex items-center justify-between gap-2 shadow-2xs">
                            <span className="text-[#78350f] font-medium">题目暂无答案与依据</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAISolve();
                              }}
                              className="px-2.5 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded font-medium text-[11px] shrink-0 transition-colors"
                            >
                              生成解析
                            </button>
                          </div>
                        )}

                        {q.evidenceText && (
                          <div
                            className="rounded-xl p-3 border-l-4 text-xs leading-relaxed space-y-1 shadow-2xs bg-white border border-[#ede7dc]"
                            style={{
                              borderLeftColor: '#ea580c',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] uppercase tracking-wider text-[#ea580c]">
                                原文定位依据
                              </span>
                              <span className="text-[11px] text-stone-400 font-mono">
                                [Q{q.id} 原文依据]
                              </span>
                            </div>
                            <p className="font-semibold text-stone-800 italic">
                              "{q.evidenceText}"
                            </p>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="bg-white rounded-xl p-3 text-xs leading-relaxed space-y-1 text-stone-700 border border-[#ede7dc]">
                            <span className="font-bold text-[11px] text-stone-500 block uppercase tracking-wider">
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
            <div className="mt-6 bg-[#fdfbf7] rounded-2xl border border-[#ede7dc] shadow-2xs p-5 space-y-3.5 transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#f0ebd9] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">✅</span>
                  <h3 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
                    <span>答案速查</span>
                    <span className="text-stone-600 font-semibold text-sm">Answer Key</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 font-normal hidden sm:inline">
                    点击答案定位原文
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAnswerKey((prev) => !prev)}
                    className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-[#f4efe6] hover:bg-[#ede5d8] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
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
      </div>
    );
  }
);

QuestionPanel.displayName = 'QuestionPanel';
