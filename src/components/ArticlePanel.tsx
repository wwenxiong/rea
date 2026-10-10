import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Courseware, ArticleAnnotation, AIWordAnalysis } from '../types';
import { getQuestionColor } from '../constants/colors';
import { LINE_HEIGHT_RATIO, LETTER_SPACING } from '../constants/design';
import { getConciseAnnotationMeaning } from '../utils/textSelectionUtils';

interface ArticlePanelProps {
  courseware: Courseware;
  fontSize: number;
  areAnswersShown: boolean;
  activeQuestionId: number | null;
  userAnswers?: Record<number, string>;
  isSubmitted?: boolean;
  revealedBlanks?: Record<number, boolean>;
  onEvidenceClick: (questionId: number) => void;
  onBlankClick?: (questionId: number) => void;
  onSaveAnnotation?: (
    annotation: {
      text: string;
      paragraphIndex: number;
      startOffset: number;
      endOffset: number;
      color: string;
      note: string;
      aiAnalysis?: AIWordAnalysis;
    },
    id?: string
  ) => void;
  onDeleteAnnotation?: (id: string) => void;
  onOpenAnnotation?: (annotation: ArticleAnnotation, anchorRect?: DOMRect) => void;
}

export interface ArticlePanelHandle {
  scrollToEvidence: (questionId: number) => void;
}

