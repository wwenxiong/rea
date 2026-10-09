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
  type: 'single' | 'multiple' | 'fill' | 'short-answer' | 'summary';
}

export interface SummaryItem {
  id: number;
  answer: string;
  evidenceText: string;
  explanation: string;
  evidenceRanges: HighlightRange[];
}

export interface SummaryGroup {
  idRange: string; // e.g. "1–7"
  title?: string;
  instruction: string; // "Complete the summary below. Choose NO MORE THAN TWO WORDS..."
  paragraphGuide?: string; // "本题段落号对照：第1、2题 → 段落 2..."
  paragraphs: string[]; // Content with blanks like [1], [2], [3]
  items: SummaryItem[];
}

export interface Courseware {
  id: string;
  title: string;
  // Optional subtitle / source info
  subtitle?: string;
  // Article paragraphs as string array
  paragraphs: string[];
  questions: Question[];
  summaryGroup?: SummaryGroup;
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
}
