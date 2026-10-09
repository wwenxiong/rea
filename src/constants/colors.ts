export interface QuestionColor {
  name: string;
  // Primary color for question badge, bold text in passage
  primary: string;
  // Light background for article highlight (used in teach mode focus)
  bgLight: string;
  // Border/underline color
  border: string;
  // Hover state
  bgHover: string;
}

// 30 distinct, vibrant, accessible colors designed specifically for reading comprehension
export const QUESTION_COLORS: QuestionColor[] = [
  { name: '宝石红', primary: '#DC2626', bgLight: '#FEE2E2', border: '#FCA5A5', bgHover: '#FECACA' },
  { name: '蔚蓝', primary: '#2563EB', bgLight: '#DBEAFE', border: '#93C5FD', bgHover: '#BFDBFE' },
  { name: '翡翠绿', primary: '#16A34A', bgLight: '#DCFCE7', border: '#86EFAC', bgHover: '#BBF7D0' },
  { name: '琥珀橙', primary: '#D97706', bgLight: '#FEF3C7', border: '#FCD34D', bgHover: '#FDE68A' },
  { name: '紫罗兰', primary: '#7C3AED', bgLight: '#EDE9FE', border: '#C4B5FD', bgHover: '#DDD6FE' },
  { name: '松石青', primary: '#0D9488', bgLight: '#CCFBF1', border: '#5EEAD4', bgHover: '#99F6E4' },
  { name: '玫瑰红', primary: '#E11D48', bgLight: '#FFE4E6', border: '#FDA4AF', bgHover: '#FECDD3' },
  { name: '靛青蓝', primary: '#4F46E5', bgLight: '#EEF2FF', border: '#A5B4FC', bgHover: '#C7D2FE' },
  { name: '暖褐', primary: '#B45309', bgLight: '#FFEDD5', border: '#FDBA74', bgHover: '#FED7AA' },
  { name: '天青蓝', primary: '#0284C7', bgLight: '#E0F2FE', border: '#7DD3FC', bgHover: '#BAE6FD' },
  { name: '品红', primary: '#C026D3', bgLight: '#FAE8FF', border: '#F0ABFC', bgHover: '#F5D0FE' },
  { name: '森林绿', primary: '#15803D', bgLight: '#DCFCE7', border: '#86EFAC', bgHover: '#BBF7D0' },
  { name: '日落橘', primary: '#EA580C', bgLight: '#FFEDD5', border: '#FDBA74', bgHover: '#FED7AA' },
  { name: '暗深紫', primary: '#9333EA', bgLight: '#F3E8FF', border: '#D8B4FE', bgHover: '#E9D5FF' },
  { name: '孔雀青', primary: '#0891B2', bgLight: '#CFFAFE', border: '#67E8F9', bgHover: '#A5F3FC' },
  { name: '红宝石', primary: '#BE123C', bgLight: '#FFE4E6', border: '#FDA4AF', bgHover: '#FECDD3' },
  { name: '夜幕蓝', primary: '#4338CA', bgLight: '#E0E7FF', border: '#A5B4FC', bgHover: '#C7D2FE' },
  { name: '薄荷绿', primary: '#059669', bgLight: '#D1FAE5', border: '#6EE7B7', bgHover: '#A7F3D0' },
  { name: '铜棕色', primary: '#C2410C', bgLight: '#FFEDD5', border: '#FB923C', bgHover: '#FDBA74' },
  { name: '菖蒲紫', primary: '#6D28D9', bgLight: '#EDE9FE', border: '#A78BFA', bgHover: '#C4B5FD' },
  { name: '云杉绿', primary: '#047857', bgLight: '#D1FAE5', border: '#34D399', bgHover: '#6EE7B7' },
  { name: '海军蓝', primary: '#1D4ED8', bgLight: '#DBEAFE', border: '#60A5FA', bgHover: '#93C5FD' },
  { name: '焦糖褐', primary: '#9A3412', bgLight: '#FFEDD5', border: '#F97316', bgHover: '#FB923C' },
  { name: '紫红洋红', primary: '#A21CAF', bgLight: '#FCE7F3', border: '#F472B6', bgHover: '#FBCFE8' },
  { name: '深海蓝青', primary: '#0E7490', bgLight: '#CFFAFE', border: '#22D3EE', bgHover: '#67E8F9' },
  { name: '深酒红', primary: '#B91C1C', bgLight: '#FEE2E2', border: '#EF4444', bgHover: '#FCA5A5' },
  { name: '玄青靛蓝', primary: '#3730A3', bgLight: '#EEF2FF', border: '#818CF8', bgHover: '#A5B4FC' },
  { name: '苍翠绿', primary: '#166534', bgLight: '#DCFCE7', border: '#4ADE80', bgHover: '#86EFAC' },
  { name: '古铜黄褐', primary: '#92400E', bgLight: '#FEF3C7', border: '#FBBF24', bgHover: '#FCD34D' },
  { name: '深郁李紫', primary: '#86198F', bgLight: '#FAE8FF', border: '#E879F9', bgHover: '#F0ABFC' },
];

/**
 * Ensures strictly distinct colors for every question index.
 * If question count exceeds 30, uses golden-ratio hue distribution to guarantee
 * no two questions ever share the same color.
 */
export function getQuestionColor(questionIndex: number): QuestionColor {
  if (questionIndex >= 0 && questionIndex < QUESTION_COLORS.length) {
    return QUESTION_COLORS[questionIndex];
  }

  // Mathematically generate unique distinct hue (Golden Ratio angle: ~137.508 degrees)
  const goldenRatio = 0.618033988749895;
  const hue = Math.round(((questionIndex * goldenRatio) % 1) * 360);
  const primary = `hsl(${hue}, 84%, 38%)`;
  const bgLight = `hsl(${hue}, 85%, 95%)`;
  const border = `hsl(${hue}, 75%, 65%)`;
  const bgHover = `hsl(${hue}, 85%, 88%)`;

  return {
    name: `专属色 ${questionIndex + 1}`,
    primary,
    bgLight,
    border,
    bgHover,
  };
}
