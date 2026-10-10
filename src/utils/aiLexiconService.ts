import type { AIWordAnalysis, AITranslation } from '../types';
import { fetchWithAutoProxy, loadSavedAIConfig, type AIServiceConfig } from './aiVisionService';

/**
 * Extracts and parses JSON from raw AI model response
 */
function extractJSON(raw: string): any {
  let text = raw.trim();
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
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    throw new Error('未能解析模型返回的词汇释义数据');
  }
}

/**
 * Requests the configured AI model to analyze a selected word/phrase:
 * 1. Its precise meaning in the context of this specific article sentence.
 * 2. All common meanings and parts of speech of this word in English.
 * 3. Collocations, exam key points, and phonetic transcription.
 */
export async function explainWordWithAI(
  word: string,
  contextSentence: string,
  paragraphText: string = '',
  passageTitle: string = '',
  config: AIServiceConfig = loadSavedAIConfig()
): Promise<AIWordAnalysis> {
  if (!config.apiKey?.trim()) {
    throw new Error('未配置 API Key，请先点击右上角【设置】填写模型接口密钥');
  }

  const cleanWord = word.trim();
  if (!cleanWord) {
    throw new Error('选取的词语内容为空');
  }

  const systemPrompt = `You are a world-class English lexicographer and bilingual reading comprehension tutor (specializing in Oxford/Collins dictionaries and IELTS/TOEFL academic reading).
Your mission is to perform an in-depth, structured lexical analysis of a selected word or phrase from a reading passage.

CRITICAL INSTRUCTIONS:
1. "word": The target word or phrase.
2. "phonetic": IPA pronunciation (e.g. "/aʊtˈlændɪʃ/").
3. "contextualMeaning":
   - "pos": Part of speech in this sentence (e.g. "adj." or "v.").
   - "definition": Precise Chinese definition fitting this exact context (e.g. "稀奇古怪的，难以置信的").
   - "explanation": In-depth, pedagogical Chinese explanation of why and how this word is used in this sentence, what it modifies, and its contextual nuance.
4. "allMeanings": Array of all common definitions across parts of speech:
   - "pos": e.g. "adj.", "n.", "v."
   - "definition": Standard Chinese dictionary meaning
   - "example": Brief illustrative English phrase or sentence with Chinese translation
5. "collocations": Array of 2–5 key academic collocations, preposition patterns, or synonym substitutions (e.g. "outlandish claims 离奇的主张").

Return strictly valid JSON with this exact format. Do NOT wrap in conversational text. Start with { and end with }.

JSON Format Structure:
{
  "word": "${cleanWord}",
  "phonetic": "/.../",
  "contextualMeaning": {
    "pos": "adj.",
    "definition": "...",
    "explanation": "..."
  },
  "allMeanings": [
    {
      "pos": "adj.",
      "definition": "...",
      "example": "..."
    }
  ],
  "collocations": ["...", "..."]
}`;

  const userPrompt = `Please analyze the following word/phrase in context:

Article Title: ${passageTitle || 'Reading Passage'}
Full Paragraph Context:
"${paragraphText || contextSentence}"

Exact Sentence:
"${contextSentence}"

Target Word / Phrase to Analyze:
"${cleanWord}"

Please return the JSON lexical analysis now.`;

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
      temperature: 0.2,
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
    } catch {}
    throw new Error(`AI 词义解析接口请求失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  const resultData = await response.json();
  const choice = resultData.choices?.[0];
  let rawContent = (choice?.message?.content && choice.message.content.trim()) || '';
  if (!rawContent) {
    rawContent = choice?.message?.reasoning || choice?.message?.reasoning_content || choice?.text || '';
  }

  if (!rawContent) {
    throw new Error('模型未返回有效词义数据，请重试');
  }

  const parsed = extractJSON(rawContent);

  return {
    word: cleanWord,
    phonetic: parsed.phonetic || '',
    contextualMeaning: {
      pos: parsed.contextualMeaning?.pos || 'n./v.',
      definition: parsed.contextualMeaning?.definition || '',
      explanation: parsed.contextualMeaning?.explanation || '',
    },
    allMeanings: Array.isArray(parsed.allMeanings)
      ? parsed.allMeanings.map((m: any) => ({
          pos: m.pos || '',
          definition: m.definition || '',
          example: m.example || '',
        }))
      : [],
    collocations: Array.isArray(parsed.collocations) ? parsed.collocations : [],
  };
}

/**
 * Requests the configured AI model to translate the selected text in the context of the passage,
 * along with pedagogical syntax breakdown and key vocabulary.
 */
export async function translateTextWithAI(
  text: string,
  contextSentence: string,
  paragraphText: string = '',
  passageTitle: string = '',
  config: AIServiceConfig = loadSavedAIConfig()
): Promise<AITranslation> {
  if (!config.apiKey?.trim()) {
    throw new Error('未配置 API Key，请先点击右上角【设置】填写模型接口密钥');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('选取的文本内容为空');
  }

  const systemPrompt = `You are an expert bilingual English-Chinese literary and academic translator, and an experienced English reading exam instructor (specializing in IELTS, TOEFL, GRE, and academic English).
Your mission is to provide an accurate, fluent, contextual Chinese translation for the selected text from a reading passage, along with pedagogical structural breakdown and key academic vocabulary.

CRITICAL INSTRUCTIONS:
1. "text": The exact selected English text.
2. "translation": Natural, accurate, elegant Chinese translation (语境意译，符合地道中文表达习惯，精准反映在当前段落语境中的含义).
3. "literalTranslation": Direct or literal translation (直译对照，保留英文句式与逻辑语序，便于学生对照学习长难句结构).
4. "syntaxBreakdown": In-depth, pedagogical syntax analysis in Chinese (长难句结构拆解、主干提取、从句类型如定语从句/状语从句、非谓语动词短语、逻辑连接词或时态语态分析).
5. "keyVocabulary": Array of 2–6 key vocabulary words or phrases appearing in the selected text with their contextual meaning in Chinese:
   [{"word": "...", "meaning": "..."}]

Return strictly valid JSON with this exact format. Do NOT wrap in conversational markdown outside of JSON. Start with { and end with }.

JSON Format Structure:
{
  "text": "${cleanText}",
  "translation": "...",
  "literalTranslation": "...",
  "syntaxBreakdown": "...",
  "keyVocabulary": [
    {
      "word": "...",
      "meaning": "..."
    }
  ]
}`;

  const userPrompt = `Please translate and analyze the following selected text in context:

Article Title: ${passageTitle || 'Reading Passage'}
Full Paragraph Context:
"${paragraphText || contextSentence}"

Exact Surrounding Sentence:
"${contextSentence}"

Selected English Text to Translate:
"${cleanText}"

Please return the JSON contextual translation and syntax analysis now.`;

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
      temperature: 0.2,
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
    } catch {}
    throw new Error(`AI 划词翻译接口请求失败 (${response.status}): ${errorDetail || response.statusText}`);
  }

  const resultData = await response.json();
  const choice = resultData.choices?.[0];
  let rawContent = (choice?.message?.content && choice.message.content.trim()) || '';
  if (!rawContent) {
    rawContent = choice?.message?.reasoning || choice?.message?.reasoning_content || choice?.text || '';
  }

  if (!rawContent) {
    throw new Error('模型未返回有效翻译数据，请重试');
  }

  const parsed = extractJSON(rawContent);

  return {
    text: cleanText,
    translation: parsed.translation || '',
    literalTranslation: parsed.literalTranslation || '',
    syntaxBreakdown: parsed.syntaxBreakdown || '',
    keyVocabulary: Array.isArray(parsed.keyVocabulary)
      ? parsed.keyVocabulary.map((v: any) => ({
          word: v.word || '',
          meaning: v.meaning || '',
        }))
      : [],
  };
}

