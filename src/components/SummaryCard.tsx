import React, { useState, useEffect, useMemo } from 'react';
import type { SummaryGroup } from '../types';
import { getQuestionColor } from '../constants/colors';
import { resolveSummaryWord, parseWordBankOptions, extractWordBankFromPassage } from '../utils/summaryWordBank';

interface SummaryCardProps {
  summaryGroup: SummaryGroup;
  paragraphs?: string[];
  activeQuestionId: number | null;
  areAnswersShown: boolean;
  fontSize?: number;
  onSelectBlank: (id: number) => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summaryGroup,
  paragraphs = [],
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
      setUserRevealed((prev) => ({ ...prev, [id]: !isBlankRevealed(id) }));
      onSelectBlank(id);
    } else {
      setUserRevealed((prev) => ({ ...prev, [id]: true }));
      onSelectBlank(id);
    }
  };

  // Parse word bank items (A, B, C... and words), auto-extracting from passage/answers if missing
  const wordBankItems = useMemo(() => {
    let items = parseWordBankOptions(summaryGroup.paragraphGuide || summaryGroup.wordBankAnalysis);
    if (items.length === 0 && summaryGroup.items && summaryGroup.items.length > 0) {
      const autoWordBankStr = extractWordBankFromPassage(summaryGroup, paragraphs);
      if (autoWordBankStr) {
        items = parseWordBankOptions(autoWordBankStr);
      }
    }
    return items;
  }, [summaryGroup, paragraphs]);

  const hasWordBank = wordBankItems.length > 0;

  const renderParagraphGuide = (guide: string) => {
    if (guide.startsWith('备选词表:') || hasWordBank) {
      return (
        <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs text-slate-700 font-sans shadow-2xs space-y-2">
          {/* Header */}
          <div className="font-bold text-slate-800 flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              <span>备选词表 (Word Bank):</span>
            </div>
            <span className="text-[11px] font-normal text-slate-500">共 {wordBankItems.length} 个备选词</span>
          </div>

          {/* Word Bank Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-0.5">
            {wordBankItems.map((item, idx) => {
              // Check if this word corresponds to the currently active question
              const activeItem = currentDisplayItem;
              const isMatchedActiveQuestion =
                activeItem &&
                (resolveSummaryWord(activeItem.answer || '', summaryGroup).toLowerCase() === item.word.toLowerCase() ||
                  (activeItem.answer || '').toUpperCase().startsWith(item.letter));

              return (
                <div
                  key={idx}
                  className={`px-2.5 py-1.5 bg-white border rounded-lg text-left shadow-2xs text-slate-800 font-medium text-[12px] flex items-center gap-2 transition-all select-none ${
                    isMatchedActiveQuestion
                      ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                    {item.letter}
                  </span>
                  <span className="truncate font-semibold text-slate-900">{item.word}</span>
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
      <p key={pIdx} className="leading-loose text-slate-800 text-justify mb-4 select-text">
        {parts.map((part, idx) => {
          const matchNum = part.match(/\d+/);
          if (matchNum) {
            const blankId = parseInt(matchNum[0], 10);
            const item = summaryGroup.items.find((it) => it.id === blankId);
            if (item) {
              const isSelected = activeId === blankId;
              const isRevealed = isBlankRevealed(blankId);
              const color = getQuestionColor(blankId - 1);
              // Resolve raw answer into clean English word, avoiding single letter/number code
              const resolvedWord = resolveSummaryWord(item.answer || '', summaryGroup);

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
                      ? 'shadow-2xs'
                      : isRevealed
                      ? 'bg-slate-50/80 hover:bg-slate-100 border-slate-300'
                      : 'hover:bg-slate-100/80 hover:border-slate-400 text-slate-600 border-slate-300'
                  }`}
                  style={{
                    backgroundColor: isSelected ? color.bgLight : undefined,
                    boxShadow: isSelected ? `0 0 0 2px ${color.border}` : undefined,
                    borderBottomColor: isRevealed || isSelected ? color.primary : undefined,
                    borderColor: isRevealed || isSelected ? color.primary : undefined,
                    minWidth: isRevealed ? 'auto' : '48px',
                  }}
                >
                  {isRevealed ? (
                    <span className="inline-flex items-center gap-1.5 animate-fadeIn">
                      <span
                        className="text-xs font-mono font-black underline decoration-2 mr-0.5"
                        style={{ color: color.primary }}
                      >
                        {blankId}
                      </span>
                      <span
                        className="font-extrabold tracking-wide text-[13px] px-1 py-0.2 rounded"
                        style={{
                          color: color.primary,
                          backgroundColor: `${color.bgLight}`,
                        }}
                      >
                        {resolvedWord || '____'}
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
    <div className="bg-white rounded-2xl border border-[#ede7dc] shadow-2xs p-5 space-y-4 mb-5 overflow-hidden transition-all">
      {/* Title & Instructions (matching Image 2 header) */}
      <div className="border-b border-[#f0ebd9] pb-3">
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

      {/* Paragraph Guide / Word Bank */}
      {(summaryGroup.paragraphGuide || hasWordBank) && renderParagraphGuide(summaryGroup.paragraphGuide || '')}

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

      {/* Interactive Answer & Analysis Card (matches item macaron color) */}
      {currentDisplayItem && (() => {
        const paraIndex = currentDisplayItem.evidenceRanges?.[0]?.paragraphIndex;
        const paraNumStr = paraIndex != null ? `段落 ${paraIndex + 1}` : '';
        const itemColor = getQuestionColor(currentDisplayItem.id - 1);
        const resolvedWord = resolveSummaryWord(currentDisplayItem.answer || '', summaryGroup);

        return (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div
              className="rounded-r-xl p-4 space-y-2.5 shadow-2xs border-l-4 transition-colors"
              style={{
                backgroundColor: itemColor.bgLight,
                borderLeftColor: itemColor.primary,
              }}
            >
              {/* Header: Answer badge pill + answer text (directly word, no code) */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span
                    className="bg-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs"
                    style={{
                      border: `1px solid ${itemColor.primary}`,
                      color: itemColor.primary,
                    }}
                  >
                    答案 {currentDisplayItem.id}
                  </span>
                  <span
                    className="font-extrabold text-base tracking-wide"
                    style={{ color: itemColor.primary }}
                  >
                    {resolvedWord || '（暂无）'}
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
                  className="text-[11px] underline font-semibold cursor-pointer"
                  style={{ color: itemColor.primary }}
                >
                  {isBlankRevealed(currentDisplayItem.id) ? '隐藏文中答案' : '显示文中答案'}
                </button>
              </div>

              {/* Evidence location */}
              {currentDisplayItem.evidenceText && (
                <div className="text-xs leading-relaxed text-slate-800 flex items-start gap-1.5">
                  <span className="font-bold shrink-0" style={{ color: itemColor.primary }}>定位依据：</span>
                  <p className="text-slate-700">
                    {paraNumStr && (
                      <span className="font-extrabold mr-1.5" style={{ color: itemColor.primary }}>
                        ▶ {paraNumStr}
                      </span>
                    )}
                    <span className="italic">"{currentDisplayItem.evidenceText}"</span>
                  </p>
                </div>
              )}

              {/* Detailed Explanation */}
              {currentDisplayItem.explanation && (
                <div
                  className="text-xs leading-relaxed text-slate-800 flex items-start gap-1.5 pt-1.5 border-t"
                  style={{ borderTopColor: itemColor.border }}
                >
                  <span className="font-bold shrink-0" style={{ color: itemColor.primary }}>试题解析：</span>
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
