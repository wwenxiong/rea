import React, { useState, useCallback, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import type { Courseware, Question, HighlightRange, SummaryGroup } from '../types';
import {
  parseExamImagesWithVision,
  loadSavedAIConfig,
} from '../utils/aiVisionService';
import {
  findEvidenceRanges,
  solvePaperWithAI,
  parseExamTextWithAI,
} from '../utils/aiSolveService';
import { sampleCourseware } from '../data/sampleCourseware';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (courseware: Courseware) => void;
  onOpenSettings?: () => void;
}

interface ParsedResult {
  title: string;
  subtitle: string;
  paragraphs: string[];
  questions: Omit<Question, 'evidenceRanges'>[];
  summaryGroup?: SummaryGroup;
}

const SAMPLE_TEXT_TEMPLATE = `Life in 2045
Reading Passage · Questions 1-13

The film, Back to the Future II, released in 1989, made a series of outlandish predictions about 2015, the year its key characters travel to from 1985. Although several of the film's predictions, like video calls and wearable technology, came true, Back to the Future II showed the pitfalls of making long-term forecasts. The world of 2015 was one of hoverboards, flying cars and power clothing, and instead we got Snapchat and selfies. Several experts have made their predictions about what the world of 2045 will look like. Alex Ayad, head of Imperial College London's Tech Foresight Practice forecasts that people will be able to purchase high-quality emotions online. Emotion-sharing experiences are the latest fad in 2045. Imagine your friend at a music festival can post a photo on Instagram and with it comes bundled a faint twinkling of what she was feeling right there in that moment, so you too can share emotionally in her social experience. Recently, techniques for direct brain stimulation, like optogenetics, have made it possible to not only read but also write information into single neurons. At the moment data transfer rates are still very slow, the best we can do is a few bits per second, but this could well increase to kilobits or maybe reach broadband speeds by 2045. This means the range of human perception could expand beyond its current design limitations.

Our cities will be made from living, dynamic materials that respond to the environment. In 30 years, tall buildings made of glass and twisted steel will be seen as relics from a bygone era, in the same way we think now of 1970s concrete tower blocks: ugly, out-dated and unfit for contemporary purpose. The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable. Entirely new synthetic life forms, or biological machines, made of engineered living cells from bacteria, fungi and algae will grow and evolve with the changing needs of a building's inhabitants. They breathe in pollutants, clean wastewater, and use sunlight to make useful chemicals, energy, heat and vibrant vertical gardens. We will start to see a convergence between biology and technology, to the point where there is no longer a perceptible difference between the two.

8. The film Back to the Future II forecasts for 2015
A were not completely wrong.
B were not all related to technology.
C did not turn out to be true.
D led to several important inventions.
答案: A
依据: Although several of the film's predictions, like video calls and wearable technology, came true, Back to the Future II showed the pitfalls of making long-term forecasts.
解析: 第一段明确提到虽然预测有偏差，但视频通话和可穿戴技术确实成真了，因此预测并非完全错误（were not completely wrong）。

9. By 2045, certain brain stimulation techniques
A are unlikely to affect human perception.
B will have no impact on the way humans perceive.
C could alter human perception.
D will reach the limits of the human perception.
答案: C
依据: This means the range of human perception could expand beyond its current design limitations.
解析: 第一段末句明确说明，这意味着人类感知的范围可能会扩展超越当下的设计局限，即可能改变人类感知能力。

10. According to Alex Ayad, in 2045 cities will have
A tower blocks with a special type of steel and glass.
B structures that are built with reusable materials.
C more attractive buildings than in the past.
D buildings that are partially alive.
答案: D
依据: Entirely new synthetic life forms, or biological machines, made of engineered living cells from bacteria, fungi and algae will grow and evolve with the changing needs of a building's inhabitants.
解析: 第二段指出，由细菌和藻类活细胞构成的合成生命体将与建筑物融合生长进化，即建筑在某种程度上具备生命活性。`;

