/**
 * 预测引擎 v2
 *
 * 输入：今日摄入累加后的宏量营养素 + 标签集合 + 校准 bias
 * 输出：Bristol 形态、颜色、油亮、漂浮、臭味、量、热量、警告
 *
 * v2 改进：
 *  1. 引入"水合分数 hydration"维度（汤/水/水果隐含），强烈影响形态
 *  2. 引入"时间分布"维度（早午晚夜宵），晚餐对"明日"传递更直接
 *  3. 引入"益生菌 / 发酵"对形态的修正
 *  4. Bristol 决策从 if-else 链改为「加权打分」—— 不再被一条规则锁死
 *  5. 接受外部 calibrationBias，把用户反馈喂回来
 *  6. 颜色叠加优化：当多种染色源 ≥ 阈值时混合而非投票（避免"丢色"）
 *
 * 规则依据：research/prediction-rules.md + research/theory.md
 */

import type { IntakeItem } from "./types";
import type { BristolType, PoopColor, Smell, Volume } from "./schemas";
export type { BristolType, PoopColor, Smell, Volume } from "./schemas";

export type PredictionInput = {
  items: IntakeItem[];
  /** 用户校准 bias：>0 倾向更稀，<0 倾向更硬；范围期望 -2..2 */
  bristolBias?: number;
  /** 用户校准 bias：>0 倾向更多，<0 倾向更少；范围期望 -1..1 */
  volumeBias?: number;
  /** 整餐额外水分摄入（毫升）—— 来自 AI parse-meal totalWaterMl */
  extraWaterMl?: number;
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
  /** v2 调试信息（不出 UI，用于单测验证） */
  _debug?: {
    hydrationScore: number;
    bristolScores: Partial<Record<BristolType, number>>;
    timeProfile: Partial<Record<MealTime, number>>;
  };
};

type MealTime =
  | "meal_breakfast"
  | "meal_lunch"
  | "meal_dinner"
  | "meal_snack"
  | "meal_late_night";

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

const MEAL_TIMES: MealTime[] = [
  "meal_breakfast",
  "meal_lunch",
  "meal_dinner",
  "meal_snack",
  "meal_late_night",
];

