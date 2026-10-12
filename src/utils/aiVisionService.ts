import type { Question, SummaryGroup } from '../types';
import { resolveSummaryWord, extractWordBankFromPassage } from './summaryWordBank';

export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface VisionParseResult {
  title: string;
  subtitle: string;
  coursewareType?: 'reading' | 'cloze';
  paragraphs: string[];
  summaryGroup?: SummaryGroup;
  questions: Omit<Question, 'evidenceRanges'>[];
}

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  apiKey: (import.meta.env.VITE_AI_API_KEY as string) || 'sk-baL9FZyrfawVQnxHTE7KXVQ4nmzPsdaA',
  baseUrl: (import.meta.env.VITE_AI_BASE_URL as string) || 'https://token.sensenova.cn/v1',
  model: (import.meta.env.VITE_AI_MODEL as string) || 'sensenova-6.8-flash-lite',
};

export function loadSavedAIConfig(): AIServiceConfig {
  return DEFAULT_AI_CONFIG;
}

export function saveAIConfig(_config: AIServiceConfig): void {
  // Config is managed statically via environment variables
}

/**
 * Universal fetch with automatic CORS proxy fallback.
 */
export async function fetchWithAutoProxy(targetUrl: string, options: RequestInit): Promise<Response> {
  if (targetUrl.startsWith('/')) {
    return fetch(targetUrl, options);
  }

  // 针对商汤等被浏览器 CORS 拦截的接口，优先尝试本站反代通道 /sensenova
  if (targetUrl.includes('token.sensenova.cn')) {
    const localProxyUrl = targetUrl.replace(/https?:\/\/token\.sensenova\.cn/, '/sensenova');
    try {
      const localRes = await fetch(localProxyUrl, options);
      if (localRes.status !== 404 && localRes.status !== 502) {
        return localRes;
      }
    } catch {}
  }

  try {
    const directResponse = await fetch(targetUrl, options);
    return directResponse;
  } catch (err: unknown) {
    const isCorsError =
      err instanceof TypeError ||
      (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));

    if (isCorsError) {
      // 尝试直通代理（不进行二次 URL 编码，避免 Nginx $arg 无法解析 %3A）
      const proxyUrl = `/api/proxy?target=${targetUrl}`;
      try {
        const proxyRes = await fetch(proxyUrl, options);
        if (proxyRes.status === 404 || proxyRes.status === 500) {
          throw new Error(
            `跨域拦截：浏览器无法直接请求商汤接口。请在宝塔 Nginx 中配置 /sensenova/ 反向代理规则。`
          );
        }
        return proxyRes;
      } catch (proxyErr) {
        throw proxyErr;
      }
    }
    throw err;
  }
}

/**
 * Robust JSON extractor that handles markdown wrappers, reasoning prefaces, or malformed prefixes
 */
