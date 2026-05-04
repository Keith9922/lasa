/**
 * 便便颜色 → CSS filter / 色板单点
 *
 * 基础 PNG 是健康棕 (#6F4E37)，其他颜色全部用 CSS filter 调出。
 * 颜色变体仅占 png 数量的 1/7，省抠图工作量也省体积。
 */

import type { PoopColor } from "./predict";

/** 用于 polaroid-poo / 动效屎 / 任何 IMG 元素 */
export const COLOR_FILTER: Record<PoopColor, string> = {
  normal: "none",
  // 加深 + 轻微红调
  dark: "brightness(0.6) contrast(1.12)",
  // 偏黄褐：略亮 + 正向轻度 hue-rotate（往黄色靠）+ 轻微减饱和
  yellow: "brightness(1.18) hue-rotate(10deg) saturate(0.85)",
  // 灰白：拉亮 + 大幅减饱和
  pale: "brightness(1.45) saturate(0.4)",
  // 绿褐：大幅 hue-rotate 往绿色，减饱和减亮
  green: "hue-rotate(55deg) saturate(0.55) brightness(0.92)",
  // 暗红褐：负向 hue-rotate 往红色 + 轻微加饱和
  red: "hue-rotate(-15deg) brightness(0.88) saturate(1.1)",
  // 黑褐：大幅压暗
  black: "brightness(0.32) contrast(1.18)",
};

/** chip 上的色点（CSS 变量） */
export const COLOR_DOT_VAR: Record<PoopColor, string> = {
  normal: "var(--c-normal)",
  dark: "var(--c-dark)",
  yellow: "var(--c-yellow)",
  pale: "var(--c-pale)",
  green: "var(--c-green)",
  red: "var(--c-red)",
  black: "var(--c-black)",
};
