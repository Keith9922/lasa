/**
 * IntakeItem 构造 helper（preset / AI 两条路径）
 */

import type { IntakeItem } from "./types";
import type { PortionLevel, PresetFood } from "./foods";
import { PORTION_MULTIPLIER } from "./foods";
import type { ParsedFood } from "./schemas";

export function intakeFromPreset(food: PresetFood, portion: PortionLevel): IntakeItem {
  const m = PORTION_MULTIPLIER[portion];
  return {
    id: food.id,
    emoji: food.emoji,
    name: food.name,
    grams: Math.round(food.base.grams * m),
    source: "preset",
    portion,
    macros: {
      kcal: Math.round(food.base.kcal * m),
      carbs: round1(food.base.carbs * m),
      fiber: round1(food.base.fiber * m),
      protein: round1(food.base.protein * m),
      fat: round1(food.base.fat * m),
    },
    tags: food.tags,
  };
}

export function intakeFromAi(food: ParsedFood, idx: number): IntakeItem {
  return {
    id: `ai-${idx}-${food.name}`,
    emoji: food.emoji,
    name: food.name,
    grams: food.grams,
    source: "ai",
    macros: {
      kcal: Math.round(food.kcal),
      carbs: round1(food.carbs),
      fiber: round1(food.fiber),
      protein: round1(food.protein),
      fat: round1(food.fat),
    },
    tags: food.tags,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
