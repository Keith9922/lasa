/**
 * BINGO 检测单测
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeBingo, diffNewBingos } from "./bingo";
import type { DexCell } from "./storage";

const mk = (color: DexCell["color"], bristol: DexCell["bristol"]): DexCell => ({
  color,
  bristol,
  unlockedAt: Date.now(),
  count: 1,
});

test("computeBingo 空格子：所有行列都 0", () => {
  const s = computeBingo([]);
  assert.equal(s.rows.length, 7);
  assert.equal(s.cols.length, 7);
  assert.equal(s.completedCount, 0);
  assert.equal(s.grandSlam, false);
  assert.ok(s.rows.every((r) => r.count === 0 && !r.complete));
  assert.ok(s.cols.every((c) => c.count === 0 && !c.complete));
});

test("computeBingo 单一颜色集齐 7 个 Bristol → 行 BINGO", () => {
  const cells: DexCell[] = [1, 2, 3, 4, 5, 6, 7].map((b) => mk("dark", b as DexCell["bristol"]));
  const s = computeBingo(cells);
  const darkRow = s.rows.find((r) => r.key === "dark")!;
  assert.equal(darkRow.complete, true);
  assert.equal(darkRow.count, 7);
  assert.equal(s.completedCount, 1);
  // 其他行都没集齐
  assert.ok(s.rows.filter((r) => r.key !== "dark").every((r) => !r.complete));
});

test("computeBingo 单一 Bristol 集齐 7 种颜色 → 列 BINGO", () => {
  const cells: DexCell[] = (["normal", "dark", "yellow", "pale", "green", "red", "black"] as const)
    .map((c) => mk(c, 4));
  const s = computeBingo(cells);
  const col4 = s.cols.find((c) => c.key === 4)!;
  assert.equal(col4.complete, true);
  assert.equal(s.completedCount, 1);
});

test("computeBingo 全开 49 格 → grand slam + 7 行 + 7 列 = 15", () => {
  const cells: DexCell[] = [];
  for (const c of ["normal", "dark", "yellow", "pale", "green", "red", "black"] as const) {
    for (const b of [1, 2, 3, 4, 5, 6, 7] as const) {
      cells.push(mk(c, b));
    }
  }
  const s = computeBingo(cells);
  assert.equal(s.grandSlam, true);
  assert.equal(s.completedCount, 15);
  assert.ok(s.rows.every((r) => r.complete));
  assert.ok(s.cols.every((c) => c.complete));
});

test("diffNewBingos：未在 unlockedIds 里的 BINGO 才返回", () => {
  const cells: DexCell[] = [1, 2, 3, 4, 5, 6, 7].map((b) => mk("dark", b as DexCell["bristol"]));
  const s = computeBingo(cells);

  // 第一次：完全空的 unlockedIds
  const news1 = diffNewBingos(s, new Set());
  assert.equal(news1.length, 1);
  assert.equal(news1[0].id, "bingo_color_dark");

  // 第二次：已经把 bingo_color_dark 注册过 → 不再返回
  const news2 = diffNewBingos(s, new Set(["bingo_color_dark"]));
  assert.equal(news2.length, 0);
});
