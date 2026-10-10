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

// 30 distinct, elegant macaron / pastel colors designed for comfortable reading comprehension
export const QUESTION_COLORS: QuestionColor[] = [
  // 1. 草莓马卡龙粉
  { name: '草莓奶霜', primary: '#D45B7D', bgLight: '#FDF2F5', border: '#F8B4C8', bgHover: '#FCE4EC' },
  // 2. 海盐冰蓝
  { name: '海盐冰蓝', primary: '#3B82B6', bgLight: '#F0F7FC', border: '#A5CEEB', bgHover: '#E0F0FA' },
  // 3. 开心果薄荷绿
  { name: '薄荷奶绿', primary: '#3C986D', bgLight: '#F0FBF5', border: '#A3DEBD', bgHover: '#E2F7EB' },
  // 4. 香草暖杏黄
  { name: '香草暖杏', primary: '#C47738', bgLight: '#FFF8F0', border: '#F8CE9F', bgHover: '#FDEFD9' },
  // 5. 薰衣草浅紫
  { name: '薰衣草紫', primary: '#7966A8', bgLight: '#F7F4FB', border: '#C7B9E5', bgHover: '#ECE6F6' },
  // 6. 浅海沫青
  { name: '海沫云青', primary: '#2D9387', bgLight: '#F0FDFA', border: '#9FE5DC', bgHover: '#DDF7F3' },
  // 7. 蜜桃珊瑚粉
  { name: '蜜桃珊瑚', primary: '#CF5F52', bgLight: '#FFF4F2', border: '#F7B7AE', bgHover: '#FEE5E1' },
  // 8. 蓝莓奶昔
  { name: '蓝莓奶昔', primary: '#526CA3', bgLight: '#F2F5FB', border: '#B4C3E6', bgHover: '#E2E9F6' },
  // 9. 焦糖奶茶
  { name: '焦糖奶茶', primary: '#9E6D3B', bgLight: '#FAF5EE', border: '#DEC29F', bgHover: '#F5ECE0' },
  // 10. 晴空奶蓝
  { name: '晴空奶蓝', primary: '#348AA5', bgLight: '#F1F9FB', border: '#A0D5E6', bgHover: '#E0F2F7' },
  // 11. 紫罗兰软糖
  { name: '紫罗兰糖', primary: '#9C5892', bgLight: '#FBF3F9', border: '#E0B5DA', bgHover: '#F5E1F0' },
  // 12. 青苹果霜
  { name: '青苹果霜', primary: '#4E964A', bgLight: '#F2FAF1', border: '#AFDDB0', bgHover: '#E2F5E1' },
  // 13. 枫糖蜜柑
  { name: '枫糖蜜柑', primary: '#C26533', bgLight: '#FFF5EF', border: '#F6BFA1', bgHover: '#FEE6D7' },
  // 14. 香芋奶冻
  { name: '香芋奶冻', primary: '#805DA2', bgLight: '#F7F3FB', border: '#CDAFE4', bgHover: '#EDE3F6' },
  // 15. 冰川薄荷蓝
  { name: '冰川薄荷', primary: '#288E99', bgLight: '#F0FAFA', border: '#9DDDE5', bgHover: '#D9F3F6' },
  // 16. 覆盆子挞
  { name: '覆盆子挞', primary: '#B8556D', bgLight: '#FDF3F5', border: '#E8A7B8', bgHover: '#F9E3E9' },
  // 17. 风信子蓝
  { name: '风信子蓝', primary: '#4B6CAE', bgLight: '#F2F5FC', border: '#AEC3ED', bgHover: '#E2EAF8' },
  // 18. 樱花初桃
  { name: '樱花初桃', primary: '#C25B72', bgLight: '#FDF2F4', border: '#F0ACC0', bgHover: '#FCE1E8' },
  // 19. 抹茶拿铁
  { name: '抹茶拿铁', primary: '#538D5B', bgLight: '#F2FAF3', border: '#B4DEB9', bgHover: '#E1F4E4' },
  // 20. 肉桂伯爵
  { name: '肉桂伯爵', primary: '#A1654C', bgLight: '#FAF4F1', border: '#DDBB9F', bgHover: '#F5E8E0' },
  // 21. 浅丁香紫
  { name: '浅丁香紫', primary: '#865A9F', bgLight: '#F8F3FA', border: '#D0AEE0', bgHover: '#EFE2F5' },
  // 22. 蒂芙尼晨曦
  { name: '蒂芙尼晨', primary: '#2D8E84', bgLight: '#F0FBF9', border: '#9EE0D7', bgHover: '#DDF4F1' },
  // 23. 雾霾海灰蓝
  { name: '雾霾灰蓝', primary: '#3E769F', bgLight: '#F1F6FA', border: '#A6C9E4', bgHover: '#E0EEF7' },
  // 24. 太妃榛果
  { name: '太妃榛果', primary: '#986842', bgLight: '#FAF5F0', border: '#D9BD9E', bgHover: '#F4E9DE' },
  // 25. 西柚奶昔
  { name: '西柚奶昔', primary: '#C65A5A', bgLight: '#FFF3F3', border: '#F3ACAC', bgHover: '#FDDFDF' },
  // 26. 浅森冷杉
  { name: '冷杉薄荷', primary: '#348767', bgLight: '#F0FAF5', border: '#9FDCBF', bgHover: '#DCF4E9' },
  // 27. 布丁奶酪黄
  { name: '布丁奶酪', primary: '#AC7A2B', bgLight: '#FFFBF1', border: '#F3D28E', bgHover: '#FDF3D9' },
  // 28. 玫瑰豆沙粉
  { name: '玫瑰豆沙', primary: '#B45A74', bgLight: '#FCF3F5', border: '#E7A9BD', bgHover: '#F9DFE7' },
  // 29. 青柠海盐
  { name: '青柠海盐', primary: '#468B68', bgLight: '#F2FAF5', border: '#A7DEBF', bgHover: '#DEF4E8' },
  // 30. 黑醋栗紫
  { name: '黑醋栗紫', primary: '#76568F', bgLight: '#F6F3F9', border: '#C5ACD9', bgHover: '#EAE1F2' },
];

/**
 * Ensures strictly distinct macaron colors for every question index.
 * If question count exceeds 30, uses golden-ratio hue distribution to guarantee
 * gentle, comfortable macaron colors with optimal contrast.
 */
export function getQuestionColor(questionIndex: number): QuestionColor {
  if (questionIndex >= 0 && questionIndex < QUESTION_COLORS.length) {
    return QUESTION_COLORS[questionIndex];
  }

  // Golden ratio hue step: ~137.508 degrees
  const goldenRatio = 0.618033988749895;
  const hue = Math.round(((questionIndex * goldenRatio) % 1) * 360);

  // Soft, eye-pleasing Macaron parameters:
  // Primary: moderate saturation (48-54%), balanced lightness (42-46%) for clear text and badges
  // bgLight: very delicate milky tint (96% lightness)
  // border: soft pastel edge (78% lightness)
  // bgHover: comfortable hover tint (91% lightness)
  const primary = `hsl(${hue}, 52%, 44%)`;
  const bgLight = `hsl(${hue}, 55%, 96%)`;
  const border = `hsl(${hue}, 48%, 78%)`;
  const bgHover = `hsl(${hue}, 52%, 91%)`;

  return {
    name: `马卡龙色 ${questionIndex + 1}`,
    primary,
    bgLight,
    border,
    bgHover,
  };
}
