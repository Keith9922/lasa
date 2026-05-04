/**
 * Zod schemas — AI 响应校验 / API 入参校验
 */

import { z } from "zod";

// ----- parse-meal -----

/**
 * 食物 tag 白名单。AI 输出超出此集合的 tag 会被过滤掉，
 * 防止模型发明新 tag 导致下游规则不命中。
 *
 * 与 src/app/api/parse-meal/route.ts 的 prompt 中 "Tag 白名单" 区段保持一致。
 */
export const KNOWN_TAGS = new Set<string>([
  // 类型
  "staple", "red_meat", "white_meat", "fish", "dairy", "egg",
  "plant_protein", "legume", "nuts",
  // 形态
  "vegetable", "leafy_green", "cruciferous", "fruit", "root_vegetable",
  // 营养特征
  "high_fat", "high_sugar", "high_fiber", "fried", "sweet", "processed",
  // 特殊属性
  "alcohol", "caffeine", "spicy", "fast_food",
  // 染色
  "red_pigment", "dark_pigment",
]);

export const ParsedFoodSchema = z.object({
  name: z.string().min(1).max(40).transform((s) => s.trim()),
  emoji: z.string().min(1).max(8),
  grams: z.number().int().min(1).max(5000),
  /** AI 自评估的把握度 */
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  /** 该食物宏量营养素估算（整项总量，非每 100g） */
  kcal: z.number().min(0).max(10000),
  carbs: z.number().min(0).max(2000),
  fiber: z.number().min(0).max(500),
  protein: z.number().min(0).max(2000),
  fat: z.number().min(0).max(1000),
  /** AI 输出超出白名单的 tag 会被静默过滤 */
  tags: z
    .array(z.string())
    .max(15)
    .default([])
    .transform((arr) =>
      [...new Set(arr.map((t) => t.toLowerCase().trim()))].filter((t) =>
        KNOWN_TAGS.has(t),
      ),
    ),
});

export const ParseMealResponseSchema = z.object({
  items: z.array(ParsedFoodSchema).min(0).max(20),
  notes: z.string().max(200).optional(),
});

export type ParsedFood = z.infer<typeof ParsedFoodSchema>;
export type ParseMealResponse = z.infer<typeof ParseMealResponseSchema>;

export const ParseMealRequestSchema = z.object({
  text: z.string().min(2).max(800),
});

// ----- generate-roast -----

export const PoopColorEnum = z.enum([
  "normal", "dark", "yellow", "pale", "green", "red", "black",
]);
export type PoopColor = z.infer<typeof PoopColorEnum>;

export const VolumeEnum = z.enum(["small", "medium", "large", "huge"]);
export type Volume = z.infer<typeof VolumeEnum>;

const BristolEnum = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7),
]);
export type BristolType = z.infer<typeof BristolEnum>;

const SmellEnum = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
]);
export type Smell = z.infer<typeof SmellEnum>;

export const PredictionPayloadSchema = z.object({
  bristol: BristolEnum,
  bristolLabel: z.string(),
  color: PoopColorEnum,
  colorLabel: z.string(),
  greasy: z.boolean(),
  floats: z.boolean(),
  smell: SmellEnum,
  volume: VolumeEnum,
  volumeLabel: z.string(),
  macroRatio: z.object({
    carbs: z.number(),
    protein: z.number(),
    fat: z.number(),
  }),
  totalMacros: z.object({
    kcal: z.number(),
    carbs: z.number(),
    fiber: z.number(),
    protein: z.number(),
    fat: z.number(),
  }),
  reasons: z.array(z.string()),
});

export type PredictionPayload = z.infer<typeof PredictionPayloadSchema>;

export const GenerateRoastRequestSchema = z.object({
  prediction: PredictionPayloadSchema,
  intakeSummary: z.array(z.string()).max(20),
});

export const GenerateRoastResponseSchema = z.object({
  roast: z.string().min(8).max(120),
});

export type GenerateRoastResponse = z.infer<typeof GenerateRoastResponseSchema>;