export const ArticlePanel = forwardRef<ArticlePanelHandle, ArticlePanelProps>(
  (
    {
      courseware,
      fontSize,
      areAnswersShown,
      activeQuestionId,
      userAnswers = {},
      isSubmitted = false,
      revealedBlanks = {},
      onEvidenceClick,
      onBlankClick,
      onOpenAnnotation,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const evidenceRefs = useRef<Map<number, HTMLElement>>(new Map());
    const paragraphRefs = useRef<Map<number, HTMLElement>>(new Map());

    const scrollToCenter = useCallback((questionId: number) => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      // 1. Get exact evidence span
      let targetEl = evidenceRefs.current.get(questionId);

      // 2. If not found in evidenceRefs, find paragraph element from courseware
      let targetParagraph: HTMLElement | undefined;
      if (targetEl) {
        targetParagraph = (targetEl.closest('.group') as HTMLElement) || targetEl;
      } else {
        let pIdx: number | undefined;
        const summaryItem = courseware.summaryGroup?.items.find((it) => it.id === questionId);
        if (summaryItem && summaryItem.evidenceRanges[0]) {
          pIdx = summaryItem.evidenceRanges[0].paragraphIndex;
        } else {
          const q = courseware.questions.find((item) => item.id === questionId);
          if (q && q.evidenceRanges[0]) {
            pIdx = q.evidenceRanges[0].paragraphIndex;
          }
        }
        if (pIdx !== undefined) {
          targetParagraph = paragraphRefs.current.get(pIdx);
          targetEl = targetParagraph;
        }
      }

      if (!targetEl || !targetParagraph) return;

      const elementToCenter =
        targetParagraph.clientHeight <= container.clientHeight * 0.75
          ? targetParagraph
          : targetEl;

      const targetRect = elementToCenter.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const relativeTop = targetRect.top - containerRect.top;
      const targetScrollTop =
        container.scrollTop + relativeTop - container.clientHeight / 2 + targetRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });

      targetEl.classList.add('highlight-pulse');
      setTimeout(() => targetEl?.classList.remove('highlight-pulse'), 1800);
    }, [courseware]);

    const performScroll = useCallback((questionId: number) => {
      setTimeout(() => {
        scrollToCenter(questionId);
      }, 40);
    }, [scrollToCenter]);

    useImperativeHandle(ref, () => ({
      scrollToEvidence: (questionId: number) => {
        performScroll(questionId);
      },
    }), [performScroll]);

    useEffect(() => {
      if (activeQuestionId !== null) {
        performScroll(activeQuestionId);
      }
    }, [activeQuestionId, performScroll]);

    const registerEvidenceRef = useCallback((questionId: number, el: HTMLElement | null) => {
      if (el) {
        evidenceRefs.current.set(questionId, el);
      }
    }, []);

    const totalWords = courseware.paragraphs.reduce((acc, p) => {
      const words = p.trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);

    const isClozeCw =
      courseware.coursewareType === 'cloze' ||
      courseware.questions.some((q) => q.type === 'cloze') ||
      courseware.paragraphs.some((p) =>
        /(?:_{2,}\s*\d+\s*_{2,}|\[\s*\d+\s*\]|\(\s*\d+\s*\)|（\s*\d+\s*）|\b\d+\s*_{2,}|\b\d+\s*\.{3,})/.test(p)
      );

    const renderClozeBlank = (blankId: number, keyStr: string) => {
      const q = courseware.questions.find((item) => item.id === blankId);
      const color = getQuestionColor(blankId - 1);
      const isActive = activeQuestionId === blankId;
      const isRevealed = !!(revealedBlanks[blankId] || areAnswersShown);
      const userChoice = userAnswers[blankId];

      let answerWord = q?.answer || '';
      if (q && q.options && q.options.length > 0) {
        const cleanAnsKey = (q.answer || '').trim().charAt(0).toUpperCase();
        const matchedOpt = q.options.find((opt) => opt.trim().charAt(0).toUpperCase() === cleanAnsKey);
        if (matchedOpt) {
          const optWordMatch = matchedOpt.match(/^[A-Da-d][.\u3001\uff0e)\s]+(.*)/);
          if (optWordMatch && optWordMatch[1].trim()) {
            answerWord = `${cleanAnsKey} ${optWordMatch[1].trim()}`;
          } else {
            answerWord = matchedOpt;
          }
        }
      }

      let userChoiceWord = userChoice || '';
      if (q && userChoice && q.options && q.options.length > 0) {
        const matchedOpt = q.options.find((opt) => opt.trim().charAt(0).toUpperCase() === userChoice.toUpperCase());
        if (matchedOpt) {
          const optWordMatch = matchedOpt.match(/^[A-Da-d][.\u3001\uff0e)\s]+(.*)/);
          if (optWordMatch && optWordMatch[1].trim()) {
            userChoiceWord = `${userChoice} ${optWordMatch[1].trim()}`;
          } else {
            userChoiceWord = matchedOpt;
          }
        }
      }

      const isUserCorrect =
        isSubmitted &&
        userChoice &&
        q?.answer &&
        userChoice.trim().toUpperCase() === q.answer.trim().charAt(0).toUpperCase();

      return (
        <span
          key={keyStr}
          ref={(el) => registerEvidenceRef(blankId, el)}
          onClick={(e) => {
            e.stopPropagation();
            if (onBlankClick) {
              onBlankClick(blankId);
            } else {
              onEvidenceClick(blankId);
            }
          }}
          title={`第 ${blankId} 题空格 · 点击显示正确答案并定位题目`}
          className={`inline-flex items-center justify-center align-baseline cursor-pointer transition-all duration-200 select-none mx-1.5 px-3 py-0.5 rounded-lg border shadow-2xs group/blank ${
            isActive
              ? 'scale-105 shadow-xs ring-2 ring-offset-1'
              : 'hover:scale-105 hover:shadow-xs'
          }`}
          style={{
            backgroundColor: isSubmitted
              ? isUserCorrect
                ? '#F0FBF5'
                : '#FFF3F3'
              : isRevealed
              ? color.bgLight
              : userChoice
              ? '#F0F7FC'
              : '#FFFFFF',
            borderColor: isSubmitted
              ? isUserCorrect
                ? '#A3DEBD'
                : '#F7B7AE'
              : isRevealed
              ? color.border
              : userChoice
              ? '#A5CEEB'
              : '#E2E8F0',
            borderBottom: `2.5px solid ${
              isSubmitted
                ? isUserCorrect
                  ? '#3C986D'
                  : '#CF5F52'
                : isRevealed
                ? color.primary
                : userChoice
                ? '#3B82B6'
                : color.primary
            }`,
            minWidth: isRevealed || isSubmitted || userChoice ? '56px' : '48px',
            height: '28px',
            verticalAlign: 'baseline',
          }}
        >
          {isRevealed ? (
            <span className="inline-flex items-center gap-1.5 animate-fadeIn">
              <span
                className="inline-flex items-center justify-center rounded text-white text-[10px] font-black px-1.5 h-4 shadow-2xs select-none"
                style={{ backgroundColor: color.primary }}
              >
                {blankId}
              </span>
              <span
                className="font-extrabold text-[13px] tracking-wide"
                style={{ color: color.primary }}
              >
                {answerWord || '（待输入）'}
              </span>
            </span>
          ) : isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 animate-fadeIn">
              <span
                className={`inline-flex items-center justify-center rounded text-white text-[10px] font-black px-1.5 h-4 select-none ${
                  isUserCorrect ? 'bg-emerald-600' : 'bg-red-500'
                }`}
              >
                {blankId}
              </span>
              {isUserCorrect ? (
                <span className="font-extrabold text-[13px] text-emerald-700 flex items-center gap-0.5">
                  <span>✓</span>
                  <span>{userChoiceWord}</span>
                </span>
              ) : (
                <span className="font-bold text-[13px] text-red-600 flex items-center gap-1">
                  <span className="line-through opacity-70">{userChoiceWord || '未答'}</span>
                  <span className="text-emerald-700 font-extrabold">({answerWord})</span>
                </span>
              )}
            </span>
          ) : userChoice ? (
            <span className="inline-flex items-center gap-1.5 animate-fadeIn">
              <span className="inline-flex items-center justify-center rounded bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 h-4 select-none">
                {blankId}
              </span>
              <span className="font-bold text-[13px] text-blue-700 tracking-wide">
                {userChoiceWord}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-1">
              <span
                className="font-bold font-mono text-[13px] tracking-tight"
                style={{ color: color.primary }}
              >
                {blankId}
              </span>
              <span className="text-slate-300 tracking-widest font-light ml-1 select-none">
                ____
              </span>
            </span>
          )}
        </span>
      );
    };

    const renderParagraph = (paragraphText: string, paragraphIndex: number) => {
      // Check if paragraph contains Cloze blanks
      const clozeRegex = /(_{2,}\s*\d+\s*_{2,}|\[\s*\d+\s*\]|\(\s*\d+\s*\)|（\s*\d+\s*）|\b\d+\s*_{2,}|\b\d+\s*\.{3,})/g;

      if (isClozeCw && clozeRegex.test(paragraphText)) {
        clozeRegex.lastIndex = 0;
        const parts = paragraphText.split(clozeRegex);

        // Find user annotations in this paragraph
        const annots = (courseware.annotations || []).filter(
          (a) =>
            a.paragraphIndex === paragraphIndex &&
            a.startOffset >= 0 &&
            a.endOffset <= paragraphText.length &&
            a.startOffset < a.endOffset
        );

        let runningOffset = 0;

        return (
          <div
            key={paragraphIndex}
            data-paragraph-index={paragraphIndex}
            ref={(el) => {
              if (el) paragraphRefs.current.set(paragraphIndex, el);
            }}
            className="relative flex items-start gap-4 mb-6 group"
          >
            <span className="shrink-0 w-8 text-right font-mono text-xs text-slate-300 select-none pt-1 group-hover:text-slate-400 transition-colors">
              P{paragraphIndex + 1}
            </span>
            <p className="flex-1 leading-loose text-slate-800 tracking-normal text-justify select-text">
              {parts.map((part, partIdx) => {
                const partStart = runningOffset;
                const partEnd = runningOffset + part.length;
                runningOffset = partEnd;

                const matchNum = part.match(/\d+/);
                if (matchNum && clozeRegex.test(part)) {
                  clozeRegex.lastIndex = 0;
                  const blankId = parseInt(matchNum[0], 10);
                  return renderClozeBlank(blankId, `cloze-${paragraphIndex}-${partIdx}-${blankId}`);
                }
                clozeRegex.lastIndex = 0;

                // Check if any annotations intersect with this text part [partStart, partEnd]
                const intersectingAnnots = annots.filter(
                  (a) => a.startOffset < partEnd && a.endOffset > partStart
                );

                if (intersectingAnnots.length === 0) {
                  return <span key={`text-${paragraphIndex}-${partIdx}`}>{part}</span>;
                }

                // Sub-segment this text part with intersecting annotations
                const subPoints = new Set<number>([0, part.length]);
                intersectingAnnots.forEach((a) => {
                  const relStart = Math.max(0, Math.min(part.length, a.startOffset - partStart));
                  const relEnd = Math.max(0, Math.min(part.length, a.endOffset - partStart));
                  subPoints.add(relStart);
                  subPoints.add(relEnd);
                });
                const sortedSubPoints = Array.from(subPoints).sort((a, b) => a - b);
                const subNodes: React.ReactNode[] = [];

                for (let k = 0; k < sortedSubPoints.length - 1; k++) {
                  const segStart = sortedSubPoints[k];
                  const segEnd = sortedSubPoints[k + 1];
                  if (segStart >= segEnd) continue;
                  const textSlice = part.slice(segStart, segEnd);
                  const absSegStart = partStart + segStart;
                  const absSegEnd = partStart + segEnd;
                  const activeAnnot = intersectingAnnots.find(
                    (a) => absSegStart >= a.startOffset && absSegEnd <= a.endOffset
                  );

                  if (activeAnnot) {
                    const isAnnotEnd = absSegEnd === activeAnnot.endOffset;
                    const conciseMeaning = isAnnotEnd ? getConciseAnnotationMeaning(activeAnnot) : '';
                    subNodes.push(
                      <span
                        key={`annot-${paragraphIndex}-${activeAnnot.id}-${segStart}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
                        }}
                        title={activeAnnot.note ? `笔记: ${activeAnnot.note}` : '点击查看/编辑笔记、AI 释义与翻译'}
                        className="cursor-pointer transition-all duration-150 rounded-xs select-text hover:opacity-90 inline"
                        style={{
                          backgroundColor: activeAnnot.color,
                          borderBottom: `2px solid ${activeAnnot.color}`,
                          padding: '0 2px',
                        }}
                      >
                        {textSlice}
                        {isAnnotEnd && conciseMeaning && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
                            }}
                            title={`批注 (点击查看详情): ${activeAnnot.note || activeAnnot.aiAnalysis?.contextualMeaning.definition || activeAnnot.aiTranslation?.translation || ''}`}
                            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 rounded-md text-[11px] font-sans font-medium border shadow-2xs select-none cursor-pointer transition-transform hover:scale-105 align-baseline bg-white/95"
                            style={{
                              borderColor: activeAnnot.color,
                              color: '#1e293b',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeAnnot.color }} />
                            <span>[{conciseMeaning}]</span>
                          </span>
                        )}
                      </span>
                    );
                  } else {
                    subNodes.push(
                      <span key={`sub-${paragraphIndex}-${partIdx}-${segStart}`}>{textSlice}</span>
                    );
                  }
                }

                return (
                  <span key={`part-${paragraphIndex}-${partIdx}`}>{subNodes}</span>
                );
              })}
            </p>
          </div>
        );
      }

      const ranges: { questionId: number; questionIndex: number; start: number; end: number }[] = [];

      // 1. Evidence from summaryGroup blanks (Questions 1–7)
      if (courseware.summaryGroup) {
        courseware.summaryGroup.items.forEach((item, itemIdx) => {
          item.evidenceRanges.forEach((range) => {
            if (range.paragraphIndex === paragraphIndex) {
              ranges.push({
                questionId: item.id,
                questionIndex: itemIdx,
                start: range.startOffset,
                end: range.endOffset,
              });
            }
          });
        });
      }

      // 2. Evidence from standalone questions
      const summaryCount = courseware.summaryGroup ? courseware.summaryGroup.items.length : 0;
      courseware.questions.forEach((q, qIdx) => {
        if (!courseware.summaryGroup?.items.some((it) => it.id === q.id)) {
          q.evidenceRanges.forEach((range) => {
            if (range.paragraphIndex === paragraphIndex) {
              ranges.push({
                questionId: q.id,
                questionIndex: summaryCount + qIdx,
                start: range.startOffset,
                end: range.endOffset,
              });
            }
          });
        }
      });

      // 3. User annotations for this paragraph
      const annots = (courseware.annotations || []).filter(
        (a) =>
          a.paragraphIndex === paragraphIndex &&
          a.startOffset >= 0 &&
          a.endOffset <= paragraphText.length &&
          a.startOffset < a.endOffset
      );

      if (ranges.length === 0 && annots.length === 0) {
        return (
          <div
            key={paragraphIndex}
            data-paragraph-index={paragraphIndex}
            ref={(el) => {
              if (el) paragraphRefs.current.set(paragraphIndex, el);
            }}
            className="relative flex items-start gap-4 mb-6 group"
          >
            <span className="shrink-0 w-8 text-right font-mono text-xs text-slate-300 select-none pt-1 group-hover:text-slate-400 transition-colors">
              P{paragraphIndex + 1}
            </span>
            <p className="flex-1 leading-relaxed text-slate-800 tracking-normal text-justify select-text">
              {paragraphText}
            </p>
          </div>
        );
      }

      // Collect all interval boundaries
      const pointsSet = new Set<number>([0, paragraphText.length]);
      ranges.forEach((r) => {
        pointsSet.add(Math.max(0, Math.min(paragraphText.length, r.start)));
        pointsSet.add(Math.max(0, Math.min(paragraphText.length, r.end)));
      });
      annots.forEach((a) => {
        pointsSet.add(Math.max(0, Math.min(paragraphText.length, a.startOffset)));
        pointsSet.add(Math.max(0, Math.min(paragraphText.length, a.endOffset)));
      });

      const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b);
      const segments: React.ReactNode[] = [];

      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const start = sortedPoints[i];
        const end = sortedPoints[i + 1];
        if (start >= end) continue;

        const sliceText = paragraphText.slice(start, end);
        const activeRange = ranges.find((r) => start >= r.start && end <= r.end);
        const activeAnnot = annots.find((a) => start >= a.startOffset && end <= a.endOffset);

        const isRangeStart = activeRange && start === activeRange.start;
        const isAnnotEnd = activeAnnot && end === activeAnnot.endOffset;

        if (!activeRange && !activeAnnot) {
          segments.push(
            <span key={`txt-${paragraphIndex}-${start}-${end}`}>{sliceText}</span>
          );
        } else if (activeAnnot && !activeRange) {
          // Pure user annotation highlight
          const conciseMeaning = isAnnotEnd ? getConciseAnnotationMeaning(activeAnnot) : '';
          segments.push(
            <span
              key={`annot-${paragraphIndex}-${activeAnnot.id}-${start}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
              }}
              title={activeAnnot.note ? `笔记: ${activeAnnot.note}` : '点击查看/编辑笔记、AI 释义与翻译'}
              className="cursor-pointer transition-all duration-150 rounded-xs select-text hover:opacity-90 inline"
              style={{
                backgroundColor: activeAnnot.color,
                borderBottom: `2px solid ${activeAnnot.color}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                padding: '1px 2px',
              }}
            >
              <span>{sliceText}</span>
              {isAnnotEnd && conciseMeaning && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }}
                  title={`批注 (点击查看详情): ${activeAnnot.note || activeAnnot.aiAnalysis?.contextualMeaning.definition || activeAnnot.aiTranslation?.translation || ''}`}
                  className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 rounded-md text-[11px] font-sans font-medium border shadow-2xs select-none cursor-pointer transition-transform hover:scale-105 align-baseline bg-white/95"
                  style={{
                    borderColor: activeAnnot.color,
                    color: '#1e293b',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeAnnot.color }} />
                  <span>[{conciseMeaning}]</span>
                </span>
              )}
            </span>
          );
        } else if (activeRange && !activeAnnot) {
          // Pure evidence range
          const color = getQuestionColor(activeRange.questionId - 1);
          const isActive = activeQuestionId === activeRange.questionId;

          segments.push(
            <span
              key={`ev-${paragraphIndex}-${activeRange.questionId}-${start}`}
              ref={(el) => {
                if (isRangeStart && el) registerEvidenceRef(activeRange.questionId, el);
              }}
              onClick={() => onEvidenceClick(activeRange.questionId)}
              title={
                areAnswersShown
                  ? `第 ${activeRange.questionId} 题对应依据原句（点击跳转）`
                  : `点击查看第 ${activeRange.questionId} 题`
              }
              className={`cursor-pointer transition-all duration-150 inline rounded-md select-text ${
                areAnswersShown || isActive
                  ? isActive
                    ? 'shadow-2xs'
                    : 'hover:opacity-90'
                  : 'hover:bg-slate-100/60 rounded-xs'
              }`}
              style={
                areAnswersShown || isActive
                  ? {
                      color: color.primary,
                      fontWeight: 700,
                      backgroundColor: isActive ? color.bgLight : 'transparent',
                      boxShadow: isActive ? `0 0 0 2px ${color.border}` : undefined,
                      padding: isActive ? '1px 4px' : undefined,
                      textDecoration: isActive ? 'underline' : 'none',
                      textDecorationColor: color.border,
                      textDecorationThickness: '2px',
                    }
                  : {}
              }
            >
              {(areAnswersShown || isActive) && isRangeStart && (
                <span
                  className="inline-flex items-center justify-center rounded text-white text-[10px] font-black mr-1 shadow-2xs select-none"
                  style={{
                    backgroundColor: color.primary,
                    padding: '0 4px',
                    height: '16px',
                    lineHeight: '16px',
                    verticalAlign: '1px',
                  }}
                >
                  Q{activeRange.questionId}
                </span>
              )}
              <span>{sliceText}</span>
            </span>
          );
        } else if (activeRange && activeAnnot) {
          // Overlap: both evidence range and user annotation
          const color = getQuestionColor(activeRange.questionId - 1);
          const isActive = activeQuestionId === activeRange.questionId;
          const conciseMeaning = isAnnotEnd ? getConciseAnnotationMeaning(activeAnnot) : '';

          segments.push(
            <span
              key={`ev-annot-${paragraphIndex}-${activeRange.questionId}-${activeAnnot.id}-${start}`}
              ref={(el) => {
                if (isRangeStart && el) registerEvidenceRef(activeRange.questionId, el);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
              }}
              title={`笔记标记 (点击查看/编辑笔记、AI 释义与翻译) · 亦为 Q${activeRange.questionId} 原文依据`}
              className="cursor-pointer transition-all duration-150 inline rounded-md select-text hover:opacity-90"
              style={{
                color: areAnswersShown || isActive ? color.primary : undefined,
                fontWeight: areAnswersShown || isActive ? 700 : 600,
                backgroundColor: activeAnnot.color,
                borderBottom: `2px solid ${activeAnnot.color}`,
                boxShadow: isActive ? `0 0 0 2px ${color.border}` : undefined,
                padding: '1px 2px',
              }}
            >
              {(areAnswersShown || isActive) && isRangeStart && (
                <span
                  className="inline-flex items-center justify-center rounded text-white text-[10px] font-black mr-1 shadow-2xs select-none"
                  style={{
                    backgroundColor: color.primary,
                    padding: '0 4px',
                    height: '16px',
                    lineHeight: '16px',
                    verticalAlign: '1px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEvidenceClick(activeRange.questionId);
                  }}
                >
                  Q{activeRange.questionId}
                </span>
              )}
              <span>{sliceText}</span>
              {isAnnotEnd && conciseMeaning && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAnnotation?.(activeAnnot, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }}
                  title={`批注 (点击查看详情): ${activeAnnot.note || activeAnnot.aiAnalysis?.contextualMeaning.definition || activeAnnot.aiTranslation?.translation || ''}`}
                  className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 rounded-md text-[11px] font-sans font-medium border shadow-2xs select-none cursor-pointer transition-transform hover:scale-105 align-baseline bg-white/95"
                  style={{
                    borderColor: activeAnnot.color,
                    color: '#1e293b',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeAnnot.color }} />
                  <span>[{conciseMeaning}]</span>
                </span>
              )}
            </span>
          );
        }
      }

      return (
        <div
          key={paragraphIndex}
          data-paragraph-index={paragraphIndex}
          ref={(el) => {
            if (el) paragraphRefs.current.set(paragraphIndex, el);
          }}
          className="relative flex items-start gap-4 mb-6 group"
        >
          <span className="shrink-0 w-8 text-right font-mono text-xs text-slate-300 select-none pt-1 group-hover:text-slate-400 transition-colors">
            P{paragraphIndex + 1}
          </span>
          <p className="flex-1 leading-relaxed text-slate-800 tracking-normal text-justify select-text">
            {segments}
          </p>
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col bg-white overflow-hidden relative">
        {/* Card Header matching reference screenshot */}
        <div className="px-5 py-3 border-b border-[#f0ebd9] bg-[#fdfbf7] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shrink-0 shadow-2xs"></span>
            <span className="font-extrabold text-xs text-[#7c2d12] tracking-tight">
              原文 · {isClozeCw ? '点击空格可定位题目' : '点击句子可定位题目'}
            </span>
            <span className="text-stone-300">|</span>
            <span className="text-xs text-stone-600">
              选中文字可 <span className="font-bold text-[#ea580c]">高亮 / 批注</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {courseware.annotations && courseware.annotations.length > 0 && (
              <span className="text-[11px] font-semibold text-[#9a3412] bg-[#fef3c7]/70 border border-[#fde68a] px-2 py-0.5 rounded-full shadow-2xs">
                📝 批注 {courseware.annotations.length} 处
              </span>
            )}
            <span className="text-[11px] text-stone-400">
              共 {totalWords} 词
            </span>
          </div>
        </div>

        {/* Scrollable Article Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto custom-scrollbar bg-white p-6 md:p-8"
        >
          {/* Article Header (Title & Subtitle) */}
          <div className="pb-5 mb-6 border-b border-stone-100">
            <h2
              className="font-extrabold text-stone-900 tracking-tight leading-snug"
              style={{ fontSize: `${fontSize + 5}px` }}
            >
              {courseware.title}
            </h2>

            {courseware.subtitle && (
              <p
                className="mt-1.5 text-stone-500 font-medium"
                style={{ fontSize: `${Math.max(13, fontSize - 3)}px` }}
              >
                {courseware.subtitle}
              </p>
            )}
          </div>

          {/* Article Body */}
          <article
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: LINE_HEIGHT_RATIO,
              letterSpacing: LETTER_SPACING,
            }}
            className="text-stone-800 selection:bg-amber-100 selection:text-amber-950 font-normal"
          >
            {courseware.paragraphs.map((p, i) => renderParagraph(p, i))}
          </article>

          {/* Bottom Usage Tips Card matching screenshot */}
          <div className="mt-12 pt-4 border-t border-[#f0ebd9] text-xs text-stone-500 space-y-1.5 leading-relaxed bg-[#fdfbf7]/90 rounded-xl p-3.5 border border-[#ede7dc]">
            <div className="flex items-start gap-1.5 text-[11px]">
              <span className="shrink-0 select-none text-amber-600">💡</span>
              <div>
                <span className="font-bold text-stone-700">用法: </span>
                <span className="inline-block px-1.5 py-0.2 bg-[#f4efe6] border border-[#e5dfd3] rounded text-[10px] font-semibold text-stone-700 mx-0.5">点击空格</span> 跳到对应题目；
                <span className="inline-block px-1.5 py-0.2 bg-[#f4efe6] border border-[#e5dfd3] rounded text-[10px] font-semibold text-stone-700 mx-0.5">点击题目</span> 回到原文依据；
                <span className="inline-block px-1.5 py-0.2 bg-[#f4efe6] border border-[#e5dfd3] rounded text-[10px] font-semibold text-stone-700 mx-0.5">划选文字</span> 可高亮或直接写批注——批注紧跟原文文字显示，随时点击可改或删除。
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-stone-400">
              <span className="shrink-0 select-none text-stone-500">🅰</span>
              <div>字号可用右上角 A- / A+ 调节，文章与习题栏宽可按住中线自由缩放拖拽。</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ArticlePanel.displayName = 'ArticlePanel';
