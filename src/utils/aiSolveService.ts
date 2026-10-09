import type { Courseware, Question, HighlightRange, SummaryGroup, SummaryItem } from '../types';
import { fetchWithAutoProxy, loadSavedAIConfig } from './aiVisionService';
import type { AIServiceConfig } from './aiVisionService';

export interface AISolveItem {
  id: number;
  answer: string;
  evidenceText: string;
  paragraphNumber?: number; // 1-based paragraph index where evidenceText is located
  explanation: string;
}

export interface AISolveResult {
  summaryItems?: AISolveItem[];
  questions?: AISolveItem[];
}

/**
 * Robust string matcher to locate character-level ranges of evidence text in paragraphs.
 */
export function findEvidenceRanges(
  paragraphs: string[],
  rawEvidence: string,
  paragraphHint?: number
): HighlightRange[] {
  if (!rawEvidence) return [];
  const cleanEvidence = rawEvidence
    .replace(/^["'“”「」『』\s]+|["'“”「」『』\s]+$/g, '')
    .trim();
  if (!cleanEvidence) return [];

  const ranges: HighlightRange[] = [];

  // Helper: check a specific paragraph
  const checkParagraph = (pIndex: number): HighlightRange | null => {
    if (pIndex < 0 || pIndex >= paragraphs.length) return null;
    const p = paragraphs[pIndex];

    // 1. Exact match
    let idx = p.indexOf(cleanEvidence);
    if (idx !== -1) {
      return {
        paragraphIndex: pIndex,
        startOffset: idx,
        endOffset: idx + cleanEvidence.length,
      };
    }

    // 2. Case-insensitive match
    idx = p.toLowerCase().indexOf(cleanEvidence.toLowerCase());
    if (idx !== -1) {
      return {
        paragraphIndex: pIndex,
        startOffset: idx,
        endOffset: idx + cleanEvidence.length,
      };
    }

    // 3. Relaxed quote/punctuation match (replacing smart quotes with ascii or vice-versa)
    const normP = p.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    const normE = cleanEvidence.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    idx = normP.toLowerCase().indexOf(normE.toLowerCase());
    if (idx !== -1) {
      return {
        paragraphIndex: pIndex,
        startOffset: idx,
        endOffset: idx + cleanEvidence.length,
      };
    }

    // 4. Substring fallback if evidence is long: match the longest prominent sub-phrase (>= 20 chars)
    if (cleanEvidence.length >= 25) {
      const halfLength = Math.min(cleanEvidence.length, 45);
      const subPiece = cleanEvidence.slice(0, halfLength).trim();
      idx = p.toLowerCase().indexOf(subPiece.toLowerCase());
      if (idx !== -1) {
        return {
          paragraphIndex: pIndex,
          startOffset: idx,
          endOffset: Math.min(p.length, idx + cleanEvidence.length),
        };
      }
    }

    return null;
  };

  // If a 1-based paragraph hint is provided, search that paragraph first
  if (paragraphHint && paragraphHint >= 1 && paragraphHint <= paragraphs.length) {
    const hintMatch = checkParagraph(paragraphHint - 1);
    if (hintMatch) {
      ranges.push(hintMatch);
      return ranges;
    }
  }

  // Otherwise, scan all paragraphs from 0 to N
  for (let i = 0; i < paragraphs.length; i++) {
    // Skip if already checked by hint
    if (paragraphHint && i === paragraphHint - 1) continue;

    const match = checkParagraph(i);
    if (match) {
      ranges.push(match);
      break;
    }
  }

  return ranges;
}

/**
 * Checks how many questions in the courseware are currently missing answers or evidence.
 */
export function countUnsolvedQuestions(courseware: Courseware | null): {
  total: number;
  unsolved: number;
} {
  if (!courseware) return { total: 0, unsolved: 0 };

  let total = 0;
  let unsolved = 0;

  if (courseware.summaryGroup && courseware.summaryGroup.items) {
    total += courseware.summaryGroup.items.length;
    for (const item of courseware.summaryGroup.items) {
      if (!item.answer?.trim() || !item.evidenceText?.trim()) {
        unsolved++;
      }
    }
  }

  const nonSummary = courseware.summaryGroup
    ? courseware.questions.filter((q) => !courseware.summaryGroup!.items.some((it) => it.id === q.id))
    : courseware.questions;

  total += nonSummary.length;
  for (const q of nonSummary) {
    if (!q.answer?.trim() || !q.evidenceText?.trim()) {
      unsolved++;
    }
  }

  return { total, unsolved };
}

/**
 * Robust JSON extractor for model output
 */
function extractAndParseJSON(raw: string): any {
  let text = raw.trim();

  // Strip Markdown code fences
  if (text.includes('```json')) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) text = match[1].trim();
  } else if (text.includes('```')) {
    const match = text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) text = match[1].trim();
  }

  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        try {
          return JSON.parse(candidate + ']}');
        } catch {}
      }
    }
    throw new Error(`无法解析模型返回的 JSON 数据: ${text.slice(0, 180)}...`);
  }
}

