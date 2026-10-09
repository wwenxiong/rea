import React, { useState, useEffect } from 'react';
import type { SummaryGroup } from '../types';
import { getQuestionColor } from '../constants/colors';

interface SummaryCardProps {
  summaryGroup: SummaryGroup;
  activeQuestionId: number | null;
  areAnswersShown: boolean;
  fontSize?: number;
  onSelectBlank: (id: number) => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summaryGroup,
  activeQuestionId,
  areAnswersShown,
  fontSize = 18,
  onSelectBlank,
}) => {
  const [userRevealed, setUserRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!areAnswersShown) {
      setUserRevealed({});
    }
  }, [areAnswersShown]);

  const activeId =
    activeQuestionId && summaryGroup.items.some((it) => it.id === activeQuestionId)
      ? activeQuestionId
      : null;

  const currentDisplayItem = activeId
    ? summaryGroup.items.find((item) => item.id === activeId)
    : null;

  const isBlankRevealed = (id: number) => {
    if (userRevealed[id] !== undefined) return userRevealed[id];
    return areAnswersShown || activeId === id;
  };

  const handleBlankClick = (id: number) => {
    if (activeId === id) {
      setUserRevealed((prev) => ({ ...prev, [id]: false }));
      onSelectBlank(id);
    } else {
      setUserRevealed((prev) => ({ ...prev, [id]: true }));
      onSelectBlank(id);
    }
  };

  const renderParagraphGuide = (guide: string) => {
    if (guide.startsWith('备选词表:')) {
      const rawOptions = guide
        .replace(/^备选词表:\s*/, '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      return (
        <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs text-slate-700 font-sans shadow-2xs space-y-2">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            <span>备选词表 (Word Bank):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-0.5">
            {rawOptions.map((opt, idx) => {
              const letterMatch = opt.match(/^([A-Z])[\s.\)]*(.*)/i);
              const letter = letterMatch ? letterMatch[1].toUpperCase() : '';
              const text = letterMatch ? letterMatch[2].trim() : opt;
              return (
                <div
                  key={idx}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs text-slate-800 font-medium text-[12px] flex items-center gap-2 transition-colors"
                >
                  {letter && (
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                      {letter}
                    </span>
                  )}
                  <span className="truncate">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Standard pattern: 第1、2题 → 段落 2 (Alex Ayad) | ...
    const sections = guide.split('|');
    return (
      <div className="p-3 bg-slate-50/90 border border-dashed border-slate-300 rounded-xl text-xs text-slate-700 leading-relaxed font-sans shadow-2xs">
        <span className="font-bold text-slate-800 mr-1.5">段落定位引导:</span>
        {sections.map((sec, idx) => {
          const parts = sec.split(/(段落\s*\d+)/);
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="mx-2 text-slate-300 select-none">|</span>}
              <span>
                {parts.map((p, pIdx) => {
                  if (/段落\s*\d+/.test(p)) {
                    return (
                      <span
                        key={pIdx}
                        className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px] mx-1 shadow-2xs"
                      >
                        {p}
                      </span>
                    );
                  }
                  return <span key={pIdx}>{p}</span>;
                })}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderParagraphWithBlanks = (text: string, pIdx: number) => {
    // Normalize any "1 ...." or "1 ______" into "[1]"
    const normalized = text.replace(/\b([1-9]\d*)\s*(?:[\._]{2,})/g, '[$1]');
    // Split on [1], [2], etc.
    const parts = normalized.split(/(\[\s*\d+\s*\])/g);

    return (
      <p key={pIdx} className="leading-loose text-slate-800 text-justify mb-4">
        {parts.map((part, idx) => {
          const matchNum = part.match(/\d+/);
          if (matchNum) {
            const blankId = parseInt(matchNum[0], 10);
            const item = summaryGroup.items.find((it) => it.id === blankId);
            if (item) {
              const isSelected = activeId === blankId;
              const isRevealed = isBlankRevealed(blankId);
              const color = getQuestionColor(blankId - 1);

              return (
                <span
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlankClick(blankId);
                  }}
                  title={`点击查看第 ${blankId} 题答案解析并定位原文`}
                  className={`inline-flex items-center justify-center align-baseline cursor-pointer transition-all duration-150 select-none mx-1 px-2.5 py-0.5 rounded border-b-2 font-bold ${
                    isSelected
                      ? 'ring-2 ring-offset-1 bg-red-50'
                      : isRevealed
                      ? 'bg-slate-50/80 hover:bg-slate-100 border-slate-300'
                      : 'hover:bg-slate-100/80 hover:border-slate-400 text-slate-600 border-slate-300'
                  }`}
                  style={{
                    borderBottomColor: isRevealed ? color.primary : undefined,
                    borderColor: isRevealed ? color.primary : undefined,
                    minWidth: isRevealed ? 'auto' : '48px',
                  }}
                >
                  {isRevealed ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="text-xs font-mono font-black underline decoration-2 mr-0.5"
                        style={{ color: color.primary }}
                      >
                        {blankId}
                      </span>
                      <span
                        className="font-extrabold tracking-wide text-[13px] animate-fadeIn"
                        style={{ color: color.primary }}
                      >
                        {item.answer || '____'}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1 text-slate-500 font-bold text-xs">
                      <span className="text-slate-400 font-mono text-[11px] mr-1">{blankId}</span>
                      <span className="text-slate-400 tracking-widest font-normal">____</span>
                    </span>
                  )}
                </span>
              );
            }
          }
          return <span key={idx}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 mb-5 overflow-hidden transition-all">
      {/* Title & Instructions (matching Image 2 header) */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Questions {summaryGroup.idRange}</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            摘要填空 (Summary)
          </span>
        </h3>
        <p className="text-xs text-slate-600 italic mt-1.5 font-serif leading-relaxed">
          {summaryGroup.instruction || 'Complete the summary below.'}
        </p>
      </div>

      {/* Paragraph Guide box matching Image 2 */}
      {summaryGroup.paragraphGuide && renderParagraphGuide(summaryGroup.paragraphGuide)}

      {/* Optional Summary Heading */}
      {summaryGroup.title && (
        <div className="py-1 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-center">
          <h4 className="text-sm font-bold text-slate-800 tracking-wide">{summaryGroup.title}</h4>
        </div>
      )}

      {/* Summary Passage Body with Clickable Blanks */}
      <div
        className="pt-1 text-slate-800 font-normal selection:bg-red-100 leading-loose"
        style={{ fontSize: `${Math.max(14, fontSize - 2)}px` }}
      >
        {summaryGroup.paragraphs.map((para, i) => renderParagraphWithBlanks(para, i))}
      </div>

      {/* Interactive Answer & Analysis Card (Matches Image 2 bottom drawer) */}
      {currentDisplayItem && (() => {
        const paraIndex = currentDisplayItem.evidenceRanges?.[0]?.paragraphIndex;
        const paraNumStr = paraIndex != null ? `段落 ${paraIndex + 1}` : '';

        return (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="bg-[#fef2f2] border-l-4 border-red-500 rounded-r-xl p-4 space-y-2.5 shadow-2xs">
              {/* Header: Answer badge pill + answer text */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="bg-white border border-red-500 text-red-600 font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                    答案 {currentDisplayItem.id}
                  </span>
                  <span className="text-red-700 font-extrabold text-sm tracking-wide">
                    {currentDisplayItem.answer || '（暂无）'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setUserRevealed((prev) => ({
                      ...prev,
                      [currentDisplayItem.id]: !isBlankRevealed(currentDisplayItem.id),
                    }))
                  }
                  className="text-[11px] text-red-600 hover:text-red-800 underline font-semibold cursor-pointer"
                >
                  {isBlankRevealed(currentDisplayItem.id) ? '隐藏文中答案' : '显示文中答案'}
                </button>
              </div>

              {/* Evidence location matching Image 2 */}
              {currentDisplayItem.evidenceText && (
                <div className="text-xs leading-relaxed text-slate-800 flex items-start gap-1.5">
                  <span className="text-red-600 font-bold shrink-0">定位依据：</span>
                  <p className="text-slate-700">
                    {paraNumStr && (
                      <span className="text-blue-700 font-extrabold mr-1.5">
                        ▶ {paraNumStr}
                      </span>
                    )}
                    <span className="italic">{currentDisplayItem.evidenceText}</span>
                  </p>
                </div>
              )}

              {/* Detailed Explanation matching Image 2 */}
              {currentDisplayItem.explanation && (
                <div className="text-xs leading-relaxed text-slate-800 flex items-start gap-1.5 pt-1.5 border-t border-red-200/50">
                  <span className="text-red-600 font-bold shrink-0">试题解析：</span>
                  <p className="text-slate-700 leading-normal">{currentDisplayItem.explanation}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
