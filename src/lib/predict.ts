/**
 * 预测引擎
 *
 * 输入：今日摄入累加后的宏量营养素 + 标签集合
 * 输出：Bristol 形态、颜色、油亮、漂浮、臭味、量、热量、警告
 *
 * 规则依据：research/prediction-rules.md + research/theory.md
 */

import type { IntakeItem } from "./types";
import type { BristolType, PoopColor, Smell, Volume } from "./schemas";
export type { BristolType, PoopColor, Smell, Volume } from "./schemas";

export type PredictionInput = {
  items: IntakeItem[];
};

export type Macros = {
  kcal: number;
  carbs: number;
  fiber: number;
  protein: number;
  fat: number;
};

export type Prediction = {
  bristol: BristolType;
  bristolLabel: string;
  color: PoopColor;
  colorLabel: string;
  greasy: boolean;
  floats: boolean;
  smell: Smell;
  volume: Volume;
  volumeLabel: string;
  totalMacros: Macros;
  /** 碳水/蛋白/脂肪占总热量百分比（已四舍五入，相加 = 100） */
  macroRatio: { carbs: number; protein: number; fat: number };
  warnings: string[];
  /** 用于科普展开 — 触发本次预测的核心因素 */
  reasons: string[];
};

const BRISTOL_LABELS: Record<BristolType, string> = {
  1: "硬球",
  2: "凹凸香肠",
  3: "裂纹香肠",
  4: "光滑成形",
  5: "软团",
  6: "糊状",
  7: "水状",
};

const COLOR_LABELS: Record<PoopColor, string> = {
  normal: "正常棕",
  dark: "深褐",
  yellow: "黄褐",
  pale: "灰白",
  green: "绿褐",
  red: "暗红褐",
  black: "黑褐",
};

const VOLUME_LABELS = {
  small: "偏少",
  medium: "适中",
  large: "偏多",
  huge: "巨量",
} as const;

