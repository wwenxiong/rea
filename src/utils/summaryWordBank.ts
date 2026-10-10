import type { SummaryGroup, WordBankItem } from '../types';

/**
 * Common Academic / IELTS reading vocabulary glossary for automatic translations & POS
 */
const COMMON_ACADEMIC_GLOSSARY: Record<string, { pos: string; translation: string }> = {
  'disadvantage': { pos: 'n.', translation: '缺点，劣势，不利条件' },
  'advantage': { pos: 'n.', translation: '优势，有利条件，益处' },
  'quality': { pos: 'n.', translation: '质量，品质，特征' },
  'retirement': { pos: 'n.', translation: '退休，引退，退役' },
  'distinction': { pos: 'n.', translation: '区别，差别，卓越' },
  'artificial': { pos: 'adj.', translation: '人造的，人工的，虚假的' },
  'digital': { pos: 'adj.', translation: '数字的，数码的' },
  'emotions': { pos: 'n.', translation: '情绪，情感' },
  'emotion': { pos: 'n.', translation: '情绪，情感' },
  'perception': { pos: 'n.', translation: '感知，知觉，理解力' },
  'invisibility': { pos: 'n.', translation: '隐形，看不见的状态' },
  'adaptable': { pos: 'adj.', translation: '适应性强的，可改编的' },
  'responsive': { pos: 'adj.', translation: '有回应的，反应敏感的' },
  'limitation': { pos: 'n.', translation: '局限，限制，界限' },
  'efficiency': { pos: 'n.', translation: '效率，功效，效能' },
  'accuracy': { pos: 'n.', translation: '精确度，准确性' },
  'alternative': { pos: 'n./adj.', translation: '替代方案；供替代的' },
  'capacity': { pos: 'n.', translation: '容量，能力，才能' },
  'challenge': { pos: 'n./v.', translation: '挑战，艰巨任务；质疑' },
  'component': { pos: 'n.', translation: '组成部分，成分，元件' },
  'consequence': { pos: 'n.', translation: '结果，后果，影响' },
  'construction': { pos: 'n.', translation: '建造，建设，构造' },
  'consumption': { pos: 'n.', translation: '消费，消耗，食用' },
  'contribution': { pos: 'n.', translation: '贡献，捐赠，稿件' },
  'creation': { pos: 'n.', translation: '创造，创立，产物' },
  'criteria': { pos: 'n.', translation: '标准，准则 (criterion复数)' },
  'decline': { pos: 'v./n.', translation: '下降，衰退，谢绝' },
  'demonstration': { pos: 'n.', translation: '示范，游行示威，证明' },
  'destruction': { pos: 'n.', translation: '破坏，毁灭，消灭' },
  'development': { pos: 'n.', translation: '发展，开发，研制' },
  'diversity': { pos: 'n.', translation: '多样性，多元化' },
  'emission': { pos: 'n.', translation: '排放，散发，排放物' },
  'emphasis': { pos: 'n.', translation: '强调，重点，着重' },
  'environment': { pos: 'n.', translation: '环境，周围状况' },
  'equipment': { pos: 'n.', translation: '设备，器材，装备' },
  'expansion': { pos: 'n.', translation: '扩张，扩充，膨胀' },
  'flexibility': { pos: 'n.', translation: '灵活性，柔韧度，适应性' },
  'fluctuation': { pos: 'n.', translation: '波动，起伏，涨落' },
  'framework': { pos: 'n.', translation: '框架，结构，体系' },
  'generation': { pos: 'n.', translation: '产生，一代人，世代' },
  'hypothesis': { pos: 'n.', translation: '假说，假设，推测' },
  'impact': { pos: 'n./v.', translation: '巨大影响，冲击；撞击' },
  'innovation': { pos: 'n.', translation: '创新，革新，新事物' },
  'insight': { pos: 'n.', translation: '洞察力，真知灼见，领悟' },
  'integration': { pos: 'n.', translation: '结合，整合，一体化' },
  'interaction': { pos: 'n.', translation: '互动，互相作用，交流' },
  'investigation': { pos: 'n.', translation: '调查，审查，研究' },
  'mechanism': { pos: 'n.', translation: '机制，机理，机械装置' },
  'modification': { pos: 'n.', translation: '修改，修正，变异' },
  'motivation': { pos: 'n.', translation: '动机，动力，积极性' },
  'observation': { pos: 'n.', translation: '观察，观测，评论' },
  'potential': { pos: 'adj./n.', translation: '潜在的；潜能，潜力' },
  'prediction': { pos: 'n.', translation: '预测，预言，预报' },
  'preservation': { pos: 'n.', translation: '保存，保全，防腐' },
  'priority': { pos: 'n.', translation: '优先权，重点，当务之急' },
  'probability': { pos: 'n.', translation: '概率，可能性，几率' },
  'proportion': { pos: 'n.', translation: '比例，部分，均衡' },
  'reliability': { pos: 'n.', translation: '可靠性，可信赖度' },
  'resistance': { pos: 'n.', translation: '抵抗，抗阻，抵制' },
  'resolution': { pos: 'n.', translation: '决议，解决，分辨率' },
  'scarcity': { pos: 'n.', translation: '不足，缺乏，罕见' },
  'simulation': { pos: 'n.', translation: '模拟，仿效，假装' },
  'stability': { pos: 'n.', translation: '稳定性，坚固，平稳' },
  'sustainability': { pos: 'n.', translation: '可持续性，支撑力' },
  'transformation': { pos: 'n.', translation: '转化，蜕变，剧变' },
  'uncertainty': { pos: 'n.', translation: '不确定性，犹豫不决' },
  'vulnerability': { pos: 'n.', translation: '脆弱性，易受攻击性' },
};