/**
 * Invokes the configured AI Model to solve the exam questions,
 * extract verbatim evidence sentences from the passage, and produce detailed Chinese explanations.
 */
export async function solvePaperWithAI(
  courseware: Courseware,
  config: AIServiceConfig = loadSavedAIConfig(),
  onProgress?: (status: string) => void
): Promise<Courseware> {
  if (!config.apiKey?.trim()) {
    throw new Error('未检测到 API Key，请先点击右上角【设置】配置模型 API Key');
  }

  if (!courseware.paragraphs || courseware.paragraphs.length === 0) {
    throw new Error('当前课件没有文章段落，无法进行解答与定位');
  }

  const totalQuestions =
    (courseware.summaryGroup?.items.length || 0) + (courseware.questions.length || 0);
  if (totalQuestions === 0) {
    throw new Error('当前课件中没有找到任何题目');
  }

  onProgress?.('正在整理阅读文章与待解试题列表...');

  // Format paragraphs with 1-based indices for LLM referencing
  const formattedPassage = courseware.paragraphs
    .map((p, idx) => `[Paragraph ${idx + 1}]\n${p.trim()}`)
    .join('\n\n');

  // Format questions
  let questionsPromptText = '';

  if (courseware.summaryGroup) {
    questionsPromptText += `\n### 【摘要填空题组 (Questions ${courseware.summaryGroup.idRange})】\n`;
    questionsPromptText += `Instructions: ${courseware.summaryGroup.instruction}\n`;
    if (courseware.summaryGroup.paragraphGuide) {
      questionsPromptText += `Reference / Word Bank: ${courseware.summaryGroup.paragraphGuide}\n`;
    }
    questionsPromptText += `Summary Text:\n${courseware.summaryGroup.paragraphs.join('\n')}\n`;
    questionsPromptText += `Blanks to solve: ${courseware.summaryGroup.items.map((it) => `[${it.id}]`).join(', ')}\n`;
  }

  const nonSummaryQuestions = courseware.summaryGroup
    ? courseware.questions.filter((q) => !courseware.summaryGroup!.items.some((it) => it.id === q.id))
    : courseware.questions;

  if (nonSummaryQuestions.length > 0) {
    questionsPromptText += `\n### 【选择题 / 判断题 / 简答题列表】\n`;
    for (const q of nonSummaryQuestions) {
      questionsPromptText += `Question ${q.id}: ${q.stem}\n`;
      if (q.options && q.options.length > 0) {
        questionsPromptText += `Options:\n${q.options.map((opt) => `  ${opt}`).join('\n')}\n`;
      }
      questionsPromptText += '\n';
    }
  }

  const systemPrompt = `You are a world-class educational exam solving assistant and IELTS/TOEFL reading comprehension expert.
Your mission is to read the provided passage and solve all the questions with 100% precision.

CRITICAL INSTRUCTIONS:
1. For each question:
   - "answer":
     * For multiple-choice questions: Output the single uppercase option letter (e.g., "A", "B", "C", "D").
     * For YES / NO / NOT GIVEN or TRUE / FALSE / NOT GIVEN: Output "YES", "NO", or "NOT GIVEN" (or corresponding option letter A/B/C).
     * For summary completion / cloze: If a Word Bank (A–Q) is provided, output the option letter (e.g. "H") or option letter + term (e.g. "H"). If no word bank is provided, output the exact verbatim word(s) taken directly from the passage, strictly obeying word limit constraints (e.g. "NO MORE THAN TWO WORDS").
   - "paragraphNumber": An integer (1-based, e.g. 1, 2, 3...) indicating the exact [Paragraph X] in the passage where the evidence is found.
   - "evidenceText": **EXTREMELY IMPORTANT**: Must be the EXACT VERBATIM sentence copied directly from the passage text with 100% fidelity. Do NOT alter words, grammar, or punctuation, because an automated string-matching algorithm will scan the passage text for this exact substring to highlight it!
   - "explanation": In clear, pedagogical, high-quality Chinese (简体中文). Explain the logic of the question, how the passage evidence sentence proves the answer (identifying synonyms, paraphrases, and keywords), and briefly clarify why other options are incorrect if applicable.

2. Return valid JSON only. Do NOT wrap in markdown explanation before or after. Start directly with { and end with }.

JSON Format Structure:
{
  "items": [
    {
      "id": 1,
      "answer": "...",
      "paragraphNumber": 1,
      "evidenceText": "Exact verbatim sentence from [Paragraph X]...",
      "explanation": "详细中文解析..."
    }
  ]
}`;

  const userPrompt = `Here is the reading comprehension passage:

=== PASSAGE START ===
Title: ${courseware.title}
${courseware.subtitle ? `Subtitle: ${courseware.subtitle}\n` : ''}

${formattedPassage}
=== PASSAGE END ===

Here are the questions to solve:
${questionsPromptText}

Please solve all questions now and return strictly the JSON structure containing all question IDs.`;

  onProgress?.(`正在匹配试卷参考答案与原文依据...`);

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetchWithAutoProxy(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim() || 'sensenova-6.8-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 429) {
      throw new Error(`接口频次或配额超限 (429): ${errorDetail || '请稍候片刻再试'}`);
    } else if (response.status === 401) {
      throw new Error('API Key 认证失败 (401): 请检查设置中的 API Key 是否有效');
    } else if (response.status === 404) {
      throw new Error(`模型或端点不存在 (404): 请核对 Base URL 与模型名称 [${config.model}]`);
    }
    throw new Error(`模型请求失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  onProgress?.('已获取解析结果，正在整理试题数据...');

  const resultData = await response.json();
  const choice = resultData.choices?.[0];
  let rawContent = (choice?.message?.content && choice.message.content.trim()) || '';

  if (!rawContent) {
    rawContent = choice?.message?.reasoning || choice?.message?.reasoning_content || choice?.text || '';
  }

  if (!rawContent) {
    throw new Error('模型未返回有效文本，请重试');
  }

  const parsed = extractAndParseJSON(rawContent);

  // Collect all solved items into a map by id
  const solvedMap = new Map<number, AISolveItem>();

  const pushItem = (it: any) => {
    if (!it || typeof it.id !== 'number') return;
    solvedMap.set(it.id, {
      id: it.id,
      answer: String(it.answer || '').trim(),
      evidenceText: String(it.evidenceText || it.evidence || '').trim(),
      paragraphNumber: typeof it.paragraphNumber === 'number' ? it.paragraphNumber : undefined,
      explanation: String(it.explanation || it.analysis || '').trim(),
    });
  };

  if (Array.isArray(parsed.items)) {
    parsed.items.forEach(pushItem);
  }
  if (Array.isArray(parsed.questions)) {
    parsed.questions.forEach(pushItem);
  }
  if (Array.isArray(parsed.summaryItems)) {
    parsed.summaryItems.forEach(pushItem);
  }

  if (solvedMap.size === 0) {
    throw new Error('未能从模型返回的数据中提取出各题答案，请重试');
  }

  onProgress?.('正在计算原文字符级高亮锚点与 1 对 1 关联...');

  // Update summaryGroup if present
  let updatedSummaryGroup: SummaryGroup | undefined = courseware.summaryGroup;
  if (courseware.summaryGroup) {
    const updatedItems: SummaryItem[] = courseware.summaryGroup.items.map((item) => {
      const solved = solvedMap.get(item.id);
      if (!solved) return item;

      const answer = solved.answer || item.answer;
      const evidenceText = solved.evidenceText || item.evidenceText;
      const explanation = solved.explanation || item.explanation;
      const evidenceRanges = findEvidenceRanges(
        courseware.paragraphs,
        evidenceText,
        solved.paragraphNumber
      );

      return {
        ...item,
        answer,
        evidenceText,
        explanation,
        evidenceRanges: evidenceRanges.length > 0 ? evidenceRanges : item.evidenceRanges,
      };
    });

    updatedSummaryGroup = {
      ...courseware.summaryGroup,
      items: updatedItems,
    };
  }

  // Update questions
  const updatedQuestions: Question[] = courseware.questions.map((q) => {
    const solved = solvedMap.get(q.id);
    if (!solved) return q;

    const answer = solved.answer || q.answer;
    const evidenceText = solved.evidenceText || q.evidenceText;
    const explanation = solved.explanation || q.explanation;
    const evidenceRanges = findEvidenceRanges(
      courseware.paragraphs,
      evidenceText,
      solved.paragraphNumber
    );

    return {
      ...q,
      answer,
      evidenceText,
      explanation,
      evidenceRanges: evidenceRanges.length > 0 ? evidenceRanges : q.evidenceRanges,
    };
  });

  return {
    ...courseware,
    questions: updatedQuestions,
    summaryGroup: updatedSummaryGroup,
    updatedAt: Date.now(),
  };
}

export interface AIParsedCourseware {
  title: string;
  subtitle: string;
  paragraphs: string[];
  summaryGroup?: SummaryGroup;
  questions: Question[];
}

/**
 * Uses AI LLM to directly analyze raw unformatted exam text,
 * extracting the passage (title, subtitle, clean paragraphs), questions,
 * AND solving all answers with verbatim evidence sentences and detailed explanations in one go.
 */
export async function parseExamTextWithAI(
  rawText: string,
  config: AIServiceConfig = loadSavedAIConfig(),
  onProgress?: (status: string) => void
): Promise<AIParsedCourseware> {
  if (!config.apiKey?.trim()) {
    throw new Error('未检测到 API Key，请先点击右上角【设置】配置模型 API Key');
  }

  if (!rawText || !rawText.trim()) {
    throw new Error('试卷文本内容为空，请粘贴试卷内容');
  }

  onProgress?.('正在构建 AI 结构化分析与试卷解析任务...');

  const systemPrompt = `You are a world-class reading comprehension exam parsing and solving system.
Your mission is to take an entire unstructured exam text (which includes the reading passage, question headers, cloze/summary questions with blanks or word banks, and multiple choice/matching/true-false questions), and output a fully structured JSON courseware containing:
1. The reading passage: title, subtitle/meta, and all natural paragraphs cleanly separated into an array of strings. Do NOT leave questions or question instructions inside the passage paragraphs.
2. The questions: accurately extract every question stem and options.
3. The answers & evidence: for EVERY single question (including cloze/summary blanks), determine the correct answer, the exact verbatim evidence sentence from the passage, the 1-based paragraph number of the evidence, and a clear, pedagogical Chinese explanation.

CRITICAL EXTRACTION & SOLVING RULES:
1. Passage:
   - "title": The main headline/title of the reading passage. Ignore meta headers like "READING PASSAGE 1", "You should spend about 20 minutes...".
   - "subtitle": Subtitle or exam instructions/time metadata (e.g. "READING PASSAGE · Questions 1–14").
   - "paragraphs": Array of clean strings, one for each natural paragraph in the reading passage. Preserve full original text verbatim without cutting sentences.

2. Summary / Cloze Questions (if present in the text):
   If there is a summary completion / cloze passage with numbered blanks (e.g. "1 ...." or "[1]"):
   Create "summaryGroup":
   - "idRange": string (e.g. "1–9")
   - "title": Subheading of the summary if present (e.g. "Reasons for a lack of engineers")
   - "instruction": The instruction text (e.g. "Complete the summary using the list of words, A–Q, below.")
   - "paragraphGuide": If there is a Word Bank of options (like A disadvantage, B quality...), format as "备选词表: A disadvantage | B quality | C retirement..."
   - "paragraphs": Array of strings representing the summary text, with all blanks normalized to format [1], [2], [3]...
   - "items": Array of objects for each blank [1]..[N]:
     * "id": integer blank number (e.g. 1)
     * "answer": The correct answer. If a Word Bank (A–Q) is provided, output the option letter (e.g. "H") or option letter + term (e.g. "H"). If no word bank, output the exact word(s) from the passage.
     * "paragraphNumber": integer (1-based), which paragraph in "paragraphs" contains the evidence sentence.
     * "evidenceText": **EXTREMELY IMPORTANT**: EXACT VERBATIM sentence copied directly from the passage text with 100% character-by-character fidelity.
     * "explanation": Detailed, pedagogical Chinese explanation (详细中文解析).

3. Standard Questions (Multiple Choice, YES/NO/NOT GIVEN, TRUE/FALSE/NOT GIVEN, etc.):
   Create "questions" array:
   - "id": integer question number (e.g. 10)
   - "stem": question stem text
   - "options": array of strings (e.g. ["A. YES", "B. NO", "C. NOT GIVEN"] or ["A. ...", "B. ..."])
   - "answer": the correct option (e.g. "A" or "YES" or "B. NO")
   - "paragraphNumber": integer (1-based), which paragraph contains the evidence sentence.
   - "evidenceText": EXACT VERBATIM sentence copied directly from the passage text with 100% fidelity.
   - "explanation": Detailed Chinese explanation (详细中文解析).
   - "type": "single" | "summary" | "fill" | "short-answer"

4. Format:
   Return valid JSON only. Do NOT wrap in conversational text. Start directly with { and end with }.

JSON Format Structure:
{
  "title": "Passage Title",
  "subtitle": "Reading Passage · Questions 1-14",
  "paragraphs": [
    "Paragraph 1 text...",
    "Paragraph 2 text..."
  ],
  "summaryGroup": {
    "idRange": "1–9",
    "title": "Summary title",
    "instruction": "Complete the summary below...",
    "paragraphGuide": "备选词表: A disadvantage | B quality | C retirement...",
    "paragraphs": ["Summary text with blanks as [1], [2]..."],
    "items": [
      {
        "id": 1,
        "answer": "H",
        "paragraphNumber": 1,
        "evidenceText": "Exact verbatim sentence from Paragraph 1...",
        "explanation": "详细中文解析..."
      }
    ]
  },
  "questions": [
    {
      "id": 10,
      "stem": "Question stem text...",
      "options": ["A. YES", "B. NO", "C. NOT GIVEN"],
      "answer": "B",
      "paragraphNumber": 4,
      "evidenceText": "Exact verbatim sentence from Paragraph 4...",
      "explanation": "详细中文解析...",
      "type": "single"
    }
  ]
}`;

  const userPrompt = `Here is the raw exam text to parse and solve:

=== RAW EXAM TEXT START ===
${rawText}
=== RAW EXAM TEXT END ===

Please parse the reading passage, extract all questions, solve every question with verbatim evidence and Chinese explanation, and return the complete JSON now.`;

  onProgress?.(`正在提取正文、试题与答案解析...`);

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetchWithAutoProxy(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim() || 'sensenova-6.8-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 429) {
      throw new Error(`接口频次或配额超限 (429): ${errorDetail || '请稍候片刻再试'}`);
    } else if (response.status === 401) {
      throw new Error('API Key 认证失败 (401): 请检查设置中的 API Key 是否有效');
    } else if (response.status === 404) {
      throw new Error(`模型或端点不存在 (404): 请核对 Base URL 与模型名称 [${config.model}]`);
    }
    throw new Error(`模型请求失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  onProgress?.('模型识别与解答完成，正在解析数据结构...');

  const resultData = await response.json();
  const choice = resultData.choices?.[0];
  let rawContent = (choice?.message?.content && choice.message.content.trim()) || '';

  if (!rawContent) {
    rawContent = choice?.message?.reasoning || choice?.message?.reasoning_content || choice?.text || '';
  }

  if (!rawContent) {
    throw new Error('模型未返回有效文本，请重试');
  }

  const parsed = extractAndParseJSON(rawContent);

  const title: string = parsed.title || '阅读理解精读课件';
  const subtitle: string = parsed.subtitle || '';
  const paragraphs: string[] = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];

  onProgress?.('正在计算原文字符级高亮锚点与 1 对 1 关联...');

  let summaryGroup: SummaryGroup | undefined = undefined;
  if (parsed.summaryGroup && Array.isArray(parsed.summaryGroup.items)) {
    const rawSG = parsed.summaryGroup;
    summaryGroup = {
      idRange: rawSG.idRange || '1–9',
      title: rawSG.title,
      instruction: rawSG.instruction || 'Complete the summary below.',
      paragraphGuide: rawSG.paragraphGuide,
      paragraphs: Array.isArray(rawSG.paragraphs) ? rawSG.paragraphs : [],
      items: rawSG.items.map((it: any) => {
        const id = Number(it.id) || 1;
        const answer = String(it.answer || '').trim();
        const evidenceText = String(it.evidenceText || it.evidence || '').trim();
        const explanation = String(it.explanation || it.analysis || '').trim();
        const pNum = typeof it.paragraphNumber === 'number' ? it.paragraphNumber : undefined;
        const evidenceRanges = findEvidenceRanges(paragraphs, evidenceText, pNum);

        return {
          id,
          answer,
          evidenceText,
          explanation,
          evidenceRanges,
        };
      }),
    };
  }

  const rawQuestions: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: Question[] = [];

  // Register summary items in questions list as well if not already present
  if (summaryGroup) {
    for (const item of summaryGroup.items) {
      const existingQ = rawQuestions.find((q) => q.id === item.id);
      if (existingQ) {
        const evidenceText = item.evidenceText || String(existingQ.evidenceText || '').trim();
        const pNum = typeof existingQ.paragraphNumber === 'number' ? existingQ.paragraphNumber : undefined;
        questions.push({
          id: item.id,
          stem: String(existingQ.stem || `[${item.id}] 摘要填空题 (${summaryGroup.title || 'Summary'})`),
          options: Array.isArray(existingQ.options) ? existingQ.options : [],
          answer: item.answer || String(existingQ.answer || '').trim(),
          explanation: item.explanation || String(existingQ.explanation || '').trim(),
          evidenceText,
          evidenceRanges:
            item.evidenceRanges.length > 0
              ? item.evidenceRanges
              : findEvidenceRanges(paragraphs, evidenceText, pNum),
          type: 'summary',
        });
      } else {
        questions.push({
          id: item.id,
          stem: `[${item.id}] 摘要填空题 (${summaryGroup.title || 'Summary'})`,
          options: [],
          answer: item.answer,
          explanation: item.explanation,
          evidenceText: item.evidenceText,
          evidenceRanges: item.evidenceRanges,
          type: 'summary',
        });
      }
    }
  }

  // Add non-summary questions
  for (const q of rawQuestions) {
    if (summaryGroup && summaryGroup.items.some((it) => it.id === q.id)) {
      continue;
    }
    const id = Number(q.id) || questions.length + 1;
    const stem = String(q.stem || '').trim();
    const options = Array.isArray(q.options) ? q.options : [];
    const answer = String(q.answer || '').trim();
    const evidenceText = String(q.evidenceText || q.evidence || '').trim();
    const explanation = String(q.explanation || q.analysis || '').trim();
    const pNum = typeof q.paragraphNumber === 'number' ? q.paragraphNumber : undefined;
    const evidenceRanges = findEvidenceRanges(paragraphs, evidenceText, pNum);

    questions.push({
      id,
      stem,
      options,
      answer,
      explanation,
      evidenceText,
      evidenceRanges,
      type: (q.type as any) || (options.length > 0 ? 'single' : 'short-answer'),
    });
  }

  questions.sort((a, b) => a.id - b.id);

  return {
    title,
    subtitle,
    paragraphs,
    summaryGroup,
    questions,
  };
}
