/**
 * Helper: Find exact character offset of selected text in original paragraph
 */
export const findExactOffset = (
  originalText: string,
  selectedText: string,
  approximateOffset: number
): { start: number; end: number } => {
  if (!originalText || !selectedText) return { start: -1, end: -1 };

  const matches: number[] = [];
  let idx = originalText.indexOf(selectedText);
  while (idx !== -1) {
    matches.push(idx);
    idx = originalText.indexOf(selectedText, idx + 1);
  }

  if (matches.length === 0) {
    const lowerOrig = originalText.toLowerCase();
    const lowerSel = selectedText.toLowerCase();
    idx = lowerOrig.indexOf(lowerSel);
    while (idx !== -1) {
      matches.push(idx);
      idx = lowerOrig.indexOf(lowerSel, idx + 1);
    }
  }

  if (matches.length === 0) return { start: -1, end: -1 };
  if (matches.length === 1) return { start: matches[0], end: matches[0] + selectedText.length };

  let closest = matches[0];
  let minDiff = Math.abs(matches[0] - approximateOffset);
  for (let i = 1; i < matches.length; i++) {
    const diff = Math.abs(matches[i] - approximateOffset);
    if (diff < minDiff) {
      minDiff = diff;
      closest = matches[i];
    }
  }
  return { start: closest, end: closest + selectedText.length };
};

/**
 * Helper: Extract complete sentence surrounding the selected word/range
 */
export const extractSentenceContext = (text: string, start: number, end: number): string => {
  if (!text) return '';
  const terminators = ['.', '!', '?', '。', '！', '？', '\n'];

  let sentenceStart = 0;
  for (let i = start - 1; i >= 0; i--) {
    if (terminators.includes(text[i])) {
      sentenceStart = i + 1;
      break;
    }
  }

  let sentenceEnd = text.length;
  for (let i = end; i < text.length; i++) {
    if (terminators.includes(text[i])) {
      sentenceEnd = i + 1;
      break;
    }
  }

  return text.slice(sentenceStart, sentenceEnd).trim() || text.slice(start, end);
};

import type { ArticleAnnotation } from '../types';

/**
 * Helper: Extract a concise key meaning for inline gloss display
 * Length is kept short (approx 8-12 characters) as requested by user.
 */
export const getConciseAnnotationMeaning = (
  annot: ArticleAnnotation,
  maxLength: number = 10
): string => {
  if (!annot) return '';

  // 1. AI Lexicon Analysis (Best quality contextual lexical meaning)
  if (annot.aiAnalysis?.contextualMeaning?.definition) {
    const rawDef = annot.aiAnalysis.contextualMeaning.definition;
    const pos = annot.aiAnalysis.contextualMeaning.pos?.trim() || '';

    // Remove brackets / parentheses: e.g. "（尤指...）", "(formal)"
    let cleanDef = rawDef.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
    // Split by delimiters like commas, semicolons, slashes
    let firstPart = cleanDef.split(/[,，;；、/]/)[0]?.trim() || cleanDef;

    // Remove leading pos in definition if already present (e.g. "adj. 普遍的" -> "普遍的")
    if (pos) {
      const posRegex = new RegExp(`^${pos.replace('.', '\\.')}\\s*`, 'i');
      firstPart = firstPart.replace(posRegex, '').trim();
    }

    if (firstPart) {
      if (pos) {
        const withPos = `${pos} ${firstPart}`;
        if (withPos.length <= maxLength + 2) {
          return withPos;
        }
      }
      return firstPart.length > maxLength ? firstPart.slice(0, maxLength) : firstPart;
    }
  }

  // 2. User Note
  if (annot.note && annot.note.trim()) {
    const trimmed = annot.note.trim();

    // Check if user inserted AI summary format 【语境义】[pos] def
    const ctxMatch = trimmed.match(/【语境义】\s*(?:\[([^\]]+)\])?\s*([^\n\r]+)/);
    if (ctxMatch) {
      const pos = ctxMatch[1]?.trim() || '';
      let def = ctxMatch[2]?.replace(/[\(（][^\)）]*[\)）]/g, '').trim() || '';
      let firstDef = def.split(/[,，;；、/]/)[0]?.trim() || def;
      if (pos) {
        const posRegex = new RegExp(`^${pos.replace('.', '\\.')}\\s*`, 'i');
        firstDef = firstDef.replace(posRegex, '').trim();
        const withPos = `${pos} ${firstDef}`;
        if (withPos.length <= maxLength + 2) return withPos;
      }
      return firstDef.length > maxLength ? firstDef.slice(0, maxLength) : firstDef;
    }

    const transMatch = trimmed.match(/【AI 语境译文】\s*([^\n\r]+)/);
    if (transMatch) {
      let t = transMatch[1].replace(/[\(（][^\)）]*[\)）]/g, '').trim();
      t = t.split(/[,，;；、。!！?？]/)[0]?.trim() || t;
      return t.length > maxLength ? t.slice(0, maxLength) : t;
    }

    // Regular note: take first line, strip Markdown prefixes
    const firstLine = trimmed.split(/[\r\n]+/)[0].replace(/^[#\*\-•>\s]+/, '').trim();
    let clean = firstLine.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
    const firstPart = clean.split(/[,，;；、]/)[0]?.trim() || clean;
    const result = firstPart.length >= 2 ? firstPart : clean;
    return result.length > maxLength ? result.slice(0, maxLength) : result;
  }

  // 3. AI Translation
  if (annot.aiTranslation?.translation) {
    let t = annot.aiTranslation.translation.replace(/[\(（][^\)）]*[\)）]/g, '').trim();
    t = t.split(/[,，;；、。!！?？]/)[0]?.trim() || t;
    return t.length > maxLength ? t.slice(0, maxLength) : t;
  }

  return '';
};
