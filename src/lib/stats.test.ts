/**
 * stats 聚合的单测
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats";
import type { HistoryEntry } from "./storage";

function mk(partial: Partial<HistoryEntry>): HistoryEntry {
  return {
    date: "2026-05-01",
    timestamp: Date.now() - 86400000,
    bristol: 4,
    color: "normal",
    greasy: false,
    floats: false,
    smell: 2,
    volume: "medium",
    totalKcal: 1500,
    intake: [],
    ...partial,
  };
}

test("computeStats 空数组：全 0 + null", () => {
  const s = computeStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.feedbackCount, 0);
  assert.equal(s.accuracy, null);
  assert.equal(s.avgKcalPerDay, null);
  assert.equal(s.topColors.length, 0);
  assert.equal(s.topFoods.length, 0);
});

test("命中率：accurate + 0.5*partial / 总反馈数", () => {
  const s = computeStats([
    mk({ verdict: "accurate" }),
    mk({ verdict: "accurate" }),
    mk({ verdict: "partial" }),
    mk({ verdict: "wrong" }),
    mk({ verdict: undefined }),  // 不计入
  ]);
  assert.equal(s.feedbackCount, 4);
  // (2 + 0.5*1) / 4 = 0.625
  assert.equal(s.accuracy, 0.625);
});

test("Bristol 分布", () => {
  const s = computeStats([
    mk({ bristol: 4 }),
    mk({ bristol: 4 }),
    mk({ bristol: 1 }),
  ]);
  assert.equal(s.bristol[4], 2);
  assert.equal(s.bristol[1], 1);
  assert.equal(s.bristol[7], 0);
});

test("颜色分布排除 normal", () => {
  const s = computeStats([
    mk({ color: "normal" }),
    mk({ color: "normal" }),
    mk({ color: "red" }),
    mk({ color: "red" }),
    mk({ color: "green" }),
  ]);
  assert.equal(s.topColors.length, 2);
  assert.equal(s.topColors[0].color, "red");
  assert.equal(s.topColors[0].count, 2);
});

test("食物 top 排序", () => {
  const s = computeStats([
    mk({ intake: [{ id: "a", emoji: "🍕", name: "披萨", grams: 200, source: "preset" }] }),
    mk({ intake: [{ id: "a", emoji: "🍕", name: "披萨", grams: 200, source: "preset" }] }),
    mk({ intake: [{ id: "b", emoji: "🍔", name: "汉堡", grams: 200, source: "preset" }] }),
  ]);
  assert.equal(s.topFoods[0].name, "披萨");
  assert.equal(s.topFoods[0].count, 2);
});

test("最近 7 天 / 上一个 7 天窗口", () => {
  const now = Date.now();
  const day = 86400000;
  const s = computeStats([
    mk({ timestamp: now - 1 * day }),
    mk({ timestamp: now - 3 * day }),
    mk({ timestamp: now - 10 * day }),
    mk({ timestamp: now - 30 * day }),
  ]);
  assert.equal(s.last7Days, 2);
  assert.equal(s.prev7Days, 1);
});

test("便秘倾向触发观察", () => {
  const ents = Array.from({ length: 6 }, () => mk({ bristol: 1 }));
  const s = computeStats(ents);
  assert.ok(s.observations.some((o) => o.includes("便秘")));
});

test("streak：今天/昨天为锚点，往回数不间断的天数", () => {
  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const dn = (off: number) => new Date(today.getTime() - off * 86_400_000);

  // 连续 3 天：今天、昨天、前天
  const continuous = computeStats([
    mk({ date: ymd(dn(0)), timestamp: dn(0).getTime() }),
    mk({ date: ymd(dn(1)), timestamp: dn(1).getTime() }),
    mk({ date: ymd(dn(2)), timestamp: dn(2).getTime() }),
  ]);
  assert.equal(continuous.streak, 3);

  // 中间断了一天 → streak 应该是 1 或 0
  const broken = computeStats([
    mk({ date: ymd(dn(0)), timestamp: dn(0).getTime() }),
    mk({ date: ymd(dn(2)), timestamp: dn(2).getTime() }),
  ]);
  assert.equal(broken.streak, 1);

  // 只有昨天 → streak = 1（今天还没记也宽容）
  const yesterdayOnly = computeStats([
    mk({ date: ymd(dn(1)), timestamp: dn(1).getTime() }),
  ]);
  assert.equal(yesterdayOnly.streak, 1);

  // 最近一次记录是 3 天前 → streak = 0
  const stale = computeStats([
    mk({ date: ymd(dn(3)), timestamp: dn(3).getTime() }),
  ]);
  assert.equal(stale.streak, 0);
});
