/**
 * 图鉴 BINGO —— 7×7 网格的"行 / 列 / 全图"完成检测
 *
 * 7 行（颜色）× 7 列（Bristol 1-7）= 49 格。
 * 解锁完整一行（同一颜色 7 个 Bristol 全集齐）→ 颜色 BINGO
 * 解锁完整一列（同一 Bristol 7 个颜色全集齐）→ 形态 BINGO
 * 49 格全开 → 大满贯
 *
 * 总共可获得 7 + 7 + 1 = 15 个 BINGO 成就。
 *
 * 此模块纯函数零副作用，可单测；不知道 storage / DOM。
 */

import type { DexCell } from "./storage";
import type { Prediction } from "./predict";

const COLORS: Prediction["color"][] = [
  "normal", "dark", "yellow", "pale", "green", "red", "black",
];
const BRISTOLS: Prediction["bristol"][] = [1, 2, 3, 4, 5, 6, 7];

const COLOR_LABEL: Record<Prediction["color"], string> = {
  normal: "正常棕",
  dark: "深褐",
  yellow: "黄褐",
  pale: "灰白",
  green: "绿褐",
  red: "暗红褐",
  black: "黑褐",
};

const BRISTOL_LABEL: Record<Prediction["bristol"], string> = {
  1: "硬球",
  2: "凹凸",
  3: "裂纹",
  4: "光滑",
  5: "软团",
  6: "糊状",
  7: "水状",
};

export type BingoRow = {
  kind: "color";
  key: Prediction["color"];
  label: string;
  /** 该颜色已解锁的 Bristol 数（0-7） */
  count: number;
  complete: boolean;
};

export type BingoCol = {
  kind: "bristol";
  key: Prediction["bristol"];
  label: string;
  count: number;
  complete: boolean;
};

export type BingoState = {
  rows: BingoRow[];        // 7 个
  cols: BingoCol[];        // 7 个
  /** 49 格全开 */
  grandSlam: boolean;
  /** 已完成的 BINGO 数（rows + cols + grandSlam，最大 15） */
  completedCount: number;
};

/**
 * 把 BingoState 平铺成成就 id 列表 —— 用于 storage.unlockAchievement 比对去重
 */
export type BingoAchievementId =
  | `bingo_color_${Prediction["color"]}`
  | `bingo_bristol_${Prediction["bristol"]}`
  | "bingo_grand_slam";

export function computeBingo(cells: DexCell[]): BingoState {
  // 把 cells 按 (color, bristol) 索引化
  const set = new Set<string>();
  for (const c of cells) set.add(`${c.color}:${c.bristol}`);

  const rows: BingoRow[] = COLORS.map((color) => {
    let count = 0;
    for (const b of BRISTOLS) {
      if (set.has(`${color}:${b}`)) count++;
    }
    return {
      kind: "color",
      key: color,
      label: COLOR_LABEL[color],
      count,
      complete: count === BRISTOLS.length,
    };
  });

  const cols: BingoCol[] = BRISTOLS.map((bristol) => {
    let count = 0;
    for (const c of COLORS) {
      if (set.has(`${c}:${bristol}`)) count++;
    }
    return {
      kind: "bristol",
      key: bristol,
      label: BRISTOL_LABEL[bristol],
      count,
      complete: count === COLORS.length,
    };
  });

  const grandSlam = cells.length >= COLORS.length * BRISTOLS.length;
  const completedCount =
    rows.filter((r) => r.complete).length +
    cols.filter((c) => c.complete).length +
    (grandSlam ? 1 : 0);

  return { rows, cols, grandSlam, completedCount };
}

/**
 * 把 state 转成"还没在 unlockedIds 里的 BINGO"列表 ——
 * 用于检测"用户刚刚通关了哪一行/列"。
 */
export function diffNewBingos(
  state: BingoState,
  unlockedIds: ReadonlySet<string>,
): {
  id: BingoAchievementId;
  title: string;
  blurb: string;
}[] {
  const out: { id: BingoAchievementId; title: string; blurb: string }[] = [];
  for (const r of state.rows) {
    if (!r.complete) continue;
    const id: BingoAchievementId = `bingo_color_${r.key}`;
    if (unlockedIds.has(id)) continue;
    out.push({
      id,
      title: `🎯 ${r.label} BINGO`,
      blurb: `集齐了「${r.label}」颜色下全部 7 种形态。色盲都被你卷服了。`,
    });
  }
  for (const c of state.cols) {
    if (!c.complete) continue;
    const id: BingoAchievementId = `bingo_bristol_${c.key}`;
    if (unlockedIds.has(id)) continue;
    out.push({
      id,
      title: `🎯 Type ${c.key} ${c.label} 通关`,
      blurb: `把 Bristol Type ${c.key}（${c.label}）的全部 7 种颜色都解锁了。形态学博士预备役。`,
    });
  }
  if (state.grandSlam && !unlockedIds.has("bingo_grand_slam")) {
    out.push({
      id: "bingo_grand_slam",
      title: "🏆 49 格大满贯",
      blurb: "7×7 全开，史上头一份完整屎相图鉴。该考虑写论文了。",
    });
  }
  return out;
}
