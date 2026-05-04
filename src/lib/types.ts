/**
 * 拉啥 共享类型
 */

import type { PortionLevel } from "./foods";

/** 用户在快捷选择 / 描述解析后加入今日摄入的一项 */
export type IntakeItem = {
  /** 唯一 id；快捷选择 = preset food id；描述解析 = ai-{随机} */
  id: string;
  emoji: string;
  name: string;
  /** 估算克数（已包含份量倍数）*/
  grams: number;
  /** 来源：preset = 快捷选择，ai = 文本解析；后期可用于显示徽章 */
  source: "preset" | "ai";
  /** 仅 preset 来源会有；ai 来源直接给克数 */
  portion?: PortionLevel;
  /** 估算的宏量营养素（已乘份量倍数） */
  macros: {
    kcal: number;
    carbs: number;
    fiber: number;
    protein: number;
    fat: number;
  };
  /** 标签集合，预测引擎用于规则匹配（high_fat / dairy / red_meat / leafy_green ...） */
  tags: string[];
};