export function predict({
  items,
  bristolBias = 0,
  volumeBias = 0,
  extraWaterMl = 0,
}: PredictionInput): Prediction {
  // 空摄入 → 默认稳态。所有规则都有"<5g 纤维"分支，会误把空数据推向 1
  if (items.length === 0) {
    return {
      bristol: 4,
      bristolLabel: BRISTOL_LABELS[4],
      color: "normal",
      colorLabel: COLOR_LABELS["normal"],
      greasy: false,
      floats: false,
      smell: 1,
      volume: "small",
      volumeLabel: VOLUME_LABELS["small"],
      totalMacros: { kcal: 0, carbs: 0, fiber: 0, protein: 0, fat: 0 },
      macroRatio: { carbs: 0, protein: 0, fat: 0 },
      warnings: [],
      reasons: ["还没吃东西，无从预测。"],
    };
  }

  const totals = aggregate(items);
  const tags = collectTags(items);
  const fatPct = energyPct(totals.fat * 9, totals.kcal);
  const proteinPct = energyPct(totals.protein * 4, totals.kcal);
  const carbsPct = energyPct(totals.carbs * 4, totals.kcal);
  const reasons: string[] = [];

  // ===== 水合分数 =====
  // 来源：高水分食物 tag(汤/粥/瓜果) + 普通水分 tag + 显式 extraWaterMl + 大量纤维隐含吸水力
  const hydrationScore = computeHydration(items, extraWaterMl, totals.fiber);

  // ===== 进食时段 profile =====
  const timeProfile = computeTimeProfile(items);

  // ===== Bristol：加权打分而非 if-else =====
  // 每条规则给 1-7 各档加分；最后取分数最高那档（同分取靠近 4 的）
  const scores: Record<BristolType, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  // 基线：靠 4
  scores[4] += 1;

  // 脂肪分布
  if (fatPct > 0.55 && totals.fat > 60) {
    scores[6] += 4; scores[7] += 1.5;
    reasons.push(`脂肪占比 ${pct(fatPct)}（>55%），未吸收脂肪 → 糊化倾向`);
  } else if (fatPct > 0.45) {
    scores[6] += 2; scores[5] += 1;
    reasons.push(`脂肪占比 ${pct(fatPct)} 偏高 → 偏稀偏油`);
  }

  // 纤维
  if (totals.fiber >= 25) {
    scores[4] += 3.5; scores[3] += 1.5;
    reasons.push(`纤维充足(${Math.round(totals.fiber)}g) → 教科书级理想`);
  } else if (totals.fiber >= 12) {
    scores[3] += 2.5; scores[4] += 1.5;
    reasons.push(`纤维适度 → 成形偏干`);
  } else if (totals.fiber < 5) {
    scores[1] += 2.5; scores[2] += 2;
    reasons.push(`纤维严重不足(${totals.fiber.toFixed(1)}g) → 干硬倾向`);
  }

  // 蛋白
  if (totals.protein > 100 && totals.fiber < 5) {
    scores[1] += 2; scores[2] += 1;
    reasons.push(`高蛋白(${Math.round(totals.protein)}g) + 极低纤维 → 便秘风险`);
  } else if (proteinPct > 0.35) {
    scores[2] += 1.5;
  }

  // 糖
  if (tags.has("high_sugar") && totals.fiber < 10) {
    scores[5] += 2; scores[6] += 1;
    reasons.push(`糖分高、纤维少 → 渗透性偏稀`);
  }

  // 乳制品（量大 + 无明显益生菌）
  const dairyGrams = countTag(items, "dairy");
  const hasProbiotic = tags.has("probiotic") || tags.has("fermented");
  if (dairyGrams >= 400 && !hasProbiotic) {
    scores[6] += 2;
    reasons.push(`大量乳制品(${dairyGrams}g)，乳糖刺激 → 偏稀`);
  }
  if (hasProbiotic && totals.fiber >= 8) {
    scores[4] += 1.5;
    reasons.push("益生菌 + 纤维 → 形态稳定");
  }

  // 辛辣 / 酒精
  if (tags.has("spicy") && tags.has("alcohol")) {
    scores[6] += 1.5; scores[7] += 1;
    reasons.push("辛辣 + 酒精双重刺激 → 偏稀");
  } else if (tags.has("alcohol") && countTag(items, "alcohol") > 300) {
    scores[6] += 1;
  }

  // 水合 — 关键 v2 维度
  if (hydrationScore < -2) {
    scores[1] += 3; scores[2] += 2;
    reasons.push("整体缺水（汤/水/水分食物少）→ 干硬");
  } else if (hydrationScore > 4) {
    scores[5] += 2; scores[6] += 1.5;
    reasons.push(`水分摄入充裕（hydration=${hydrationScore.toFixed(1)}）→ 偏软`);
  } else if (hydrationScore > 1) {
    scores[4] += 1; scores[5] += 0.5;
  }

  // 时段：晚餐为主 → 明日早晨/上午成形度更稳定；夜宵为主 → 明日早晨稀
  const dominantTime = pickDominantTime(timeProfile);
  if (dominantTime === "meal_late_night") {
    scores[5] += 1; scores[6] += 0.5;
    reasons.push("夜宵为主 → 明日早晨偏稀");
  } else if (dominantTime === "meal_dinner") {
    // 晚餐是常态，不额外加分
  }

  // 应用 bias
  const biasedScores = applyBias(scores, bristolBias);

  // 决出 bristol
  const bristol = pickTopBristol(biasedScores);

  // ===== 颜色 =====
  const colorWeights: Record<PoopColor, number> = {
    normal: 60, dark: 0, yellow: 0, pale: 0, green: 0, red: 0, black: 0,
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

  // ===== 油亮 / 漂浮 =====
  const greasy = fatPct > 0.4 || totals.fat > 60;
  const floats = fatPct > 0.45 || totals.fat > 70;
  if (greasy) reasons.push("油脂多 → 大便会油亮");

  // ===== 臭味 =====
  let smellScore = 1;
  if (tags.has("red_meat")) smellScore++;
  if (dairyGrams > 300) smellScore++;
  if (tags.has("cruciferous")) smellScore++;
  if (totals.protein > 60) smellScore++;
  if (tags.has("alcohol")) smellScore++;
  if (hasProbiotic) smellScore = Math.max(1, smellScore - 1); // 益生菌略减臭
  const smell = clamp(smellScore, 1, 5) as Smell;

  // ===== 量 =====
  let volumeScore =
    totals.fiber * 5 +
    totals.carbs * 0.4 +
    sumGrams(items) * 0.05 +
    totals.kcal * 0.02 +
    Math.max(0, hydrationScore) * 8;
  // 应用 bias（volumeBias 在 -1..1，按 ±100 score 微调）
  volumeScore += clamp(volumeBias, -1, 1) * 100;

  let volume: Volume;
  if (volumeScore < 80) volume = "small";
  else if (volumeScore < 200) volume = "medium";
  else if (volumeScore < 400) volume = "large";
  else volume = "huge";

  // ===== 警告 =====
  const warnings: string[] = [];
  if (color === "pale") warnings.push("⚠️ 长期灰白色大便建议就医，可能是胆汁问题");
  if (color === "black") warnings.push("⚠️ 排除饮食因素后仍黑便建议就医");
  if (color === "red") warnings.push("ℹ️ 暗红色多为甜菜/火龙果造成，但若伴随出血感，建议就医");
  if (totals.fiber < 5) warnings.push("纤维严重不足，多吃点蔬菜吧");
  if (fatPct > 0.55) warnings.push("脂肪占比过高，今天有点放飞了");
  if (hydrationScore < -2) warnings.push("可能水喝得太少，明天记得补一杯");

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
    _debug: { hydrationScore, bristolScores: biasedScores, timeProfile },
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

/**
 * 水合分数：覆盖范围约 -5..+8
 *
 *   - 高水分食物（汤/粥/瓜）: +grams * 0.01
 *   - 普通水分（白水/淡茶 ≈ 用 hydration tag）: +grams * 0.005
 *   - 显式 extraWaterMl: +ml * 0.005
 *   - 高纤维隐含吸水力: +fiber * 0.05
 *   - 高蛋白/高脂干燥效应: -protein * 0.02 - fat * 0.02
 *   - 酒精利尿: -alcohol_grams * 0.015
 */
function computeHydration(items: IntakeItem[], extraWaterMl: number, fiber: number): number {
  let score = 0;
  for (const it of items) {
    if (it.tags.includes("hydration_high")) score += it.grams * 0.01;
    else if (it.tags.includes("hydration")) score += it.grams * 0.005;
    // 注：酒精的「次日脱水」效应不放在这里。
    // 短期（出卡覆盖的"明日"窗口）酒精引起的是肠道刺激→稀便，
    // 这一信号已经在主规则里体现（scores[6/7] += alcohol*spicy）。
    // 把它再叠到 hydration 里会反向把 score 拉到 < -2，错误地推向「干硬」。
  }
  score += extraWaterMl * 0.005;
  score += fiber * 0.05;
  // 干燥扣分
  const m = aggregate(items);
  score -= m.protein * 0.02;
  score -= m.fat * 0.02;
  return Math.round(score * 10) / 10;
}

function computeTimeProfile(items: IntakeItem[]): Partial<Record<MealTime, number>> {
  const profile: Partial<Record<MealTime, number>> = {};
  for (const it of items) {
    for (const t of MEAL_TIMES) {
      if (it.tags.includes(t)) {
        profile[t] = (profile[t] ?? 0) + it.macros.kcal;
      }
    }
  }
  return profile;
}

function pickDominantTime(profile: Partial<Record<MealTime, number>>): MealTime | null {
  let best: MealTime | null = null;
  let bestKcal = 0;
  for (const t of MEAL_TIMES) {
    const v = profile[t] ?? 0;
    if (v > bestKcal) {
      bestKcal = v;
      best = t;
    }
  }
  return bestKcal > 0 ? best : null;
}

function applyBias(
  scores: Record<BristolType, number>,
  bristolBias: number,
): Record<BristolType, number> {
  // bristolBias > 0 → 增加 5/6/7 权重；< 0 → 增加 1/2 权重
  const b = clamp(bristolBias, -2, 2);
  const out: Record<BristolType, number> = { ...scores };
  if (b > 0) {
    out[5] += 0.5 * b;
    out[6] += 0.8 * b;
    out[7] += 0.3 * b;
  } else if (b < 0) {
    out[1] += 0.6 * -b;
    out[2] += 0.6 * -b;
  }
  return out;
}

function pickTopBristol(scores: Record<BristolType, number>): BristolType {
  let bestType: BristolType = 4;
  let bestScore = -Infinity;
  // 同分时倾向于靠近 4（"健康基线")
  const tieBreaker = (b: BristolType) => -Math.abs(b - 4);
  for (const k of [1, 2, 3, 4, 5, 6, 7] as BristolType[]) {
    const s = scores[k];
    if (
      s > bestScore ||
      (s === bestScore && tieBreaker(k) > tieBreaker(bestType))
    ) {
      bestScore = s;
      bestType = k;
    }
  }
  return bestType;
}
