export interface HighlightRange {
  // Which paragraph (0-indexed)
  paragraphIndex: number;
  // Start character offset within the paragraph
  startOffset: number;
  // End character offset within the paragraph
  endOffset: number;
}

export interface Question {
  id: number;
  // Question stem text
  stem: string;
  // Options array, e.g. ['A. xxx', 'B. xxx', ...]
  options: string[];
  // Correct answer label, e.g. 'A' or 'AB' for multi-select
  answer: string;
  // Detailed explanation
  explanation: string;
  // The exact sentence(s) in the article that support the answer
  evidenceText: string;
  // Where in the article the evidence is located
  evidenceRanges: HighlightRange[];
  // Question type
  type: 'single' | 'multiple' | 'fill' | 'short-answer' | 'summary' | 'cloze';
}

export interface SummaryItem {
  id: number;
  answer: string;
  evidenceText: string;
  explanation: string;
  evidenceRanges: HighlightRange[];
}

export interface WordBankItem {
  letter: string; // e.g. "A"
  word: string;   // e.g. "disadvantage"
  translation?: string; // e.g. "n. 缺点，劣势"
  pos?: string; // e.g. "n."
  explanation?: string; // 试题解析或干扰项解析
  matchedQuestionId?: number; // 对应的题号，如 3
}

export interface SummaryGroup {
  idRange: string; // e.g. "1–7"
  title?: string;
  instruction: string; // "Complete the summary below. Choose NO MORE THAN TWO WORDS..."
  paragraphGuide?: string; // "本题段落号对照：第1、2题 → 段落 2..."
  wordBankAnalysis?: WordBankItem[]; // 备选词表深度解析
  paragraphs: string[]; // Content with blanks like [1], [2], [3]
  items: SummaryItem[];
}

export interface AIWordAnalysis {
  word: string;
  phonetic?: string;
  contextualMeaning: {
    pos: string; // 词性, 如 adj.
    definition: string; // 本文释义
    explanation: string; // 语境深入解析
  };
  allMeanings: Array<{
    pos: string;
    definition: string;
    example?: string;
  }>;
  collocations?: string[]; // 常用搭配与考点
}

export interface AITranslation {
  text: string;
  translation: string;
  literalTranslation?: string;
  syntaxBreakdown?: string;
  keyVocabulary?: Array<{ word: string; meaning: string }>;
}

export interface ArticleAnnotation {
  id: string;
  text: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  color: string; // Highlight hex color
  note?: string; // User note text
  aiAnalysis?: AIWordAnalysis;
  aiTranslation?: AITranslation;
  createdAt: number;
  updatedAt: number;
}

export interface Courseware {
  id: string;
  title: string;
  // Optional subtitle / source info
  subtitle?: string;
  // Courseware category type: standard reading comprehension or cloze test
  coursewareType?: 'reading' | 'cloze';
  // Article paragraphs as string array
  paragraphs: string[];
  questions: Question[];
  summaryGroup?: SummaryGroup;
  annotations?: ArticleAnnotation[];
  createdAt: number;
  updatedAt: number;
}

export type TeachingMode = 'teach' | 'review';

export interface AppState {
  courseware: Courseware | null;
  currentMode: TeachingMode;
  fontSize: number;
  activeQuestionId: number | null;
  showAnswers: Record<number, boolean>;
  areAnswersShown: boolean;
  // Quiz state for Cloze & interactive answering
  userAnswers: Record<number, string>;
  isSubmitted: boolean;
  revealedBlanks: Record<number, boolean>;
}
