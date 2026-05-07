/**
 * 拉啥 · 业务核心（平台无关）
 *
 * 这里只 re-export 无 DOM / 无 React / 无 Node 专属 API 的纯逻辑模块，
 * 目标是把同一份"算法 + 数据契约"喂给：
 *
 *   1. Next.js / H5（当前仓库）
 *   2. Taro / uni-app 微信小程序壳（计划中 —— 见 docs/ARCHITECTURE.md）
 *   3. CLI / Node 服务端批量回算
 *
 * **请勿** 在这个屏障下游 import：
 *   - localStorage / sessionStorage / fetch / window / document
 *   - React / next/* / lucide-react
 *   - @vercel/* / next-auth / zod 之外的 Node 专属包
 *
 * zod 在浏览器和 Node 都跑得通，可以保留。
 *
 * 验证：`grep -r "window\\.\\|document\\.\\|localStorage" src/core/`
 * 应该只命中本注释。
 */

// 类型契约
export type { IntakeItem } from "@/lib/types";
export type {
  ParseMealResponse,
  ParsedFood,
  PredictionPayload,
  GenerateRoastResponse,
  Smell,
  Volume,
  PoopColor,
  BristolType,
} from "@/lib/schemas";

// Schemas / 校验
export {
  ParsedFoodSchema,
  ParseMealResponseSchema,
  ParseMealRequestSchema,
  GenerateRoastRequestSchema,
  GenerateRoastResponseSchema,
  PredictionPayloadSchema,
  PoopColorEnum,
  VolumeEnum,
  KNOWN_TAGS,
} from "@/lib/schemas";

// 食物数据 + helpers
export {
  PRESET_FOODS,
  FOOD_CATEGORIES,
  PORTION_LABEL,
  PORTION_MULTIPLIER,
  getFoodById,
  type PortionLevel,
  type PresetFood,
} from "@/lib/foods";

// IntakeItem 构造
export { intakeFromPreset, intakeFromAi } from "@/lib/intake";

// 预测引擎
export {
  predict,
  type PredictionInput,
  type Prediction,
  type Macros,
} from "@/lib/predict";

// 成就匹配
export {
  pickAchievement,
  RARITY_LABEL,
  type Achievement,
  type Rarity,
} from "@/lib/achievements";

// 吐槽兜底池
export { pickRoast, type RoastSignals } from "@/lib/roasts";

// 历史聚合（trends）
export {
  computeStats,
  COLOR_LABELS,
  COLOR_HEX,
  type HistoryStats,
} from "@/lib/stats";
