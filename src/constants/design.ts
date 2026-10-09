export const FONT_SIZES = [
  { label: '标准', value: 16 },
  { label: '大号', value: 20 },
  { label: '特大', value: 24 },
  { label: '投影', value: 28 },
] as const;

export const DEFAULT_FONT_SIZE = 18;
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 32;
export const FONT_SIZE_STEP = 2;

export const LINE_HEIGHT_RATIO = 1.8;
export const LETTER_SPACING = '0.02em';

export const SCROLL_DURATION = 380;
export const SCROLL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const PANEL_RATIO = {
  article: 66.7,
  questions: 33.3,
} as const;
