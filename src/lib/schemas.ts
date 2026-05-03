/**
 * Zod schemas — AI 响应校验 / API 入参校验
 */

import { z } from "zod";

export const ParsedFoodSchema = z.object({
  name: z.string().min(1).max(40),
  emoji: z.string().min(1).max(4),
  grams: z.number().int().min(1).max(5000),
  /** AI 自评估的把握度 */
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  /** 该食物宏量营养素估算（每总量；非每 100g） */
  kcal: z.number().min(0).max(10000),
  carbs: z.number().min(0).max(2000),
  fiber: z.number().min(0).max(500),
  protein: z.number().min(0).max(2000),
  fat: z.number().min(0).max(1000),
  /** 标签集合，AI 可输出 high_fat / dairy / red_meat / leafy_green / cruciferous / alcohol / high_sugar 等 */
  tags: z.array(z.string()).max(10).default([]),
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

export const GenerateRoastRequestSchema = z.object({
  prediction: z.object({
    bristol: z.number().int().min(1).max(7),
    bristolLabel: z.string(),
    color: z.string(),
    colorLabel: z.string(),
    greasy: z.boolean(),
    floats: z.boolean(),
    smell: z.number().int().min(1).max(5),
    volume: z.string(),
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
  }),
  intakeSummary: z.array(z.string()).max(20),
});

export const GenerateRoastResponseSchema = z.object({
  roast: z.string().min(8).max(120),
});

export type GenerateRoastResponse = z.infer<typeof GenerateRoastResponseSchema>;
