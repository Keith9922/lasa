/**
 * 预设快捷食物（首屏 Tab 1 用）
 *
 * 每个 PresetFood 是一个"餐食类别"。tags 用于预测引擎匹配规则。
 * 食材级数据见 research/food-macros.json，用于 AI 解析时参考。
 *
 * v2：补齐 hydration / probiotic / fermented / 烹饪方式标签 +
 *     补充 6 个能拉开新维度的常见品类。
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
  /** 大类别：决定快捷选择 Tab 分组 */
  category: "main" | "drink" | "fruit" | "snack";
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
  // === 主食类 ===
  {
    id: "hotpot",
    emoji: "🍲",
    name: "火锅",
    category: "main",
    base: { grams: 800, kcal: 1200, carbs: 50, fiber: 8, protein: 80, fat: 70 },
    tags: ["red_meat", "vegetable", "spicy", "high_fat", "hydration_high", "stewed", "meal_dinner"],
  },
  {
    id: "bbq",
    emoji: "🍖",
    name: "烧烤",
    category: "main",
    base: { grams: 500, kcal: 1100, carbs: 30, fiber: 4, protein: 70, fat: 75 },
    tags: ["red_meat", "high_fat", "fried", "grilled", "meal_dinner"],
  },
  {
    id: "burger",
    emoji: "🍔",
    name: "汉堡",
    category: "main",
    base: { grams: 280, kcal: 700, carbs: 50, fiber: 3, protein: 30, fat: 38 },
    tags: ["fast_food", "high_fat", "red_meat"],
  },
  {
    id: "sushi",
    emoji: "🍣",
    name: "寿司",
    category: "main",
    base: { grams: 350, kcal: 500, carbs: 80, fiber: 2, protein: 25, fat: 8 },
    tags: ["fish", "staple"],
  },
  {
    id: "salad",
    emoji: "🥗",
    name: "沙拉",
    category: "main",
    base: { grams: 350, kcal: 220, carbs: 18, fiber: 8, protein: 10, fat: 12 },
    tags: ["vegetable", "leafy_green", "high_fiber", "raw"],
  },
  {
    id: "pizza",
    emoji: "🍕",
    name: "披萨",
    category: "main",
    base: { grams: 400, kcal: 1000, carbs: 110, fiber: 6, protein: 40, fat: 40 },
    tags: ["fast_food", "dairy", "high_fat"],
  },
  {
    id: "noodle",
    emoji: "🍜",
    name: "面条",
    category: "main",
    base: { grams: 500, kcal: 600, carbs: 95, fiber: 5, protein: 20, fat: 15 },
    tags: ["staple", "hydration_high"],
  },
  {
    id: "breakfast",
    emoji: "🍳",
    name: "中式早餐",
    category: "main",
    base: { grams: 400, kcal: 550, carbs: 55, fiber: 4, protein: 25, fat: 22 },
    tags: ["egg", "staple", "meal_breakfast"],
  },
  {
    id: "fried_chicken",
    emoji: "🍟",
    name: "炸鸡",
    category: "main",
    base: { grams: 400, kcal: 1100, carbs: 60, fiber: 3, protein: 45, fat: 70 },
    tags: ["fast_food", "high_fat", "fried"],
  },
  {
    id: "veggie_bowl",
    emoji: "🥦",
    name: "杂菜饭",
    category: "main",
    base: { grams: 500, kcal: 480, carbs: 70, fiber: 12, protein: 18, fat: 12 },
    tags: ["staple", "vegetable", "cruciferous", "high_fiber", "steamed"],
  },
  {
    id: "porridge",
    emoji: "🥣",
    name: "粥",
    category: "main",
    base: { grams: 450, kcal: 220, carbs: 45, fiber: 2, protein: 6, fat: 1 },
    tags: ["staple", "hydration_high", "boiled", "meal_breakfast"],
  },

  // === 饮品类（v2 新增分组）===
  {
    id: "milk_tea",
    emoji: "🧋",
    name: "奶茶",
    category: "drink",
    base: { grams: 500, kcal: 350, carbs: 60, fiber: 0, protein: 5, fat: 10 },
    tags: ["dairy", "high_sugar"],
  },
  {
    id: "beer",
    emoji: "🍺",
    name: "啤酒",
    category: "drink",
    base: { grams: 500, kcal: 210, carbs: 18, fiber: 0, protein: 2, fat: 0 },
    tags: ["alcohol"],
  },
  {
    id: "yogurt",
    emoji: "🍶",
    name: "酸奶",
    category: "drink",
    base: { grams: 200, kcal: 130, carbs: 17, fiber: 0, protein: 7, fat: 4 },
    tags: ["dairy", "probiotic", "fermented"],
  },
  {
    id: "soup",
    emoji: "🥣",
    name: "汤水",
    category: "drink",
    base: { grams: 400, kcal: 60, carbs: 5, fiber: 1, protein: 3, fat: 2 },
    tags: ["hydration_high", "boiled"],
  },
  {
    id: "water_pack",
    emoji: "💧",
    name: "白水/淡茶",
    category: "drink",
    base: { grams: 500, kcal: 0, carbs: 0, fiber: 0, protein: 0, fat: 0 },
    tags: ["hydration"],
  },
  {
    id: "coffee",
    emoji: "☕",
    name: "咖啡",
    category: "drink",
    base: { grams: 250, kcal: 8, carbs: 0, fiber: 0, protein: 0, fat: 0 },
    tags: ["caffeine", "hydration"],
  },

  // === 水果类 ===
  {
    id: "fruit_red",
    emoji: "🐉",
    name: "火龙果",
    category: "fruit",
    base: { grams: 250, kcal: 150, carbs: 33, fiber: 7, protein: 3, fat: 0 },
    tags: ["fruit", "red_pigment", "high_fiber"],
  },
  {
    id: "fruit_dark",
    emoji: "🫐",
    name: "蓝莓",
    category: "fruit",
    base: { grams: 150, kcal: 86, carbs: 21, fiber: 4, protein: 1, fat: 0 },
    tags: ["fruit", "dark_pigment", "high_fiber"],
  },
  {
    id: "watermelon",
    emoji: "🍉",
    name: "西瓜",
    category: "fruit",
    base: { grams: 400, kcal: 120, carbs: 30, fiber: 2, protein: 2, fat: 0 },
    tags: ["fruit", "hydration_high", "high_sugar"],
  },

  // === 零食类 ===
  {
    id: "cake",
    emoji: "🍰",
    name: "蛋糕",
    category: "snack",
    base: { grams: 200, kcal: 700, carbs: 80, fiber: 2, protein: 8, fat: 38 },
    tags: ["sweet", "high_sugar", "high_fat"],
  },
  {
    id: "kimchi",
    emoji: "🥬",
    name: "泡菜",
    category: "snack",
    base: { grams: 100, kcal: 22, carbs: 4, fiber: 2, protein: 1, fat: 0 },
    tags: ["fermented", "probiotic", "vegetable", "spicy"],
  },
  {
    id: "nuts",
    emoji: "🥜",
    name: "坚果",
    category: "snack",
    base: { grams: 50, kcal: 290, carbs: 8, fiber: 4, protein: 8, fat: 26 },
    tags: ["nuts", "high_fat"],
  },
];

/** 分组顺序（决定 Tab 内出现顺序） */
export const FOOD_CATEGORIES: { key: PresetFood["category"]; label: string }[] = [
  { key: "main", label: "主食" },
  { key: "drink", label: "喝的" },
  { key: "fruit", label: "水果" },
  { key: "snack", label: "零食" },
];

export function getFoodById(id: string): PresetFood | undefined {
  return PRESET_FOODS.find((f) => f.id === id);
}
