import type { Courseware } from '../types';
import { getQuestionColor } from '../constants/colors';
import { resolveSummaryWord, buildWordBankAnalysis, parseWordBankOptions, extractWordBankFromPassage } from './summaryWordBank';
import { getConciseAnnotationMeaning } from './textSelectionUtils';

/**
 * Generates and downloads a self-contained, fully interactive static HTML file
 * representing the reading comprehension courseware.
 */
export function exportCoursewareToHTML(courseware: Courseware, initialFontSize: number = 18): void {
  const title = courseware.title || '阅读理解精读课件';
  const subtitle = courseware.subtitle || '双栏互动精读课件';
  const safeFontSize = Math.min(28, Math.max(14, initialFontSize || 18));

  // Build safe filename
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'courseware';
  const fileName = `${safeTitle}-精读课件.html`;

  // Pre-collect all questions and summary items
  const allQuestionsMap = new Map<number, {
    id: number;
    answer: string;
    evidenceText: string;
    explanation: string;
  }>();

  if (courseware.summaryGroup) {
    for (const it of courseware.summaryGroup.items) {
      allQuestionsMap.set(it.id, {
        id: it.id,
        answer: it.answer || '',
        evidenceText: it.evidenceText || '',
        explanation: it.explanation || '',
      });
    }
  }

  for (const q of courseware.questions) {
    if (!allQuestionsMap.has(q.id)) {
      allQuestionsMap.set(q.id, {
        id: q.id,
        answer: q.answer || '',
        evidenceText: q.evidenceText || '',
        explanation: q.explanation || '',
      });
    }
  }

  const sortedItems = Array.from(allQuestionsMap.values()).sort((a, b) => a.id - b.id);

  // Helper to escape HTML characters
  const escapeHtml = (str: string): string =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Prepare highlighted paragraph HTML
  const renderedParagraphs = courseware.paragraphs.map((p, pIdx) => {
    let pContent = escapeHtml(p);

    // Replace Cloze blanks in passage
    const clozePattern = /(_{2,}\s*\d+\s*_{2,}|\[\s*\d+\s*\]|\(\s*\d+\s*\)|（\s*\d+\s*）|\b\d+\s*_{2,}|\b\d+\s*\.{3,})/g;
    pContent = pContent.replace(clozePattern, (matched) => {
      const matchNum = matched.match(/\d+/);
      if (!matchNum) return matched;
      const blankId = parseInt(matchNum[0], 10);
      const targetQ = courseware.questions.find((q) => q.id === blankId);
      if (!targetQ) return matched;
      const color = getQuestionColor(blankId - 1);
      const ans = escapeHtml(targetQ.answer || '____');
      return `<span class="cloze-blank-inline q-blank-${blankId}" data-qid="${blankId}" onclick="toggleQuestion(${blankId})" style="--q-color: ${color.primary}; --q-bg: ${color.bgLight}; --q-border: ${color.border};" title="第 ${blankId} 题空格 · 点击显示答案并定位题目"><span class="blank-num">${blankId}</span><span class="blank-placeholder">____</span><span class="blank-ans">${ans}</span></span>`;
    });

    // Replace evidence text occurrences with data-highlight spans and Q badges
    for (const item of sortedItems) {
      if (item.evidenceText && item.evidenceText.trim()) {
        const cleanEvi = escapeHtml(item.evidenceText.trim());
        const color = getQuestionColor(item.id - 1);
        if (pContent.includes(cleanEvi)) {
          const replacement = `<span class="evidence-span q-evi-${item.id}" data-qid="${item.id}" onclick="toggleQuestion(${item.id})" title="第 ${item.id} 题对应依据原句（点击定位）" style="--q-color: ${color.primary}; --q-bg: ${color.bgLight}; --q-border: ${color.border};"><span class="q-badge-tag">Q${item.id}</span>${cleanEvi}</span>`;
          pContent = pContent.replace(cleanEvi, replacement);
        } else {
          // If cleanEvi is already wrapped in a prior evidence-span (shared evidence text), append badge
          const escapedPattern = cleanEvi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(<span class="evidence-span[^"]*q-evi-[^"]*"[^>]*>)((?:<span class="q-badge-tag"[^>]*>Q\\d+<\\/span>)+)(${escapedPattern}<\\/span>)`);
          if (regex.test(pContent)) {
            pContent = pContent.replace(regex, (_, openTag, existingBadges, closeText) => {
              const updatedOpen = openTag.replace('class="evidence-span', `class="evidence-span q-evi-${item.id}`);
              return `${updatedOpen}${existingBadges}<span class="q-badge-tag" style="background-color: ${color.primary};">Q${item.id}</span>${closeText}`;
            });
          }
        }
      }
    }

    // Apply user annotations if any
    if (courseware.annotations) {
      const pAnnots = courseware.annotations.filter(a => a.paragraphIndex === pIdx && a.text);
      for (const annot of pAnnots) {
        if (pContent.includes(annot.text)) {
          let tooltipParts: string[] = [];
          if (annot.note) tooltipParts.push(`笔记: ${annot.note}`);
          if (annot.aiTranslation) tooltipParts.push(`翻译: ${annot.aiTranslation.translation}`);
          if (annot.aiAnalysis) tooltipParts.push(`释义: [${annot.aiAnalysis.contextualMeaning.pos}] ${annot.aiAnalysis.contextualMeaning.definition}`);
          const noteTitle = tooltipParts.length > 0 ? ` title="${escapeHtml(tooltipParts.join(' | '))}"` : '';
          const conciseMeaning = getConciseAnnotationMeaning(annot);
          const noteBadge = conciseMeaning
            ? `<span class="annot-gloss" style="border-color: ${annot.color};"><span class="annot-dot" style="background-color: ${annot.color};"></span>[${escapeHtml(conciseMeaning)}]</span>`
            : '';
          pContent = pContent.replaceAll(
            annot.text,
            `<mark class="user-annot" style="background-color: ${annot.color}; border-bottom: 2px solid ${annot.color};"${noteTitle}>${annot.text}${noteBadge}</mark>`
          );
        }
      }
    }

    return `
      <div class="paragraph-item" id="para-${pIdx}">
        <span class="para-badge">P${pIdx + 1}</span>
        <p class="para-text">${pContent}</p>
      </div>
    `;
  }).join('\n');

  // Prepare Summary Group HTML if present
  let summaryGroupHtml = '';
  if (courseware.summaryGroup) {
    const sg = courseware.summaryGroup;
    let wordBankHtml = '';
    let wbList = buildWordBankAnalysis(sg);
    if (wbList.length === 0 && sg.items && sg.items.length > 0) {
      const autoWordBankStr = extractWordBankFromPassage(sg, courseware.paragraphs);
      if (autoWordBankStr) {
        wbList = parseWordBankOptions(autoWordBankStr);
      }
    }
    if (wbList.length > 0) {
      wordBankHtml = `
        <div class="word-bank-card">
          <div class="word-bank-title">备选词表 (Word Bank) · 共 ${wbList.length} 词</div>
          <div class="word-bank-grid">
            ${wbList.map(item => `
              <div class="word-chip">
                <span class="chip-letter">${escapeHtml(item.letter)}</span>
                <span class="chip-text">${escapeHtml(item.word)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const summaryParagraphsHtml = sg.paragraphs.map(para => {
      const normalized = para.replace(/\b([1-9]\d*)\s*(?:[\._]{2,})/g, '[$1]');
      const replaced = normalized.replace(/\[\s*(\d+)\s*\]/g, (_, idStr) => {
        const qId = parseInt(idStr, 10);
        const item = sg.items.find(it => it.id === qId);
        const color = getQuestionColor(qId - 1);
        const wordAnswer = item ? resolveSummaryWord(item.answer || '', sg) : '____';
        const ans = escapeHtml(wordAnswer);
        return `<span class="summary-blank-inline q-blank-${qId}" data-qid="${qId}" style="--q-color: ${color.primary};" onclick="toggleQuestion(${qId})" title="点击查看第 ${qId} 题答案解析"><span class="blank-num">${qId}</span><span class="blank-placeholder">____</span><span class="blank-ans">${ans}</span></span>`;
      });
      return `<p class="summary-body-p">${replaced}</p>`;
    }).join('');

    // Render detailed explanation drawers for each summary item
    const sgItemsAnalysisHtml = sg.items.map((rawItem) => {
      // Find possible corresponding question in courseware.questions to ensure fullest data
      const qMatch = courseware.questions.find((q) => q.id === rawItem.id);
      const rawAns = rawItem.answer || qMatch?.answer || '';
      const answer = resolveSummaryWord(rawAns, sg);
      const evidenceText = rawItem.evidenceText || qMatch?.evidenceText || '';
      const explanation = rawItem.explanation || qMatch?.explanation || '';
      const color = getQuestionColor(rawItem.id - 1);

      let paraNumStr = '';
      if (rawItem.evidenceRanges && rawItem.evidenceRanges[0] && rawItem.evidenceRanges[0].paragraphIndex != null) {
        paraNumStr = `段落 ${rawItem.evidenceRanges[0].paragraphIndex + 1} (P${rawItem.evidenceRanges[0].paragraphIndex + 1})`;
      } else if (qMatch?.evidenceRanges && qMatch.evidenceRanges[0] && qMatch.evidenceRanges[0].paragraphIndex != null) {
        paraNumStr = `段落 ${qMatch.evidenceRanges[0].paragraphIndex + 1} (P${qMatch.evidenceRanges[0].paragraphIndex + 1})`;
      } else if (evidenceText) {
        const pIdx = courseware.paragraphs.findIndex(p => p.includes(evidenceText.trim()));
        if (pIdx !== -1) {
          paraNumStr = `段落 ${pIdx + 1} (P${pIdx + 1})`;
        }
      }

      return `
        <div class="summary-item-card" id="qcard-${rawItem.id}" data-qid="${rawItem.id}">
          <div class="qcard-header" onclick="toggleQuestion(${rawItem.id})">
            <div class="q-header-left">
              <span class="q-num-badge" style="background-color: ${color.primary};">${rawItem.id}</span>
              <span class="q-type-badge" style="color: ${color.primary}; border-color: ${color.border}; background-color: ${color.bgLight};">第 ${rawItem.id} 题 · 填空</span>
              <span class="q-hint-label">点击查看解析</span>
              ${answer ? `<span class="q-inline-answer" style="color: ${color.primary};">答案: ${escapeHtml(answer)}</span>` : ''}
            </div>
            <span class="q-toggle-icon">▾</span>
          </div>
          <div class="q-answer-drawer q-ans-drawer-${rawItem.id}">
            ${answer ? `
              <div class="answer-row">
                <span class="ans-badge" style="color: ${color.primary}; border-color: ${color.primary};">
                  正确答案: ${escapeHtml(answer)}
                </span>
              </div>
            ` : ''}
            ${paraNumStr ? `<div class="para-locate-tag">▶ 依据定位：${escapeHtml(paraNumStr)}</div>` : ''}
            ${evidenceText ? `
              <div class="evidence-box" style="border-left-color: ${color.primary};">
                <div class="evi-label" style="color: ${color.primary};">原文定位依据:</div>
                <div class="evi-text">"${escapeHtml(evidenceText)}"</div>
              </div>
            ` : ''}
            ${explanation ? `
              <div class="explanation-box">
                <div class="exp-label">试题解析:</div>
                <div class="exp-text">${escapeHtml(explanation)}</div>
              </div>
            ` : '<div class="explanation-box"><div class="exp-text" style="color: #94a3b8; font-style: italic;">暂无解析</div></div>'}
          </div>
        </div>
      `;
    }).join('\n');

    summaryGroupHtml = `
      <div class="card summary-card">
        <div class="card-header">
          <div class="card-title">Questions ${escapeHtml(sg.idRange)} <span class="badge-tag">摘要填空 (Summary)</span></div>
          <div class="card-subtitle">${escapeHtml(sg.instruction || 'Complete the summary below.')}</div>
        </div>
        ${wordBankHtml}
        ${sg.title ? `<div class="summary-subheading">${escapeHtml(sg.title)}</div>` : ''}
        <div class="summary-body-text">${summaryParagraphsHtml}</div>
        <div class="summary-analysis-section">
          <div class="summary-analysis-title">
            <span>📝 填空题精读解析 (Questions ${escapeHtml(sg.idRange)})</span>
            <span class="analysis-subtitle">点击题目可查看对应原文依据</span>
          </div>
          <div class="summary-items-list">
            ${sgItemsAnalysisHtml}
          </div>
        </div>
      </div>
    `;
  }

  // Prepare standard Questions HTML
  const nonSummaryQuestions = courseware.summaryGroup
    ? courseware.questions.filter(q => !courseware.summaryGroup!.items.some(it => it.id === q.id))
    : courseware.questions;

  const questionsListHtml = nonSummaryQuestions.map(q => {
    const color = getQuestionColor(q.id - 1);
    const optionsHtml = q.options && q.options.length > 0 ? `
      <div class="options-grid">
        ${q.options.map((opt, optIdx) => {
          const trimmed = opt.trim();
          const matchLetter = trimmed.match(/^([A-D])[.、\s]?(.*)/i);
          const letter = matchLetter ? matchLetter[1].toUpperCase() : String.fromCharCode(65 + optIdx);
          const content = matchLetter ? matchLetter[2].trim() : trimmed;
          const cleanCorrectAns = (q.answer || '').trim().charAt(0).toUpperCase();
          const isCorrect = cleanCorrectAns === letter || (q.answer && (q.answer.trim().toLowerCase() === trimmed.toLowerCase() || q.answer.trim().toLowerCase() === content.toLowerCase()));
          return `
            <div class="option-item ${isCorrect ? 'is-correct' : ''}">
              <span class="opt-badge">${letter}</span>
              <span class="opt-text">${escapeHtml(content || trimmed)}</span>
              ${isCorrect ? `<span class="opt-correct-tag">✓ 正确答案</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="card question-card" id="qcard-${q.id}" data-qid="${q.id}">
        <div class="qcard-header" onclick="toggleQuestion(${q.id})">
          <span class="q-num-badge" style="background-color: ${color.primary};">${q.id}</span>
          <div class="q-stem">${escapeHtml(q.stem)}</div>
        </div>
        ${optionsHtml}
        <div class="q-answer-drawer q-ans-drawer-${q.id}">
          ${q.answer ? `<div class="answer-row"><span class="ans-badge" style="color: ${color.primary}; border-color: ${color.primary};">答案: ${escapeHtml(q.answer)}</span></div>` : ''}
          ${q.evidenceText ? `
            <div class="evidence-box" style="border-left-color: ${color.primary};">
              <div class="evi-label" style="color: ${color.primary};">原文定位依据:</div>
              <div class="evi-text">"${escapeHtml(q.evidenceText)}"</div>
            </div>
          ` : ''}
          ${q.explanation ? `
            <div class="explanation-box">
              <div class="exp-label">试题解析:</div>
              <div class="exp-text">${escapeHtml(q.explanation)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  // Prepare Answer Key Pills HTML
  const answerKeyPillsHtml = sortedItems.map(item => {
    const color = getQuestionColor(item.id - 1);
    const isSummaryItem = courseware.summaryGroup?.items.some(it => it.id === item.id);
    const resolvedWord = isSummaryItem && courseware.summaryGroup
      ? resolveSummaryWord(item.answer || '', courseware.summaryGroup)
      : (item.answer || '____');

    return `
      <button type="button" class="key-pill" data-qid="${item.id}" onclick="toggleQuestion(${item.id})"
        style="background-color: ${color.bgLight}; color: ${color.primary}; border-color: ${color.border};">
        <span class="pill-id">${item.id}</span>
        <span class="pill-ans">${escapeHtml(resolvedWord)}</span>
      </button>
    `;
  }).join('\n');

  // Full Standalone HTML Document
  const htmlDoc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 互动精读课件</title>
  <style>
    :root {
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      --bg-workspace: #f8fafc;
      --border-color: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --base-font-size: ${safeFontSize}px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      height: 100vh;
      overflow: hidden;
    }
    body {
      font-family: var(--font-family);
      background-color: var(--bg-workspace);
      color: var(--text-main);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
    }
    /* Header Toolbar */
    .app-header {
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border-color);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      z-index: 50;
    }
    .header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .brand-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: #0f172a; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px;
      flex-shrink: 0;
    }
    .header-title-box { display: flex; flex-direction: column; min-width: 0; }
    .header-title { font-size: 15px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-subtitle { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .btn {
      padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: 1px solid var(--border-color);
      transition: all 0.15s ease; background: white; color: #334155;
    }
    .btn:hover { background: #f1f5f9; }
    .btn-primary { background: #0f172a; color: white; border-color: #0f172a; }
    .btn-primary:hover { background: #1e293b; }
    .btn-toggle-answers { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
    .btn-toggle-answers:hover { background: #e0e7ff; }

    /* Font Size Controls */
    .font-ctrl {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }
    .font-btn {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .font-btn:hover:not(:disabled) {
      background: white;
      color: #0f172a;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .font-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .font-presets {
      display: flex;
      align-items: center;
      padding: 0 2px;
      gap: 2px;
    }
    .font-preset {
      font-size: 11px;
      font-family: monospace;
      padding: 3px 6px;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .font-preset:hover {
      color: #0f172a;
    }
    .font-preset.active {
      background: #0f172a;
      color: white;
      font-weight: 700;
    }
    @media (max-width: 600px) {
      .font-presets { display: none; }
    }

    /* Main Dual-Column Layout with Independent Scroll */
    .workspace {
      flex: 1;
      height: calc(100vh - 57px);
      max-height: calc(100vh - 57px);
      display: flex;
      overflow: hidden;
      position: relative;
    }
    .passage-panel {
      flex: 6;
      height: 100%;
      overflow-y: auto;
      overscroll-behavior: contain;
      border-right: 1px solid var(--border-color);
      background: white;
      padding: 32px 36px 64px 36px;
    }
    .splitter {
      width: 8px;
      margin: 0 -4px;
      cursor: col-resize;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      transition: background 0.15s ease;
      background: transparent;
    }
    .splitter:hover, .splitter.dragging {
      background: rgba(99, 102, 241, 0.12);
    }
    .splitter-line {
      width: 2px;
      height: 100%;
      background: var(--border-color);
      transition: background 0.15s ease;
    }
    .splitter:hover .splitter-line, .splitter.dragging .splitter-line {
      background: #6366f1;
    }
    .questions-panel {
      flex: 4;
      height: 100%;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: #f8fafc;
      padding: 24px 24px 64px 24px;
    }
    /* Custom Scrollbars */
    .passage-panel::-webkit-scrollbar,
    .questions-panel::-webkit-scrollbar {
      width: 6px;
    }
    .passage-panel::-webkit-scrollbar-track,
    .questions-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .passage-panel::-webkit-scrollbar-thumb,
    .questions-panel::-webkit-scrollbar-thumb {
      background-color: rgba(203, 213, 225, 0.8);
      border-radius: 9999px;
    }
    .passage-panel::-webkit-scrollbar-thumb:hover,
    .questions-panel::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }
    .passage-headline {
      font-size: 24px; font-weight: 900; color: #0f172a;
      line-height: 1.35; margin-bottom: 8px; letter-spacing: -0.02em;
    }
    .passage-submeta {
      font-size: 12px; color: #64748b; margin-bottom: 24px;
      padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;
    }

    /* Paragraphs */
    .paragraph-item {
      position: relative;
      margin-bottom: 20px;
      padding-left: 36px;
    }
    .para-badge {
      position: absolute; left: 0; top: 3px;
      font-size: 11px; font-weight: 800; font-family: monospace;
      color: #94a3b8; user-select: none;
    }
    .para-text {
      font-size: var(--base-font-size); line-height: 1.85; color: #1e293b; text-align: justify;
    }
    .user-annot {
      padding: 1px 3px;
      border-radius: 4px;
      color: inherit;
      cursor: help;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .annot-gloss {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin: 0 3px;
      padding: 1px 5px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 500;
      color: #1e293b;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      vertical-align: baseline;
      user-select: none;
    }
    .annot-dot {
      width: 5px;
      height: 5px;
      border-radius: 9999px;
      flex-shrink: 0;
      display: inline-block;
    }
    .annot-badge {
      font-size: 10px;
      margin-left: 2px;
      vertical-align: 1px;
    }
    .evidence-span {
      font-weight: inherit; transition: all 0.2s ease;
      padding: 0 2px; border-radius: 4px;
      cursor: pointer;
    }
    .evidence-span:hover {
      opacity: 0.88;
    }
    body.show-all-answers .evidence-span,
    .evidence-span.active {
      font-weight: 700 !important;
      color: var(--q-color) !important;
      background-color: var(--q-bg) !important;
      border-bottom: 2px solid var(--q-border) !important;
      border-radius: 4px;
      padding: 1px 3px;
    }
    .q-badge-tag {
      display: none;
      align-items: center;
      justify-content: center;
      background-color: var(--q-color);
      color: white;
      font-size: 10px;
      font-weight: 900;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      padding: 0 4px;
      height: 16px;
      line-height: 16px;
      border-radius: 4px;
      margin-right: 4px;
      vertical-align: 1px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      user-select: none;
    }
    body.show-all-answers .q-badge-tag,
    .evidence-span.active .q-badge-tag {
      display: inline-flex;
    }

    /* Question Cards */
    .card {
      background: white; border-radius: 16px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      padding: 18px; margin-bottom: 16px;
    }
    .card-title {
      font-size: 14px; font-weight: 800; color: #0f172a;
      display: flex; align-items: center; gap: 8px;
    }
    .badge-tag {
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      border-radius: 6px; background: #fdf2f5; color: #b8556d; border: 1px solid #f8b4c8;
    }
    .card-subtitle { font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; }

    /* Word Bank */
    .word-bank-card {
      margin-top: 12px; padding: 12px; background: #f8fafc;
      border-radius: 12px; border: 1px solid #e2e8f0; font-size: 12px;
    }
    .word-bank-title { font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .word-bank-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px;
    }
    .word-chip {
      background: white; border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 4px 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px;
      transition: all 0.15s ease;
    }
    .word-chip:hover { border-color: #93c5fd; background: #f0f7ff; }
    .chip-letter { font-weight: 800; color: #2563eb; }

    /* Summary Passage */
    .summary-subheading {
      text-align: center; font-size: 13px; font-weight: 700;
      color: #334155; margin: 12px 0 8px 0; padding: 4px;
      background: #f8fafc; border-radius: 6px;
    }
    .summary-blank-inline,
    .cloze-blank-inline {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 1px 8px; margin: 0 3px; border-radius: 6px;
      border-bottom: 2px solid var(--q-color, #94a3b8);
      background: var(--q-bg, #f8fafc); cursor: pointer; user-select: none; font-size: calc(var(--base-font-size) - 4px);
      transition: all 0.2s ease;
    }
    .cloze-blank-inline:hover {
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
    .blank-num { font-size: 11px; font-weight: 800; color: #64748b; }
    .blank-placeholder { color: #94a3b8; font-weight: normal; letter-spacing: 2px; }
    .blank-ans { font-weight: 800; color: var(--q-color); }
    body:not(.show-all-answers) .blank-ans { display: none; }
    body:not(.show-all-answers) .summary-blank-inline.revealed .blank-ans,
    body:not(.show-all-answers) .cloze-blank-inline.revealed .blank-ans { display: inline; }
    body:not(.show-all-answers) .summary-blank-inline.revealed .blank-placeholder,
    body:not(.show-all-answers) .cloze-blank-inline.revealed .blank-placeholder { display: none; }
    body.show-all-answers .blank-placeholder { display: none; }
    body.show-all-answers .blank-ans { display: inline; }

    /* Summary Analysis Section & Cards */
    .summary-analysis-section {
      margin-top: 20px; padding-top: 16px; border-top: 1px dashed #cbd5e1;
    }
    .summary-analysis-title {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 12px;
    }
    .analysis-subtitle { font-size: 11px; font-weight: normal; color: #64748b; }
    .summary-items-list { display: flex; flex-direction: column; gap: 10px; }
    .summary-item-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;
      background: #ffffff; cursor: pointer; transition: all 0.15s ease;
    }
    .summary-item-card:hover { border-color: #cbd5e1; }
    .summary-item-card.active { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
    .q-header-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .q-type-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid; }
    .q-hint-label { font-size: 11px; color: #94a3b8; font-weight: normal; }
    .q-inline-answer { font-size: 13px; font-weight: 800; display: none; }
    body.show-all-answers .q-inline-answer,
    .summary-item-card.active .q-inline-answer { display: inline; }
    body.show-all-answers .q-hint-label,
    .summary-item-card.active .q-hint-label { display: none; }
    .q-toggle-icon { font-size: 12px; color: #94a3b8; transition: transform 0.2s ease; margin-left: auto; }
    .summary-item-card.active .q-toggle-icon,
    body.show-all-answers .q-toggle-icon { transform: rotate(180deg); }
    .para-locate-tag {
      display: inline-block; font-size: 11px; font-weight: 800;
      color: #1d4ed8; background: #eff6ff; border: 1px solid #dbeafe;
      padding: 2px 8px; border-radius: 6px; margin-bottom: 8px;
    }

    /* Question Cards */
    .question-card { cursor: pointer; transition: all 0.15s ease; }
    .question-card:hover { border-color: #cbd5e1; }
    .question-card.active { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
    .qcard-header { display: flex; align-items: flex-start; gap: 10px; }
    .q-num-badge {
      width: 22px; height: 22px; border-radius: 6px; color: white;
      font-weight: 800; font-size: 12px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; margin-top: 2px;
    }
    .q-stem { font-size: calc(var(--base-font-size) - 2px); font-weight: 700; color: #0f172a; line-height: 1.5; }
    .options-grid {
      margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: calc(var(--base-font-size) - 4px); color: #475569;
    }
    .option-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: calc(var(--base-font-size) - 4px);
      transition: all 0.2s ease;
    }
    .opt-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 4px; font-weight: 800;
      background: #e2e8f0; color: #475569; font-size: 11px; flex-shrink: 0;
    }
    .opt-text { flex: 1; }
    .opt-correct-tag {
      display: none; font-size: 10px; font-weight: 800;
      color: #166534; background: #dcfce7; border: 1px solid #86efac;
      padding: 1px 6px; border-radius: 4px; margin-left: auto;
    }
    .question-card.active .option-item.is-correct,
    body.show-all-answers .option-item.is-correct {
      background: #f0fbf5 !important; border-color: #3c986d !important;
      color: #166534 !important; font-weight: 700 !important;
      box-shadow: 0 1px 3px rgba(60, 152, 109, 0.15);
    }
    .question-card.active .option-item.is-correct .opt-badge,
    body.show-all-answers .option-item.is-correct .opt-badge {
      background: #3c986d !important; color: #ffffff !important;
    }
    .question-card.active .option-item.is-correct .opt-correct-tag,
    body.show-all-answers .option-item.is-correct .opt-correct-tag {
      display: inline-flex;
    }

    /* Answer Drawer */
    .q-answer-drawer {
      margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: none;
    }
    body.show-all-answers .q-answer-drawer,
    .question-card.active .q-answer-drawer,
    .summary-item-card.active .q-answer-drawer { display: block; }
    .ans-badge {
      display: inline-block; font-size: 12px; font-weight: 800;
      padding: 2px 10px; border-radius: 9999px; border: 1px solid; background: white;
    }
    .evidence-box {
      margin-top: 8px; padding: 10px; background: #f8fafc;
      border-left: 3px solid; border-radius: 0 8px 8px 0; font-size: 12px;
    }
    .evi-label { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
    .evi-text { font-style: italic; color: #1e293b; font-weight: 600; }
    .explanation-box {
      margin-top: 8px; padding: 10px; background: #f8fafc;
      border-radius: 8px; font-size: 12px; color: #334155;
    }
    .exp-label { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 2px; }

    /* Answer Key Card */
    .answer-key-card { margin-top: 24px; padding: 20px; }
    .key-pills-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .key-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 700;
      border: 1px solid; cursor: pointer; transition: transform 0.15s ease;
    }
    .key-pill:hover { transform: scale(1.05); }
    .pill-id { font-family: monospace; font-weight: 900; }

    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
      .app-header, .splitter { display: none !important; }
      .workspace {
        display: block !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .passage-panel, .questions-panel {
        height: auto !important;
        overflow: visible !important;
        width: 100% !important;
        flex: none !important;
        border: none !important;
        padding: 0 !important;
      }
      .questions-panel { padding-top: 24px !important; background: white !important; }
      body { background: white !important; }
    }
    @media (max-width: 900px) {
      html, body {
        height: auto;
        overflow: auto;
      }
      .workspace {
        flex-direction: column;
        height: auto;
        max-height: none;
        overflow: visible;
      }
      .splitter { display: none; }
      .passage-panel {
        height: auto;
        width: 100% !important;
        flex: none;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
      }
      .questions-panel {
        height: auto;
        width: 100% !important;
        flex: none;
      }
    }
  </style>
</head>
<body class="default-view">
  <!-- Header Toolbar -->
  <header class="app-header">
    <div class="header-left">
      <div class="brand-icon">RC</div>
      <div class="header-title-box">
        <h1 class="header-title">${escapeHtml(title)}</h1>
        <div class="header-subtitle">${escapeHtml(subtitle)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="font-ctrl" title="字号调节">
        <button type="button" class="font-btn" id="fontDecBtn" onclick="changeFontSize(-2)" title="缩小字号">A-</button>
        <div class="font-presets">
          <button type="button" class="font-preset" data-size="16" onclick="setFontSize(16)">16</button>
          <button type="button" class="font-preset" data-size="18" onclick="setFontSize(18)">18</button>
          <button type="button" class="font-preset" data-size="20" onclick="setFontSize(20)">20</button>
          <button type="button" class="font-preset" data-size="24" onclick="setFontSize(24)">24</button>
        </div>
        <button type="button" class="font-btn" id="fontIncBtn" onclick="changeFontSize(2)" title="放大字号">A+</button>
      </div>
      <button class="btn btn-toggle-answers" id="toggleAnswersBtn" onclick="toggleAllAnswers()">显示全部答案</button>
      <button class="btn" onclick="window.print()">打印</button>
    </div>
  </header>

  <!-- Workspace with Independent Scrollable Columns -->
  <main class="workspace" id="mainWorkspace">
    <!-- Left: Passage Panel (Independent Scroll) -->
    <section class="passage-panel" id="passagePanel" aria-label="文章精读区">
      <h1 class="passage-headline">${escapeHtml(title)}</h1>
      <div class="passage-submeta">${escapeHtml(subtitle)}</div>
      <div class="paragraphs-list">
        ${renderedParagraphs}
      </div>
    </section>

    <!-- Resizable Divider -->
    <div class="splitter" id="dragSplitter" title="按住拖拽调节分栏比例">
      <div class="splitter-line"></div>
    </div>

    <!-- Right: Questions Panel (Independent Scroll) -->
    <section class="questions-panel" id="questionsPanel" aria-label="试题与解析区">
      ${summaryGroupHtml}
      ${questionsListHtml}

      <!-- 答案速查 (Answer Key) -->
      <div class="card answer-key-card">
        <div class="card-title">
          <span>✅ 答案速查 Answer Key</span>
        </div>
        <div class="key-pills-wrap">
          ${answerKeyPillsHtml}
        </div>
      </div>
    </section>
  </main>

  <script>
    // Font Size Controls
    const MIN_FONT_SIZE = 14;
    const MAX_FONT_SIZE = 28;
    let currentFontSize = ${safeFontSize};

    function applyFontSize(size) {
      currentFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
      document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');

      const decBtn = document.getElementById('fontDecBtn');
      const incBtn = document.getElementById('fontIncBtn');
      if (decBtn) decBtn.disabled = currentFontSize <= MIN_FONT_SIZE;
      if (incBtn) incBtn.disabled = currentFontSize >= MAX_FONT_SIZE;

      document.querySelectorAll('.font-preset').forEach(btn => {
        const targetSize = parseInt(btn.getAttribute('data-size'), 10);
        if (targetSize === currentFontSize) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      try {
        localStorage.setItem('rc_font_size', String(currentFontSize));
      } catch (e) {}
    }

    function setFontSize(size) {
      applyFontSize(size);
    }

    function changeFontSize(delta) {
      applyFontSize(currentFontSize + delta);
    }

    (function initFontSize() {
      let saved = ${safeFontSize};
      try {
        const val = localStorage.getItem('rc_font_size');
        if (val) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
            saved = parsed;
          }
        }
      } catch (e) {}
      applyFontSize(saved);
    })();

    let isAllAnswersShown = false;
    let activeQuestionId = null;

    // Draggable Splitter
    (function initSplitter() {
      const splitter = document.getElementById('dragSplitter');
      const workspace = document.getElementById('mainWorkspace');
      const passagePanel = document.getElementById('passagePanel');
      if (!splitter || !workspace || !passagePanel) return;

      let isDragging = false;
      splitter.addEventListener('mousedown', function(e) {
        isDragging = true;
        splitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const rect = workspace.getBoundingClientRect();
        if (rect.width <= 0) return;
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.min(80, Math.max(20, percent));
        passagePanel.style.flex = 'none';
        passagePanel.style.width = clamped + '%';
      });

      window.addEventListener('mouseup', function() {
        if (isDragging) {
          isDragging = false;
          splitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    })();

    function toggleAllAnswers() {
      isAllAnswersShown = !isAllAnswersShown;
      const btn = document.getElementById('toggleAnswersBtn');
      if (isAllAnswersShown) {
        document.body.classList.add('show-all-answers');
        btn.textContent = '隐藏全部答案';
      } else {
        document.body.classList.remove('show-all-answers');
        btn.textContent = '显示全部答案';
        // Clear active highlights
        document.querySelectorAll('.evidence-span').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.question-card, .summary-item-card').forEach(el => el.classList.remove('active'));
      }
    }

    function toggleQuestion(qid) {
      if (activeQuestionId === qid) {
        // Hide
        activeQuestionId = null;
        document.querySelectorAll('.q-blank-' + qid).forEach(el => el.classList.remove('revealed'));
        const card = document.getElementById('qcard-' + qid);
        if (card) card.classList.remove('active');
        document.querySelectorAll('.q-evi-' + qid).forEach(el => el.classList.remove('active'));
      } else {
        // Reveal & Scroll
        activeQuestionId = qid;
        document.querySelectorAll('.summary-blank-inline, .cloze-blank-inline').forEach(el => el.classList.remove('revealed'));
        document.querySelectorAll('.question-card, .summary-item-card').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.evidence-span').forEach(el => el.classList.remove('active'));

        document.querySelectorAll('.q-blank-' + qid).forEach(el => el.classList.add('revealed'));
        const card = document.getElementById('qcard-' + qid);
        if (card) {
          card.classList.add('active');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const eviSpans = document.querySelectorAll('.q-evi-' + qid);
        eviSpans.forEach(el => {
          el.classList.add('active');
        });
        if (eviSpans.length > 0) {
          eviSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  </script>
</body>
</html>`;

  // Trigger browser download of static HTML file
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