export function predict({ items }: PredictionInput): Prediction {
  const totals = aggregate(items);
  const tags = collectTags(items);
  const fatPct = energyPct(totals.fat * 9, totals.kcal);
  const proteinPct = energyPct(totals.protein * 4, totals.kcal);
  const carbsPct = energyPct(totals.carbs * 4, totals.kcal);
  const reasons: string[] = [];

  // ========= Bristol 形态 =========
  let bristol: BristolType;
  if (fatPct > 0.5 && totals.fat > 50) {
    bristol = 6;
    reasons.push(`脂肪占比 ${pct(fatPct)}，未吸收脂肪让粪便糊化`);
  } else if (totals.fiber < 5 && totals.protein > 60) {
    bristol = 1;
    reasons.push(`高蛋白(${Math.round(totals.protein)}g) + 极低纤维(${totals.fiber.toFixed(1)}g) → 干硬便秘倾向`);
  } else if (totals.fiber < 8 && proteinPct > 0.3) {
    bristol = 2;
    reasons.push(`蛋白偏高、纤维不足 → 凹凸不平的硬便`);
  } else if (tags.has("high_sugar") && totals.fiber < 10) {
    bristol = 5;
    reasons.push(`糖分高、纤维少 → 渗透性偏稀`);
  } else if (totals.fiber >= 25) {
    bristol = 4;
    reasons.push(`纤维充足(${Math.round(totals.fiber)}g) → 教科书级理想`);
  } else if (totals.fiber >= 12) {
    bristol = 3;
    reasons.push(`纤维适度 → 成形但偏干`);
  } else if (tags.has("dairy") && countTag(items, "dairy") >= 400) {
    bristol = 6;
    reasons.push(`大量乳制品（含乳糖）可能造成稀便`);
  } else {
    bristol = 4;
    reasons.push(`整体均衡 → 接近理想形态`);
  }

  // ========= 颜色 =========
  // 染色食物按"克数"投票。tag 是唯一来源（AI 解析时由 prompt 引导填入）。
  const colorWeights: Record<PoopColor, number> = {
    normal: 50, dark: 0, yellow: 0, pale: 0, green: 0, red: 0, black: 0,
  };
  for (const item of items) {
    const tagSet = new Set(item.tags);
    if (tagSet.has("red_meat")) colorWeights.dark += item.grams * 0.5;
    if (tagSet.has("leafy_green")) colorWeights.green += item.grams * 0.7;
    if (tagSet.has("red_pigment")) colorWeights.red += item.grams * 1.2;
    if (tagSet.has("dark_pigment")) colorWeights.black += item.grams * 1.0;
  }
  if (fatPct > 0.5) colorWeights.pale += 200;
  else if (fatPct > 0.4) colorWeights.yellow += 150;

  const color = (Object.entries(colorWeights).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] as PoopColor) ?? "normal";
  if (color !== "normal") reasons.push(`${COLOR_LABELS[color]} — 染色来自食物或脂肪状态`);

  // ========= 油亮 / 漂浮 =========
  const greasy = fatPct > 0.4 || totals.fat > 60;
  const floats = fatPct > 0.45 || totals.fat > 70;
  if (greasy) reasons.push("油脂多 → 大便会油亮");

  // ========= 臭味 =========
  let smellScore = 1;
  if (tags.has("red_meat")) smellScore++;
  if (countTag(items, "dairy") > 300) smellScore++;
  if (tags.has("cruciferous")) smellScore++; // 西兰花、白菜等含硫
  if (totals.protein > 60) smellScore++;
  if (tags.has("alcohol")) smellScore++;
  const smell = clamp(smellScore, 1, 5) as Smell;

  // ========= 量 =========
  const volumeScore = totals.fiber * 5 + totals.carbs * 0.4 + sumGrams(items) * 0.05;
  let volume: Prediction["volume"];
  if (volumeScore < 80) volume = "small";
  else if (volumeScore < 200) volume = "medium";
  else if (volumeScore < 400) volume = "large";
  else volume = "huge";

  // ========= 警告 =========
  const warnings: string[] = [];
  if (color === "pale") warnings.push("⚠️ 长期灰白色大便建议就医，可能是胆汁问题");
  if (color === "black") warnings.push("⚠️ 排除饮食因素后仍黑便建议就医");
  if (color === "red") warnings.push("ℹ️ 暗红色多为甜菜/火龙果造成，但若伴随出血感，建议就医");
  if (totals.fiber < 5) warnings.push("纤维严重不足，多吃点蔬菜吧");
  if (fatPct > 0.55) warnings.push("脂肪占比过高，今天有点放飞了");

  return {
    bristol,
    bristolLabel: BRISTOL_LABELS[bristol],
    color,
    colorLabel: COLOR_LABELS[color],
    greasy,
    floats,
    smell,
    volume,
    volumeLabel: VOLUME_LABELS[volume],
    totalMacros: totals,
    macroRatio: {
      carbs: Math.round(carbsPct * 100),
      protein: Math.round(proteinPct * 100),
      fat: Math.round(fatPct * 100),
    },
    warnings,
    reasons,
  };
}

// ---- helpers ----

function aggregate(items: IntakeItem[]): Macros {
  return items.reduce<Macros>(
    (sum, it) => ({
      kcal: sum.kcal + it.macros.kcal,
      carbs: sum.carbs + it.macros.carbs,
      fiber: sum.fiber + it.macros.fiber,
      protein: sum.protein + it.macros.protein,
      fat: sum.fat + it.macros.fat,
    }),
    { kcal: 0, carbs: 0, fiber: 0, protein: 0, fat: 0 },
  );
}

function collectTags(items: IntakeItem[]): Set<string> {
  const tags = new Set<string>();
  for (const item of items) for (const t of item.tags) tags.add(t);
  return tags;
}

function countTag(items: IntakeItem[], tag: string): number {
  return items.reduce((sum, it) => (it.tags.includes(tag) ? sum + it.grams : sum), 0);
}

function sumGrams(items: IntakeItem[]): number {
  return items.reduce((s, it) => s + it.grams, 0);
}

function energyPct(energyKcal: number, totalKcal: number): number {
  if (totalKcal <= 0) return 0;
  return energyKcal / totalKcal;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
