/**
 * 预设快捷食物（首屏 Tab 1 用）
 *
 * 每个 PresetFood 是一个"餐食类别"。tags 用于预测引擎匹配规则。
 * 食材级数据见 research/food-macros.json，用于 AI 解析时参考。
 */

export type PortionLevel = "small" | "normal" | "large" | "huge";

export const PORTION_MULTIPLIER: Record<PortionLevel, number> = {
  small: 0.6,
  normal: 1.0,
  large: 1.5,
  huge: 2.2,
};

export const PORTION_LABEL: Record<PortionLevel, string> = {
  small: "少",
  normal: "适中",
  large: "多",
  huge: "暴食",
};

export type PresetFood = {
  id: string;
  emoji: string;
  name: string;
  /** 一份"适中"份量下的宏量估算（克） */
  base: {
    grams: number;
    kcal: number;
    carbs: number;
    fiber: number;
    protein: number;
    fat: number;
  };
  tags: string[];
};

export const PRESET_FOODS: PresetFood[] = [
  {
    id: "hotpot",
    emoji: "🍲",
    name: "火锅",
    base: { grams: 800, kcal: 1200, carbs: 50, fiber: 8, protein: 80, fat: 70 },
    tags: ["red_meat", "vegetable", "spicy", "high_fat"],
  },
  {
    id: "bbq",
    emoji: "🍖",
    name: "烧烤",
    base: { grams: 500, kcal: 1100, carbs: 30, fiber: 4, protein: 70, fat: 75 },
    tags: ["red_meat", "high_fat", "fried"],
  },
  {
    id: "milk_tea",
    emoji: "🧋",
    name: "奶茶",
    base: { grams: 500, kcal: 350, carbs: 60, fiber: 0, protein: 5, fat: 10 },
    tags: ["dairy", "high_sugar"],
  },
  {
    id: "burger",
    emoji: "🍔",
    name: "汉堡",
    base: { grams: 280, kcal: 700, carbs: 50, fiber: 3, protein: 30, fat: 38 },
    tags: ["fast_food", "high_fat", "red_meat"],
  },
  {
    id: "sushi",
    emoji: "🍣",
    name: "寿司",
    base: { grams: 350, kcal: 500, carbs: 80, fiber: 2, protein: 25, fat: 8 },
    tags: ["fish", "staple"],
  },
  {
    id: "salad",
    emoji: "🥗",
    name: "沙拉",
    base: { grams: 350, kcal: 220, carbs: 18, fiber: 8, protein: 10, fat: 12 },
    tags: ["vegetable", "leafy_green", "high_fiber"],
  },
  {
    id: "pizza",
    emoji: "🍕",
    name: "披萨",
    base: { grams: 400, kcal: 1000, carbs: 110, fiber: 6, protein: 40, fat: 40 },
    tags: ["fast_food", "dairy", "high_fat"],
  },
  {
    id: "noodle",
    emoji: "🍜",
    name: "面条",
    base: { grams: 500, kcal: 600, carbs: 95, fiber: 5, protein: 20, fat: 15 },
    tags: ["staple"],
  },
  {
    id: "breakfast",
    emoji: "🍳",
    name: "早餐",
    base: { grams: 400, kcal: 550, carbs: 55, fiber: 4, protein: 25, fat: 22 },
    tags: ["mixed"],
  },
  {
    id: "fried_chicken",
    emoji: "🍟",
    name: "炸鸡",
    base: { grams: 400, kcal: 1100, carbs: 60, fiber: 3, protein: 45, fat: 70 },
    tags: ["fast_food", "high_fat", "fried"],
  },
  {
    id: "cake",
    emoji: "🍰",
    name: "蛋糕",
    base: { grams: 200, kcal: 700, carbs: 80, fiber: 2, protein: 8, fat: 38 },
    tags: ["sweet", "high_sugar", "high_fat"],
  },
];

export function getFoodById(id: string): PresetFood | undefined {
  return PRESET_FOODS.find((f) => f.id === id);
}