function extractAndParseJSON(raw: string): any {
  let text = raw.trim();

  // Check if model explicitly indicated lack of vision capabilities
  const lower = text.toLowerCase();
  if (
    lower.includes("can't see any image") ||
    lower.includes("cannot see any image") ||
    lower.includes("i am unable to see") ||
    lower.includes("我看不到图片") ||
    lower.includes("无法查看图片") ||
    lower.includes("作为文本模型")
  ) {
    throw new Error(
      '当前配置的模型不支持图像识别（Vision 多模态）。请在设置中切换为支持视觉的模型，如商汤 sensenova-6.8-flash-lite、阿里 qwen-vl-max 或 GPT-4o。'
    );
  }

  // Remove markdown code fences if present
  if (text.includes('```json')) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) text = match[1].trim();
  } else if (text.includes('```')) {
    const match = text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) text = match[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Locate the first { and last }
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

export async function parseExamImagesWithVision(
  imagesBase64: string[],
  config: AIServiceConfig,
  onProgress?: (status: string) => void
): Promise<VisionParseResult> {
  if (!config.apiKey.trim()) {
    throw new Error('请先配置模型接口的 API Key');
  }

  if (imagesBase64.length === 0) {
    throw new Error('请至少上传一张试卷图片');
  }

  onProgress?.('正在处理多模态图像并构建请求...');

  const instructionText = `You are an educational exam parser. Extract the full reading passage or cloze test and all questions from these sequential images into JSON.
Output valid JSON only, starting with { and ending with }. Do not write pre-analysis or chain of thought.
If the exam is a Cloze Test (完形填空), keep the numbered blanks in the passage paragraphs (e.g. ____1____ or [1], [2]...), and extract the choice questions (1..N with options A, B, C, D) into "questions".
If questions include a summary completion passage (e.g. Questions 1-7 with blanks like [1], [2]...):
- Extract it into "summaryGroup". Non-summary questions go into "questions".
- For "paragraphGuide": If the exam image contains a candidate Word Bank, format as: "备选词表: A [word1] | B [word2] | ...". CRITICAL REQUIREMENT: If NO Word Bank is printed in the exam, YOU MUST EXTRACT A CANDIDATE WORD BANK DIRECTLY FROM THE PASSAGE (all correct answer words for the blanks + 2-4 plausible distractor words from the reading passage text, sorted alphabetically), formatted as: "备选词表: A [word1] | B [word2] | ...".
- For each item in "summaryGroup.items", "answer" must be the exact English word itself, NEVER just an option letter like "A" or "H".

JSON Structure:
{
  "title": "Passage title",
  "subtitle": "Subtitle or section header",
  "paragraphs": ["First paragraph text...", "Second paragraph text..."],
  "summaryGroup": {
    "idRange": "1–7",
    "title": "Summary title",
    "instruction": "Complete the summary below.",
    "paragraphGuide": "备选词表: A disadvantage | B quality | C retirement...",
    "paragraphs": ["Summary text with blanks as [1], [2], [3]..."],
    "items": [
      {
        "id": 1,
        "answer": "high-quality emotions",
        "evidenceText": "Exact verbatim sentence from paragraphs above",
        "explanation": "中文解析"
      }
    ]
  },
  "questions": [
    {
      "id": 8,
      "stem": "Question stem",
      "options": ["A ...", "B ...", "C ...", "D ..."],
      "answer": "A",
      "evidenceText": "Exact verbatim sentence from paragraphs above",
      "explanation": "中文解析"
    }
  ]
};`;

  const contentItems: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'high' } }
  > = [
    {
      type: 'text',
      text: instructionText,
    },
  ];

  for (const base64 of imagesBase64) {
    const formattedUrl = base64.startsWith('data:')
      ? base64
      : `data:image/jpeg;base64,${base64}`;

    contentItems.push({
      type: 'image_url',
      image_url: {
        url: formattedUrl,
        detail: 'high',
      },
    });
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  onProgress?.(`正在识别试卷图文与版面内容...`);

  const response = await fetchWithAutoProxy(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim() || 'sensenova-6.8-flash-lite',
      messages: [{ role: 'user', content: contentItems }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const rawText = await response.text();
      try {
        const errJson = JSON.parse(rawText);
        errorDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch {
        errorDetail = rawText;
      }
    } catch {
      errorDetail = '';
    }

    if (response.status === 429) {
      throw new Error(`接口频次超出限制 (429): ${errorDetail || '请稍候片刻再试，或检查账户调用额度'}`);
    } else if (response.status === 404) {
      throw new Error(`模型或接口路径不存在 (404): 请核对设置中的模型名称 [${config.model}]`);
    }
    throw new Error(`模型接口调用失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  onProgress?.('正在提取试卷结构与答案依据句...');

  const resultData = await response.json();
  const choice = resultData.choices?.[0];
  let rawContent = (choice?.message?.content && choice.message.content.trim()) || '';

  // Fallback to reasoning if content is empty (for SenseNova CoT reasoning models)
  if (!rawContent) {
    rawContent = choice?.message?.reasoning || choice?.message?.reasoning_content || choice?.text || '';
  }

  if (!rawContent) {
    throw new Error('模型未返回有效内容，请检查模型响应');
  }

  const parsed = extractAndParseJSON(rawContent);

  // Normalize paragraphs
  let paragraphs: string[] = [];
  if (Array.isArray(parsed.paragraphs)) {
    paragraphs = parsed.paragraphs;
  } else if (Array.isArray(parsed.article)) {
    paragraphs = parsed.article;
  } else if (Array.isArray(parsed.passages)) {
    paragraphs = parsed.passages;
  } else if (typeof parsed.text === 'string') {
    paragraphs = parsed.text.split('\n\n').filter(Boolean);
  } else if (typeof parsed.content === 'string') {
    paragraphs = parsed.content.split('\n\n').filter(Boolean);
  }

  if (paragraphs.length === 0) {
    throw new Error('未能从模型返回的数据中提取出文章段落，请重试');
  }

  let summaryGroup: SummaryGroup | undefined = undefined;
  if (parsed.summaryGroup && Array.isArray(parsed.summaryGroup.items)) {
    const rawSG = parsed.summaryGroup;
    let paragraphGuide = rawSG.paragraphGuide;

    const tempSGForResolve: SummaryGroup = {
      idRange: rawSG.idRange || '1–9',
      title: rawSG.title,
      instruction: rawSG.instruction || 'Complete the summary below.',
      paragraphGuide,
      paragraphs: Array.isArray(rawSG.paragraphs) ? rawSG.paragraphs : [],
      items: [],
    };

    const items = rawSG.items.map((it: any) => {
      const rawAns = String(it.answer || '').trim();
      return {
        id: typeof it.id === 'number' ? it.id : 1,
        answer: resolveSummaryWord(rawAns, tempSGForResolve) || rawAns,
        explanation: it.explanation || it.analysis || '',
        evidenceText: it.evidenceText || it.evidence || '',
      };
    });

    if (!paragraphGuide || !paragraphGuide.startsWith('备选词表:')) {
      const fallbackGuide = extractWordBankFromPassage(
        { idRange: rawSG.idRange || '', instruction: rawSG.instruction || '', paragraphs: rawSG.paragraphs || [], items },
        paragraphs
      );
      if (fallbackGuide) {
        paragraphGuide = fallbackGuide;
      }
    }

    summaryGroup = {
      idRange: rawSG.idRange || '1–9',
      title: rawSG.title,
      instruction: rawSG.instruction || 'Complete the summary below.',
      paragraphGuide,
      paragraphs: Array.isArray(rawSG.paragraphs) ? rawSG.paragraphs : [],
      items,
    };
  }

  // Normalize questions
  let rawQuestions: any[] = [];
  if (Array.isArray(parsed.questions)) {
    rawQuestions = parsed.questions;
  } else if (Array.isArray(parsed.quiz)) {
    rawQuestions = parsed.quiz;
  } else if (Array.isArray(parsed.items)) {
    rawQuestions = parsed.items;
  }

  const questions: Omit<Question, 'evidenceRanges'>[] = rawQuestions.map((q, idx) => ({
    id: typeof q.id === 'number' ? q.id : idx + 1,
    stem: q.stem || q.question || '',
    options: Array.isArray(q.options) ? q.options : [],
    answer: String(q.answer || ''),
    explanation: q.explanation || q.analysis || '',
    evidenceText: q.evidenceText || q.evidence || '',
    type: 'single',
  }));

  return {
    title: parsed.title || '阅读理解课件',
    subtitle: parsed.subtitle || '',
    paragraphs,
    summaryGroup,
    questions,
  };
}