export const SENSENOVA_IDENTIFIED_LIFE_2045: ParsedResult = {
  title: sampleCourseware.title,
  subtitle: 'Reading Passage · Questions 1-13 (商汤日日新 AI 视觉提取结果)',
  paragraphs: sampleCourseware.paragraphs,
  summaryGroup: sampleCourseware.summaryGroup,
  questions: sampleCourseware.questions.map(({ evidenceRanges, ...rest }) => rest),
};

export function parseExamText(rawText: string): ParsedResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { title: '', subtitle: '', paragraphs: [], questions: [] };
  }

  let title = '';
  let subtitle = '';
  let startIdx = 0;

  const isMetaLine = (l: string) =>
    /^(READING PASSAGE|PASSAGE|SECTION|PART)\b/i.test(l) ||
    /^(You should spend about|Spend about|Questions?\s+\d+[\s–\-~至到]+\d+)/i.test(l);

  // Check if first line(s) are metadata headers like "READING PASSAGE" or time instructions
  if (lines.length > 0 && isMetaLine(lines[0])) {
    const metaParts: string[] = [];
    while (startIdx < lines.length && isMetaLine(lines[startIdx])) {
      metaParts.push(lines[startIdx]);
      startIdx++;
    }
    subtitle = metaParts.join(' · ');
    if (startIdx < lines.length) {
      title = lines[startIdx];
      startIdx++;
    }
  } else if (lines.length > 0) {
    title = lines[0];
    startIdx = 1;
    if (
      lines.length > 1 &&
      (isMetaLine(lines[1]) ||
        (lines[1].length < 80 &&
          !/^[0-9一二三四五]+[.\u3001、)）]/.test(lines[1]) &&
          !lines[1].endsWith('.')))
    ) {
      subtitle = lines[1];
      startIdx = 2;
    }
  }

  // Identify where Questions begin
  const isQuestionStartLine = (line: string) => {
    if (/^Questions?\s+\d+/i.test(line)) return true;
    if (/^(Complete the (summary|notes|table|sentences)|Summary)/i.test(line)) return true;
    if (
      /^(Do the following statements agree|Look at the following|Choose the correct letter|Choose TWO letters)/i.test(
        line
      )
    )
      return true;
    if (/^[1-9]\d*[.\u3001\uff0e)\s]/.test(line)) return true;
    if (/^[一二三四五]、/.test(line)) return true;
    return false;
  };

  let questionStartLine = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (isQuestionStartLine(lines[i])) {
      questionStartLine = i;
      break;
    }
  }

  const articleLines =
    questionStartLine === -1 ? lines.slice(startIdx) : lines.slice(startIdx, questionStartLine);
  const paragraphs = articleLines.filter(Boolean);

  if (questionStartLine === -1) {
    return { title, subtitle, paragraphs, questions: [] };
  }

  const questionLines = lines.slice(questionStartLine);
  let summaryGroup: SummaryGroup | undefined = undefined;
  const questions: Omit<Question, 'evidenceRanges'>[] = [];

  // Segment into Question Blocks by "Questions X–Y"
  const rangeHeaderRegex = /^Questions?\s+(\d+)[\s–\-~至到]+(\d+)/i;
  const sections: Array<{
    start: number;
    end?: number;
    header?: string;
    range: string;
    fromId: number;
    toId: number;
  }> = [];

  let currentSec = { start: 0, range: '', fromId: 1, toId: 999 };

  for (let i = 0; i < questionLines.length; i++) {
    const match = questionLines[i].match(rangeHeaderRegex);
    if (match) {
      if (i > 0) {
        sections.push({ ...currentSec, end: i });
      }
      currentSec = {
        start: i,
        range: `${match[1]}–${match[2]}`,
        fromId: parseInt(match[1], 10),
        toId: parseInt(match[2], 10),
      };
    }
  }
  sections.push({ ...currentSec, end: questionLines.length });

  const answerPattern = /^[\u7b54\u6848\u53c2\u8003\u7b54\u6848Answer]+[:\uff1a\s]+(.+)/i;
  const explanationPattern = /^[\u89e3\u6790\u8be6\u89e3\u5206\u6790Explanation]+[:\uff1a\s]+(.+)/i;
  const evidencePattern = /^[\u539f\u6587\u4f9d\u636eEvidence\u7b54\u6848\u4f9d\u636e\u5b9a\u4f4d\u4f9d\u636e]+[:\uff1a\s]+(.+)/i;

  for (const sec of sections) {
    const secLines = questionLines.slice(sec.start, sec.end);
    const secText = secLines.join('\n');

    const hasSummaryKw = /summary|cloze|Complete the/i.test(secText);
    const hasBlanks = /\b[1-9]\d*\s*(?:\.{2,}|_{2,}|\(\d+\)|\[\d+\])/.test(secText);

    if (hasSummaryKw && hasBlanks) {
      const idRange = sec.range || '1–9';
      let instruction = '';
      let summaryTitle = '';
      const summaryParas: string[] = [];
      const wordBankOptions: string[] = [];

      let lineIdx = 0;
      if (rangeHeaderRegex.test(secLines[0])) {
        lineIdx = 1;
      }

      if (lineIdx < secLines.length && /Complete the summary/i.test(secLines[lineIdx])) {
        instruction = secLines[lineIdx];
        lineIdx++;
      }

      const contentLines: string[] = [];
      for (; lineIdx < secLines.length; lineIdx++) {
        const l = secLines[lineIdx];
        // Word bank detection (lines like "A disadvantage   B quality   C retirement" or single "A disadvantage")
        if (
          /^[A-Z][\s\t.\)]+\w+[\s\t]+[B-Z][\s\t.\)]+\w+/i.test(l) ||
          (/^[A-Z][\s\t.\)]+[^\t\n]+$/i.test(l) && contentLines.length > 0)
        ) {
          const matches = l.match(/([A-Z])[\s\t.\)]+([^\t\nA-Z]+(?:\s+[^\t\nA-Z]+)*)/g);
          if (matches) {
            matches.forEach((m) => wordBankOptions.push(m.trim()));
          } else {
            wordBankOptions.push(l.trim());
          }
        } else {
          contentLines.push(l);
        }
      }

      let pStartIndex = 0;
      if (
        contentLines.length > 1 &&
        contentLines[0].length < 60 &&
        !/\b[1-9]\d*\s*(?:\.{2,}|_{2,})/.test(contentLines[0])
      ) {
        summaryTitle = contentLines[0];
        pStartIndex = 1;
      }

      const rawSummaryPara = contentLines.slice(pStartIndex).join(' ');
      const normalizedPara = rawSummaryPara.replace(
        /\b([1-9]\d*)\s*(?:\.{2,}|_{2,}|\(\d+\)|\[\d+\])/g,
        '[$1]'
      );
      summaryParas.push(normalizedPara);

      const blankMatches = [
        ...rawSummaryPara.matchAll(/\b([1-9]\d*)\s*(?:\.{2,}|_{2,}|\(\d+\)|\[\d+\])/g),
      ];
      const blankIds = blankMatches.map((m) => parseInt(m[1], 10));

      const items = blankIds.map((id) => ({
        id,
        answer: '',
        evidenceText: '',
        explanation: '',
        evidenceRanges: [],
      }));

      let paragraphGuide = '';
      if (wordBankOptions.length > 0) {
        paragraphGuide = `备选词表: ${wordBankOptions.join('  |  ')}`;
      }

      summaryGroup = {
        idRange,
        title: summaryTitle,
        instruction: instruction || 'Complete the summary below.',
        paragraphGuide,
        paragraphs: summaryParas,
        items,
      };

      for (const item of items) {
        questions.push({
          id: item.id,
          stem: `[${item.id}] 摘要填空题 (${summaryTitle || 'Summary'})`,
          options: wordBankOptions,
          answer: '',
          explanation: '',
          evidenceText: '',
          type: 'summary',
        });
      }
    } else {
      // Multiple Choice / True-False-Not Given / Yes-No-Not Given
      const isYesNo = /YES[\s\S]*?NO[\s\S]*?NOT GIVEN/i.test(secText);
      const isTrueFalse = /TRUE[\s\S]*?FALSE[\s\S]*?NOT GIVEN/i.test(secText);

      const defaultOptions = isYesNo
        ? ['A. YES', 'B. NO', 'C. NOT GIVEN']
        : isTrueFalse
        ? ['A. TRUE', 'B. FALSE', 'C. NOT GIVEN']
        : [];

      const qNumPattern = /^(\d+)[.\u3001\uff0e)\s]+(.*)/;
      const optPattern = /^([A-Da-d])[.\u3001\uff0e)\s]+(.*)/;

      let currentQ: {
        id: number;
        stem: string;
        options: string[];
        answer: string;
        explanation: string;
        evidenceText: string;
        type: 'single' | 'multiple' | 'fill' | 'short-answer' | 'summary';
      } | null = null;

      for (const line of secLines) {
        if (rangeHeaderRegex.test(line)) continue;
        if (/^(Do the following|Write:|●|Choose the|Write the correct)/i.test(line)) continue;
        if (/^(YES if|NO if|NOT GIVEN if|TRUE if|FALSE if)/i.test(line)) continue;

        const qMatch = line.match(qNumPattern);
        const optMatch = line.match(optPattern);
        const ansMatch = line.match(answerPattern);
        const expMatch = line.match(explanationPattern);
        const eviMatch = line.match(evidencePattern);

        if (qMatch) {
          if (currentQ) questions.push(currentQ);
          currentQ = {
            id: parseInt(qMatch[1], 10),
            stem: qMatch[2] || '',
            options: defaultOptions.length > 0 ? [...defaultOptions] : [],
            answer: '',
            explanation: '',
            evidenceText: '',
            type: 'single',
          };
        } else if (optMatch && currentQ) {
          if (
            defaultOptions.length > 0 &&
            currentQ.options.length === 3 &&
            currentQ.options[0].includes('YES')
          ) {
            currentQ.options = [];
          }
          currentQ.options.push(`${optMatch[1].toUpperCase()}. ${optMatch[2]}`);
        } else if (ansMatch && currentQ) {
          currentQ.answer = ansMatch[1].trim();
        } else if (expMatch && currentQ) {
          currentQ.explanation = expMatch[1].trim();
        } else if (eviMatch && currentQ) {
          currentQ.evidenceText = eviMatch[1].trim();
        } else if (currentQ && currentQ.options.length === 0) {
          currentQ.stem += ` ${line}`;
        }
      }

      if (currentQ) questions.push(currentQ);
    }
  }

  questions.sort((a, b) => a.id - b.id);
  return { title, subtitle, paragraphs, summaryGroup, questions };
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'word' | 'text'>('image');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Word docx state
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [wordRawText, setWordRawText] = useState('');
  const [wordStatus, setWordStatus] = useState('');
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Multi-image state
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; url: string; file: File }>>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeStatus, setRecognizeStatus] = useState('');
  const [recognitionError, setRecognitionError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI parsing state for text and word
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [aiParseStatus, setAiParseStatus] = useState('');
  const [aiParseError, setAiParseError] = useState('');

  // Preview AI solve state
  const [isSolvingPreview, setIsSolvingPreview] = useState(false);
  const [solvePreviewStatus, setSolvePreviewStatus] = useState('');
  const [solvePreviewError, setSolvePreviewError] = useState('');

  // Read current AI config
  const aiConfig = loadSavedAIConfig();

  const handlePreviewAISolve = async () => {
    if (!parsed) return;
    if (!aiConfig.apiKey.trim()) {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        alert('请先在系统设置中配置 API Key');
      }
      return;
    }

    setIsSolvingPreview(true);
    setSolvePreviewError('');
    setSolvePreviewStatus('正在准备试卷结构...');

    try {
      const dummyCourseware: Courseware = {
        id: 'preview-temp',
        title: parsed.title,
        subtitle: parsed.subtitle,
        paragraphs: parsed.paragraphs,
        questions: parsed.questions.map((q) => ({
          ...q,
          evidenceRanges: [],
        })),
        summaryGroup: parsed.summaryGroup,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const solved = await solvePaperWithAI(
        dummyCourseware,
        aiConfig,
        (status) => setSolvePreviewStatus(status)
      );

      setParsed({
        title: solved.title,
        subtitle: solved.subtitle || '',
        paragraphs: solved.paragraphs,
        questions: solved.questions,
        summaryGroup: solved.summaryGroup,
      });
    } catch (err: any) {
      setSolvePreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSolvingPreview(false);
      setSolvePreviewStatus('');
    }
  };

  // Compress image file to prevent huge base64 token exhaustion
  const compressImageFile = (file: File, maxDim = 1400, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Convert image files to compressed base64
  const addImageFiles = useCallback((files: FileList | File[]) => {
    setRecognitionError('');
    Array.from(files).forEach(async (file) => {
      if (!file.type.startsWith('image/')) return;
      try {
        const url = await compressImageFile(file);
        setUploadedImages((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, url, file },
        ]);
      } catch {
        // Fallback
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          if (url) {
            setUploadedImages((prev) => [
              ...prev,
              { id: `${Date.now()}-${Math.random()}`, url, file },
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  // Listen to clipboard paste (Ctrl+V)
  useEffect(() => {
    if (!isOpen || activeTab !== 'image') return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        addImageFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab, addImageFiles]);

  const handleRemoveImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setUploadedImages((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Word file handler
  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWordFile(file);
    setWordStatus('正在读取 Word 文档内容...');
    setAiParseError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extractedText = result.value.trim();

      if (!extractedText) {
        throw new Error('Word 文档内容为空，未能识别到有效文字');
      }

      setWordRawText(extractedText);
      setWordStatus(
        `成功提取 ${(extractedText.length / 1000).toFixed(1)}k 字，可点击下方生成导入`
      );
    } catch (err) {
      setWordStatus(`读取 Word 失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Execute AI Parsing on raw text or Word text
  const handleAIParse = async (overrideText?: string) => {
    const textToProcess = (overrideText !== undefined ? overrideText : rawText).trim();
    if (!textToProcess) {
      setAiParseError('试卷内容为空，请先输入或粘贴试卷文字');
      return;
    }
    if (!aiConfig.apiKey.trim()) {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        setAiParseError('尚未配置 API Key，请点击右上角【设置】进行配置');
      }
      return;
    }

    setIsAIParsing(true);
    setAiParseError('');
    setAiParseStatus('正在分析试卷正文并生成题目解析...');

    try {
      const result = await parseExamTextWithAI(
        textToProcess,
        aiConfig,
        (status) => setAiParseStatus(status)
      );
      setParsed(result);
      setStep('preview');
    } catch (err: any) {
      setAiParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAIParsing(false);
      setAiParseStatus('');
    }
  };

  // Execute AI Multi-modal Vision Recognition
  const handleStartVisionRecognition = async () => {
    if (uploadedImages.length === 0) {
      setRecognitionError('请先上传至少一张试卷图片');
      return;
    }
    if (!aiConfig.apiKey.trim()) {
      setRecognitionError('尚未配置 API Key，请点击右上角【设置】按钮进行配置');
      return;
    }

    // Validate model modality: DeepSeek/GLM/Kimi are text-only models
    const effectiveConfig = { ...aiConfig };
    const modelLower = effectiveConfig.model.toLowerCase();
    if (modelLower.includes('deepseek') || modelLower.includes('glm') || modelLower.includes('kimi')) {
      if (effectiveConfig.baseUrl.includes('sensenova.cn')) {
        // Automatically switch to the only vision-supported model in this account!
        effectiveConfig.model = 'sensenova-6.8-flash-lite';
      } else {
        setRecognitionError(
          `模型 [${effectiveConfig.model}] 为纯文本模型，不支持图像输入。请在设置中切换为支持视觉的多模态模型（如 sensenova-6.8-flash-lite、qwen-vl-max 或 gpt-4o）。`
        );
        return;
      }
    }

    setIsRecognizing(true);
    setRecognitionError('');
    setRecognizeStatus('正在处理图片数据...');

    try {
      const base64List = uploadedImages.map((img) => img.url);
      const result = await parseExamImagesWithVision(
        base64List,
        effectiveConfig,
        (status) => setRecognizeStatus(status)
      );

      setParsed(result);
      setStep('preview');
    } catch (err) {
      setRecognitionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRecognizing(false);
      setRecognizeStatus('');
    }
  };

  const handleParseText = useCallback(() => {
    const result = parseExamText(rawText);
    setParsed(result);
    setStep('preview');
  }, [rawText]);

  const handleLoadSample = useCallback(() => {
    setRawText(SAMPLE_TEXT_TEMPLATE);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!parsed) return;

    const questions: Question[] = parsed.questions.map((q) => ({
      ...q,
      evidenceRanges: findEvidenceRanges(parsed.paragraphs, q.evidenceText),
    }));

    let summaryGroup: SummaryGroup | undefined = undefined;
    if (parsed.summaryGroup) {
      summaryGroup = {
        ...parsed.summaryGroup,
        items: parsed.summaryGroup.items.map((it) => ({
          ...it,
          evidenceRanges:
            it.evidenceRanges && it.evidenceRanges.length > 0
              ? it.evidenceRanges
              : findEvidenceRanges(parsed.paragraphs, it.evidenceText),
        })),
      };
    }

    const courseware: Courseware = {
      id: `cw-${Date.now()}`,
      title: parsed.title || '阅读理解精读课件',
      subtitle: parsed.subtitle || '教师导入课件',
      paragraphs: parsed.paragraphs,
      questions,
      summaryGroup,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onImport(courseware);
    setUploadedImages([]);
    setWordFile(null);
    setWordRawText('');
    setRawText('');
    setParsed(null);
    setStep('input');
    setIsAIParsing(false);
    setAiParseError('');
    setAiParseStatus('');
    onClose();
  }, [parsed, onImport, onClose]);

  const handleClose = useCallback(() => {
    setUploadedImages([]);
    setWordFile(null);
    setWordRawText('');
    setRawText('');
    setParsed(null);
    setStep('input');
    setRecognitionError('');
    setIsAIParsing(false);
    setAiParseError('');
    setAiParseStatus('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              {step === 'input' ? '导入试卷' : '试卷内容预览'}
            </h2>
            {step === 'input' && (
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('image')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'image'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  图片识别
                </button>
                <button
                  onClick={() => setActiveTab('word')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'word'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Word 文档
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'text'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  文本粘贴
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'input' && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-md transition-colors"
                title="设置"
              >
                <span>⚙ 模型设置</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' ? (
            activeTab === 'image' ? (
              /* Image Upload Tab */
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) addImageFiles(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-6 text-center bg-slate-50/40 hover:bg-slate-50 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && addImageFiles(e.target.files)}
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    点击选择试卷图片，或直接拖拽图片到此处
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    支持多张跨页图片组合，也可以直接在弹窗内按 <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] text-slate-600">Ctrl+V</kbd> 粘贴截图
                  </p>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>已选图片 ({uploadedImages.length} 张) · 可按顺序上下调整</span>
                      <button
                        onClick={() => setUploadedImages([])}
                        className="text-red-500 hover:text-red-600 font-normal"
                      >
                        清空全部
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={img.id}
                          className="relative group bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3"
                        >
                          <img
                            src={img.url}
                            alt={`试卷第 ${idx + 1} 页`}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <span className="font-bold text-slate-800 block">第 {idx + 1} 部分</span>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {img.file.name || '试卷截图'}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'up'); }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 disabled:opacity-20 text-[10px]"
                              title="上移"
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === uploadedImages.length - 1}
                              onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'down'); }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 disabled:opacity-20 text-[10px]"
                              title="下移"
                            >
                              ▼
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-red-50 text-red-500 text-[10px]"
                              title="移除"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recognitionError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0">提示:</span>
                      <span>{recognitionError}</span>
                    </div>
                    {onOpenSettings && (
                      <button
                        onClick={onOpenSettings}
                        className="underline text-red-800 font-semibold shrink-0"
                      >
                        前往设置
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'word' ? (
              /* Word Document Tab */
              <div className="space-y-5">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith('.docx') || file.type.includes('word'))) {
                      const input = wordInputRef.current;
                      if (input) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        input.files = dt.files;
                        handleWordFileChange({ target: input } as any);
                      }
                    }
                  }}
                  className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-10 text-center bg-slate-50/40 hover:bg-slate-50 transition-all cursor-pointer"
                  onClick={() => wordInputRef.current?.click()}
                >
                  <input
                    ref={wordInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleWordFileChange}
                  />
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 17.5l-1.5-6h1.5l.8 3.8.8-3.8h1.5l-1.5 6h-1.6zm7.5 0h-1.5l-1.2-4.5-.8 3.5h-1.5l1.5-6h1.5l1.2 4.5.8-3.5H16l-1.5 6z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    点击选择试卷 Word 文档 (.docx)，或直接将文件拖拽到此处
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    支持 .docx 格式，自动提取文章段落与试题列表
                  </p>
                </div>

                {wordFile && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{wordFile.name}</span>
                        <span className="text-slate-400">({(wordFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <span className="text-emerald-700 font-medium">{wordStatus}</span>
                    </div>

                    {wordRawText && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => {
                            const parsedRes = parseExamText(wordRawText);
                            setParsed(parsedRes);
                            setStep('preview');
                          }}
                          disabled={isAIParsing}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="仅提取文本结构，不自动生成答案"
                        >
                          常规导入
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAIParse(wordRawText)}
                          disabled={isAIParsing}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {isAIParsing && (
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          <span>{isAIParsing ? '正在解析试卷内容...' : '生成答案与解析导入'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {aiParseError && activeTab === 'word' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0">提示:</span>
                      <span>{aiParseError}</span>
                    </div>
                    {onOpenSettings && (
                      <button
                        onClick={onOpenSettings}
                        className="underline text-red-800 font-semibold shrink-0"
                      >
                        前往设置配置
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Plain Text Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <span>粘贴试卷文本</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      （支持粘贴文章正文与题目内容）
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLoadSample}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md transition-colors"
                    >
                      填入示例内容
                    </button>
                    <button
                      onClick={() => {
                        setRawText('');
                        setAiParseError('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="在此直接粘贴试卷的全文内容（文章与题目）...

系统将自动提取文章段落、识别各类试题，并生成对应参考答案与原文精读解析。"
                  className="w-full h-96 p-4 text-xs font-mono border border-slate-200 rounded-xl leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none bg-slate-50/30"
                />

                {aiParseError && activeTab === 'text' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0">提示:</span>
                      <span>{aiParseError}</span>
                    </div>
                    {onOpenSettings && (
                      <button
                        onClick={onOpenSettings}
                        className="underline text-red-800 font-semibold shrink-0"
                      >
                        前往设置
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            /* Preview Step */
            parsed && (() => {
              const unsolvedPreviewCount =
                (parsed.summaryGroup ? parsed.summaryGroup.items.filter((it) => !it.answer?.trim()).length : 0) +
                parsed.questions.filter((q) => !q.answer?.trim()).length;

              return (
              <div className="space-y-6">
                {/* AI Solve Banner in Preview */}
                <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">📝</span>
                    <div>
                      <div className="font-bold text-indigo-950 text-xs">
                        试题答案与原文解析
                      </div>
                      <div className="text-[11px] text-indigo-600">
                        {unsolvedPreviewCount > 0
                          ? `尚有 ${unsolvedPreviewCount} 道试题待补充答案，点击可自动生成答案与原文依据句`
                          : '当前已具备完整答案与依据，可点击重新生成'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePreviewAISolve}
                    disabled={isSolvingPreview}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-all shadow-xs shrink-0 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSolvingPreview ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{solvePreviewStatus || '正在生成解析...'}</span>
                      </>
                    ) : (
                      <span>自动生成解析</span>
                    )}
                  </button>
                </div>

                {solvePreviewError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <span className="font-bold">生成异常:</span>
                    <span>{solvePreviewError}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">课件标题</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 truncate block">
                      {parsed.title || '（未识别，将使用默认标题）'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">识别段落数</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {parsed.paragraphs.length} 个自然段
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">识别试题数</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {parsed.questions.length} 道试题
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    题目及定位依据句识别详情
                  </h3>
                  <div className="space-y-3">
                    {parsed.summaryGroup && (
                      <div className="bg-red-50/60 border border-red-200 p-4 rounded-xl text-xs space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              摘要填空题 (Questions {parsed.summaryGroup.idRange})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                              共 {parsed.summaryGroup.items.length} 个填空项
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {parsed.summaryGroup.paragraphGuide}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-200/60">
                          {parsed.summaryGroup.items.map((item) => {
                            const ranges = findEvidenceRanges(parsed.paragraphs, item.evidenceText);
                            const hasMatched = ranges.length > 0 || (item.evidenceRanges && item.evidenceRanges.length > 0);
                            return (
                              <div key={item.id} className="bg-white p-2.5 rounded-lg border border-red-100 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="min-w-0">
                                  <span className="font-extrabold text-red-600 mr-1.5">[{item.id}]</span>
                                  <span className="font-bold text-slate-800">{item.answer}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${hasMatched ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {hasMatched ? '依据已定位' : '待定位'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {parsed.questions.map((q) => {
                      const ranges = findEvidenceRanges(parsed.paragraphs, q.evidenceText);
                      const hasMatchedEvidence = ranges.length > 0;

                      return (
                        <div
                          key={q.id}
                          className="bg-white border border-slate-200 p-4 rounded-xl text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-800 text-sm">
                              第 {q.id} 题：{q.stem}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                                hasMatchedEvidence
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {hasMatchedEvidence
                                ? `原句已匹配 (P${ranges[0].paragraphIndex + 1})`
                                : '未匹配到依据句'}
                            </span>
                          </div>

                          {q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 pl-2 text-slate-600">
                              {q.options.map((opt, i) => (
                                <div key={i}>{opt}</div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 pt-1 text-[11px] border-t border-slate-100">
                            {q.answer && (
                              <span className="font-bold text-slate-700">
                                答案：<span className="text-emerald-600">{q.answer}</span>
                              </span>
                            )}
                            {q.evidenceText && (
                              <span className="text-slate-500 truncate flex-1 font-mono">
                                依据原句："{q.evidenceText}"
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ); })()
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-400">
            {step === 'input' ? (
              activeTab === 'image' ? (
                isRecognizing ? (
                  <span className="text-slate-800 font-medium animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {recognizeStatus || '正在分析图片版面...'}
                  </span>
                ) : (
                  '支持连续图片，自动识别文章、试题与答案依据'
                )
              ) : isAIParsing ? (
                <span className="text-indigo-700 font-medium animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  {aiParseStatus || '正在分析试卷内容...'}
                </span>
              ) : activeTab === 'word' ? (
                '选择或拖拽 .docx 试卷文件，自动提取正文、试题与答案'
              ) : (
                '自动划分文章段落、提取试题并生成答案与依据'
              )
            ) : (
              '确认后将进入精读课件'
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                返回修改
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={isRecognizing || isAIParsing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              取消
            </button>
            {step === 'input' ? (
              activeTab === 'image' ? (
                <button
                  onClick={handleStartVisionRecognition}
                  disabled={uploadedImages.length === 0 || isRecognizing}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isRecognizing && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isRecognizing ? '正在识别图片内容...' : `开始识别 (${uploadedImages.length}张图片)`}</span>
                </button>
              ) : activeTab === 'word' ? (
                wordRawText ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const parsedRes = parseExamText(wordRawText);
                        setParsed(parsedRes);
                        setStep('preview');
                      }}
                      disabled={isAIParsing}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="仅提取文本结构，不自动生成答案"
                    >
                      常规导入
                    </button>
                    <button
                      onClick={() => handleAIParse(wordRawText)}
                      disabled={isAIParsing}
                      className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      {isAIParsing && (
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>{isAIParsing ? '正在解析试卷内容...' : '生成答案与解析导入'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => wordInputRef.current?.click()}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    选择 Word 文件
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleParseText}
                    disabled={!rawText.trim() || isAIParsing}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    title="仅提取文本结构，不自动生成答案"
                  >
                    常规导入
                  </button>
                  <button
                    onClick={() => handleAIParse()}
                    disabled={!rawText.trim() || isAIParsing}
                    className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isAIParsing && (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isAIParsing ? '正在解析试卷内容...' : '生成答案与解析导入'}</span>
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={handleConfirm}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                确认并开始精读
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