/**
 * Infer Part-of-Speech from word suffix if not in glossary
 */
function inferPos(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith('tion') || w.endsWith('sion') || w.endsWith('ment') || w.endsWith('ity') || w.endsWith('ness') || w.endsWith('ance') || w.endsWith('ence') || w.endsWith('ship') || w.endsWith('ism') || w.endsWith('ist')) {
    return 'n.';
  }
  if (w.endsWith('able') || w.endsWith('ible') || w.endsWith('al') || w.endsWith('ive') || w.endsWith('ic') || w.endsWith('ous') || w.endsWith('ful') || w.endsWith('less')) {
    return 'adj.';
  }
  if (w.endsWith('ly')) {
    return 'adv.';
  }
  if (w.endsWith('ize') || w.endsWith('ise') || w.endsWith('ate') || w.endsWith('ify')) {
    return 'v.';
  }
  return 'n./v.';
}

/**
 * Parse raw word bank options from string or existing analysis array
 */
export function parseWordBankOptions(guideOrAnalysis: string | WordBankItem[] | undefined): WordBankItem[] {
  if (!guideOrAnalysis) return [];
  if (Array.isArray(guideOrAnalysis)) return guideOrAnalysis;

  if (typeof guideOrAnalysis === 'string' && guideOrAnalysis.startsWith('备选词表:')) {
    const rawList = guideOrAnalysis
      .replace(/^备选词表:\s*/, '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    return rawList.map((entry) => {
      // Pattern like "A disadvantage" or "A. disadvantage (n. 缺点)" or "A disadvantage - 缺点"
      const match = entry.match(/^([A-Z])[\s.\)\、:]*(.*?)$/i);
      const letter = match ? match[1].toUpperCase() : '';
      const remainder = match ? match[2].trim() : entry;

      // Extract optional translation in brackets or after hyphens
      let word = remainder;
      let translation = '';
      let pos = '';

      const bracketMatch = remainder.match(/^(.*?)[（\(](.*?)[）\)](.*)$/);
      if (bracketMatch) {
        word = bracketMatch[1].trim();
        const note = bracketMatch[2].trim();
        const posMatch = note.match(/^(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.)\s*(.*)/i);
        if (posMatch) {
          pos = posMatch[1].toLowerCase();
          translation = posMatch[2].trim() || note;
        } else {
          translation = note;
        }
      } else {
        const dashMatch = remainder.match(/^(.*?)\s*[-—–：:]\s*(.*)$/);
        if (dashMatch) {
          word = dashMatch[1].trim();
          translation = dashMatch[2].trim();
        }
      }

      // Clean word from any stray quotes
      word = word.replace(/^['"]|['"]$/g, '').trim();

      // Check built-in glossary if translation missing
      const lowerWord = word.toLowerCase();
      if (COMMON_ACADEMIC_GLOSSARY[lowerWord]) {
        if (!pos) pos = COMMON_ACADEMIC_GLOSSARY[lowerWord].pos;
        if (!translation) translation = COMMON_ACADEMIC_GLOSSARY[lowerWord].translation;
      } else if (!pos) {
        pos = inferPos(word);
      }

      return {
        letter,
        word,
        pos,
        translation,
      };
    });
  }

  return [];
}

