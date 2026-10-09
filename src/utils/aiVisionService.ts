import type { Question, SummaryGroup } from '../types';

export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface VisionParseResult {
  title: string;
  subtitle: string;
  paragraphs: string[];
  summaryGroup?: SummaryGroup;
  questions: Omit<Question, 'evidenceRanges'>[];
}

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  apiKey: '',
  baseUrl: 'https://token.sensenova.cn/v1',
  model: 'sensenova-6.8-flash-lite',
};

const STORAGE_KEY = 'rc_courseware_ai_config';

export function loadSavedAIConfig(): AIServiceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || 'https://token.sensenova.cn/v1',
        model: parsed.model || 'sensenova-6.8-flash-lite',
      };
    }
  } catch (e) {
    console.warn('Failed to load AI config from localStorage', e);
  }
  return DEFAULT_AI_CONFIG;
}

export function saveAIConfig(config: AIServiceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save AI config to localStorage', e);
  }
}

/**
 * Universal fetch with automatic CORS proxy fallback.
 */
export async function fetchWithAutoProxy(targetUrl: string, options: RequestInit): Promise<Response> {
  if (targetUrl.startsWith('/')) {
    return fetch(targetUrl, options);
  }

  try {
    const directResponse = await fetch(targetUrl, options);
    return directResponse;
  } catch (err: unknown) {
    const isCorsError =
      err instanceof TypeError ||
      (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));

    if (isCorsError) {
      const proxyUrl = `/api/proxy?target=${encodeURIComponent(targetUrl)}`;
      const proxyRes = await fetch(proxyUrl, options);
      if (proxyRes.status === 404) {
        let host = '第三方模型接口';
        try {
          host = new URL(targetUrl).host;
        } catch {}
        throw new Error(
          `跨域(CORS)请求被浏览器拦截：[${host}] 不支持网页直接跨域访问。请在宝塔 Nginx 中添加 /api/proxy 反代规则。`
        );
      }
      return proxyRes;
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

  const instructionText = `You are an educational exam parser. Extract the full reading passage and all questions from these sequential images into JSON.
Output valid JSON only, starting with { and ending with }. Do not write pre-analysis or chain of thought.
If questions include a summary completion / cloze passage (e.g. Questions 1-7 with blanks like [1], [2]...), extract it into "summaryGroup". Non-summary questions go into "questions".
JSON Structure:
{
  "title": "Passage title",
  "subtitle": "Subtitle or section header",
  "paragraphs": ["First paragraph text...", "Second paragraph text..."],
  "summaryGroup": {
    "idRange": "1–7",
    "instruction": "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
    "paragraphGuide": "本题段落号对照: 第1、2题 → 段落 2 | ...",
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
}`;

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
    title: parsed.title || '阅读理解精读课件',
    subtitle: parsed.subtitle || '',
    paragraphs,
    questions,
  };
}
