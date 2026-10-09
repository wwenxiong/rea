import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Courseware } from '../types';
import { getQuestionColor } from '../constants/colors';
import { LINE_HEIGHT_RATIO, LETTER_SPACING } from '../constants/design';

interface ArticlePanelProps {
  courseware: Courseware;
  fontSize: number;
  areAnswersShown: boolean;
  activeQuestionId: number | null;
  onEvidenceClick: (questionId: number) => void;
}

export interface ArticlePanelHandle {
  scrollToEvidence: (questionId: number) => void;
}

export const ArticlePanel = forwardRef<ArticlePanelHandle, ArticlePanelProps>(
  ({ courseware, fontSize, areAnswersShown, activeQuestionId, onEvidenceClick }, ref) => {
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

      // Determine element to center in screen:
      // If the paragraph fits comfortably (height <= 75% of viewport), center the whole paragraph!
      // Otherwise, center the exact evidence sentence so it is right at the vertical center of the screen!
      const elementToCenter =
        targetParagraph.clientHeight <= container.clientHeight * 0.75
          ? targetParagraph
          : targetEl;

      const targetRect = elementToCenter.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Current distance from top of container viewport to element
      const relativeTop = targetRect.top - containerRect.top;
      // Scroll offset that centers element vertically in container
      const targetScrollTop =
        container.scrollTop + relativeTop - container.clientHeight / 2 + targetRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });

      // Add visual pulse highlight
      targetEl.classList.add('highlight-pulse');
      setTimeout(() => targetEl?.classList.remove('highlight-pulse'), 1800);
    }, [courseware]);

    const performScroll = useCallback((questionId: number) => {
      // Small timeout ensures DOM rendering and layout calculation are complete
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

    // Count words approximately
    const totalWords = courseware.paragraphs.reduce((acc, p) => {
      const words = p.trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);

    const renderParagraph = (paragraphText: string, paragraphIndex: number) => {
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
        // Skip if question is already part of summary items
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

      if (ranges.length === 0) {
        return (
          <div
            key={paragraphIndex}
            ref={(el) => {
              if (el) paragraphRefs.current.set(paragraphIndex, el);
            }}
            className="relative flex items-start gap-4 mb-6 group"
          >
            <span className="shrink-0 w-8 text-right font-mono text-xs text-slate-300 select-none pt-1 group-hover:text-slate-400 transition-colors">
              P{paragraphIndex + 1}
            </span>
            <p className="flex-1 leading-relaxed text-slate-800 tracking-normal text-justify">
              {paragraphText}
            </p>
          </div>
        );
      }

      ranges.sort((a, b) => a.start - b.start);

      const segments: React.ReactNode[] = [];
      let lastEnd = 0;

      ranges.forEach((range, i) => {
        if (range.start > lastEnd) {
          segments.push(
            <span key={`text-${paragraphIndex}-${i}`}>
              {paragraphText.slice(lastEnd, range.start)}
            </span>
          );
        }

        const color = getQuestionColor(range.questionId - 1);
        const isActive = activeQuestionId === range.questionId;

        if (areAnswersShown) {
          // All 1-to-1 correspondences: bold text, unique colors, NO background, Q badges!
          segments.push(
            <span
              key={`ev-${paragraphIndex}-${range.questionId}`}
              ref={(el) => registerEvidenceRef(range.questionId, el)}
              onClick={() => onEvidenceClick(range.questionId)}
              title={`第 ${range.questionId} 题对应依据原句（点击跳转）`}
              className={`cursor-pointer transition-all duration-150 inline rounded-xs select-text ${
                isActive ? 'ring-2 ring-offset-1 ring-slate-400' : 'hover:opacity-85'
              }`}
              style={{
                color: color.primary,
                fontWeight: 800,
                backgroundColor: 'transparent',
                ...(isActive ? { textDecoration: 'underline', textDecorationThickness: '2px' } : {}),
              }}
            >
              {/* Question Number Badge */}
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
                Q{range.questionId}
              </span>
              <span>{paragraphText.slice(range.start, range.end)}</span>
            </span>
          );
        } else if (isActive) {
          // If answers hidden, but question clicked: highlight that specific question
          segments.push(
            <span
              key={`ev-${paragraphIndex}-${range.questionId}`}
              ref={(el) => registerEvidenceRef(range.questionId, el)}
              onClick={() => onEvidenceClick(range.questionId)}
              title={`第 ${range.questionId} 题对应依据原句`}
              className="cursor-pointer transition-all duration-150 inline rounded-xs select-text ring-2 ring-offset-1 ring-slate-400 underline decoration-2"
              style={{
                color: color.primary,
                fontWeight: 800,
                backgroundColor: 'transparent',
              }}
            >
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
                Q{range.questionId}
              </span>
              <span>{paragraphText.slice(range.start, range.end)}</span>
            </span>
          );
        } else {
          // When answers hidden: restore plain unbolded, uncolored text!
          segments.push(
            <span
              key={`ev-${paragraphIndex}-${range.questionId}`}
              ref={(el) => registerEvidenceRef(range.questionId, el)}
              onClick={() => onEvidenceClick(range.questionId)}
              title={`点击查看第 ${range.questionId} 题`}
              className="cursor-pointer transition-colors duration-150 hover:bg-slate-100/60 rounded-xs"
            >
              {paragraphText.slice(range.start, range.end)}
            </span>
          );
        }

        lastEnd = range.end;
      });

      if (lastEnd < paragraphText.length) {
        segments.push(
          <span key={`text-${paragraphIndex}-end`}>
            {paragraphText.slice(lastEnd)}
          </span>
        );
      }

      return (
        <div
          key={paragraphIndex}
          ref={(el) => {
            if (el) paragraphRefs.current.set(paragraphIndex, el);
          }}
          className="relative flex items-start gap-4 mb-6 group"
        >
          <span className="shrink-0 w-8 text-right font-mono text-xs text-slate-300 select-none pt-1 group-hover:text-slate-400 transition-colors">
            P{paragraphIndex + 1}
          </span>
          <p className="flex-1 leading-relaxed text-slate-800 tracking-normal text-justify">
            {segments}
          </p>
        </div>
      );
    };

    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto custom-scrollbar bg-white"
        style={{ padding: '36px 48px 64px 40px' }}
      >
        {/* Article Header */}
        <div className="pb-6 mb-8 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600">
              文章精读
            </span>
            <span className="text-xs text-slate-400">
              约 {totalWords} 词 · {courseware.paragraphs.length} 个自然段
            </span>
          </div>

          <h2
            className="font-extrabold text-slate-900 tracking-tight leading-snug"
            style={{ fontSize: `${fontSize + 6}px` }}
          >
            {courseware.title}
          </h2>

          {courseware.subtitle && (
            <p
              className="mt-2 text-slate-500 font-medium"
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
          className="text-slate-800 selection:bg-slate-200"
        >
          {courseware.paragraphs.map((p, i) => renderParagraph(p, i))}
        </article>
      </div>
    );
  }
);

ArticlePanel.displayName = 'ArticlePanel';