/**
 * Resolves a raw summary answer to strictly show the WORD itself, NEVER just letter/number (编号).
 * e.g. "H" -> "disadvantage" (looked up from Word Bank)
 * e.g. "A. disadvantage" -> "disadvantage"
 * e.g. "1. ugly objects" -> "ugly objects"
 */
export function resolveSummaryWord(rawAnswer: string, summaryGroup?: SummaryGroup): string {
  if (!rawAnswer) return '';
  const trimmed = rawAnswer.trim();
  if (!trimmed) return '';

  const wordBankItems = summaryGroup
    ? (summaryGroup.wordBankAnalysis && summaryGroup.wordBankAnalysis.length > 0
        ? summaryGroup.wordBankAnalysis
        : parseWordBankOptions(summaryGroup.paragraphGuide))
    : [];

  // 1. If it's a single letter like "A" or "H", look up in word bank!
  const singleLetterMatch = trimmed.match(/^([A-Z])[\.\:\s]*$/i);
  if (singleLetterMatch) {
    const letter = singleLetterMatch[1].toUpperCase();
    const found = wordBankItems.find((it) => it.letter.toUpperCase() === letter);
    if (found && found.word) {
      return found.word;
    }
  }

  // 2. If it starts with letter prefix like "A. disadvantage", "A disadvantage", "H: disadvantage"
  const letterPrefixMatch = trimmed.match(/^([A-Z])[\.\:\s、]+(.+)$/i);
  if (letterPrefixMatch) {
    const candidateWord = letterPrefixMatch[2].trim();
    // Return clean word without letter
    return candidateWord;
  }

  // 3. If it starts with a number prefix like "1. ugly objects", "1: ugly objects"
  const numberPrefixMatch = trimmed.match(/^\d+[\.\:\s、]+(.+)$/);
  if (numberPrefixMatch) {
    return numberPrefixMatch[1].trim();
  }

  // 4. If exact match with an item in the Word Bank
  const matchedItem = wordBankItems.find(
    (it) => it.word.toLowerCase() === trimmed.toLowerCase() ||
            trimmed.toLowerCase().includes(it.word.toLowerCase())
  );
  if (matchedItem && matchedItem.word) {
    return matchedItem.word;
  }

  return trimmed;
}

/**
 * Build rich Word Bank Analysis (备选词表深度解析)
 * Matches each word bank item with questions, answers, and evidence explanations.
 */
export function buildWordBankAnalysis(summaryGroup: SummaryGroup): WordBankItem[] {
  // If explicitly provided, return or enrich it
  const baseItems = summaryGroup.wordBankAnalysis && summaryGroup.wordBankAnalysis.length > 0
    ? summaryGroup.wordBankAnalysis
    : parseWordBankOptions(summaryGroup.paragraphGuide);

  if (!baseItems || baseItems.length === 0) {
    return [];
  }

  return baseItems.map((wbItem) => {
    const cleanWord = wbItem.word.trim();
    const lowerWord = cleanWord.toLowerCase();
    const letter = wbItem.letter.toUpperCase();

    // Check built-in glossary for translations
    let translation = wbItem.translation || '';
    let pos = wbItem.pos || '';
    if (COMMON_ACADEMIC_GLOSSARY[lowerWord]) {
      if (!pos) pos = COMMON_ACADEMIC_GLOSSARY[lowerWord].pos;
      if (!translation) translation = COMMON_ACADEMIC_GLOSSARY[lowerWord].translation;
    } else if (!pos) {
      pos = inferPos(cleanWord);
    }

    // Match with summaryGroup.items to see if this is an answer
    let matchedQuestionId: number | undefined = wbItem.matchedQuestionId;
    let explanation = wbItem.explanation || '';

    if (matchedQuestionId == null && summaryGroup.items && summaryGroup.items.length > 0) {
      for (const item of summaryGroup.items) {
        const itemAns = (item.answer || '').trim();
        const resolvedAns = resolveSummaryWord(itemAns, summaryGroup);

        const isLetterMatch = itemAns.toUpperCase().startsWith(letter) &&
          (itemAns.length === 1 || !/^[A-Z]$/.test(itemAns.charAt(1)));
        const isWordMatch = resolvedAns.toLowerCase() === lowerWord ||
          itemAns.toLowerCase().includes(lowerWord);

        if (isLetterMatch || isWordMatch) {
          matchedQuestionId = item.id;
          if (!explanation) {
            explanation = item.explanation || (item.evidenceText ? `原文依据句：${item.evidenceText}` : '为该题正确填空词。');
          }
          break;
        }
      }
    }

    if (matchedQuestionId == null && !explanation) {
      explanation = '【干扰项】未被文章摘要选用，可注意辨析其词义与搭配。';
    }

    return {
      letter,
      word: cleanWord,
      pos,
      translation,
      matchedQuestionId,
      explanation,
    };
  });
}

/**
 * Automatically extracts a Word Bank (备选词表) from the passage & summary answers
 * when the original exam or user upload did not provide one.
 * It gathers all answer words, finds 2-4 plausible distractor words from the reading passage,
 * and formats as "备选词表: A word1 | B word2 | C word3..."
 */
export function extractWordBankFromPassage(summaryGroup: SummaryGroup, paragraphs: string[] = []): string {
  if (!summaryGroup || !summaryGroup.items || summaryGroup.items.length === 0) {
    return '';
  }

  // 1. Gather all answer words/phrases
  const answerWords: string[] = [];
  const seenLower = new Set<string>();

  for (const it of summaryGroup.items) {
    let ans = (it.answer || '').trim();
    if (!ans) continue;
    // Clean notes like "emotions (emotions 亦可)" -> "emotions"
    ans = ans.replace(/\s*[\(（].*?[\)）]\s*/g, '').trim();
    // Strip prefixes like "1. ", "A. "
    ans = ans.replace(/^[A-Za-z0-9][\.\:\s、]+/, '').trim();
    if (ans && !seenLower.has(ans.toLowerCase())) {
      seenLower.add(ans.toLowerCase());
      answerWords.push(ans);
    }
  }

  if (answerWords.length === 0) {
    return '';
  }

  // 2. Select 2 to 4 distractor words from the reading passage
  const passageText = paragraphs.join(' ');
  const candidateDistractors: string[] = [];

  // Check against our academic glossary words present in the passage
  for (const [vocab] of Object.entries(COMMON_ACADEMIC_GLOSSARY)) {
    if (candidateDistractors.length >= 3) break;
    if (seenLower.has(vocab.toLowerCase())) continue;
    // Check if the word actually appears in the passage text
    const wordRegex = new RegExp(`\\b${vocab}\\b`, 'i');
    if (wordRegex.test(passageText)) {
      seenLower.add(vocab.toLowerCase());
      candidateDistractors.push(vocab);
    }
  }

  // If still fewer than 2 distractors, extract words from passage that match word length patterns
  if (candidateDistractors.length < 2 && passageText) {
    const words = passageText.match(/\b[A-Za-z]{6,14}\b/g) || [];
    for (const w of words) {
      if (candidateDistractors.length >= 3) break;
      const cleanW = w.toLowerCase();
      if (
        !seenLower.has(cleanW) &&
        !/^(the|and|with|that|this|from|have|been|they|their|will|were|what|when|where|which|about|after|other|could|would|should)$/i.test(cleanW)
      ) {
        seenLower.add(cleanW);
        candidateDistractors.push(w);
      }
    }
  }

  // Combine and sort words alphabetically
  const allWords = [...answerWords, ...candidateDistractors].sort((a, b) => a.localeCompare(b));

  // Label with A, B, C, D...
  const options = allWords.map((w, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return `${letter} ${w}`;
  });

  return `备选词表: ${options.join(' | ')}`;
}

