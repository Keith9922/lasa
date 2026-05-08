/**
 * 健康成就规则单测
 */

import test from "node:test";
import assert from "node:assert/strict";
import { detectHealthAchievements } from "./health-track";
import type { HistoryEntry } from "./storage";

const ymd = (off: number, now: number = Date.now()): string => {
  const d = new Date(now - off * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const mk = (partial: Partial<HistoryEntry>): HistoryEntry => ({
  date: ymd(0),
  timestamp: Date.now(),
  bristol: 4,
  color: "normal",
  greasy: false,
  floats: false,
  smell: 2,
  volume: "medium",
  totalKcal: 2000,
  totalFiber: 25,
  intake: [],
  ...partial,
});

test("空 history → 不解锁任何健康成就", () => {
  assert.equal(detectHealthAchievements([]).length, 0);
});

test("光滑七连：连续 7 天 Bristol 3-5 → 触发", () => {
  const ents = Array.from({ length: 7 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000, bristol: 4, color: "normal" }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(ids.includes("smooth_seven"), `expected smooth_seven, got ${ids.join(",")}`);
});

test("光滑七连：7 天里有一张 Type 1 → 不触发", () => {
  const ents = Array.from({ length: 7 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000, bristol: i === 3 ? 1 : 4 }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(!ids.includes("smooth_seven"));
});

test("光滑七连：只有 5 天有记录 → 不触发", () => {
  const ents = Array.from({ length: 5 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000 }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(!ids.includes("smooth_seven"));
});

test("告别糊状一周：7 天没 Type 6-7 → 触发", () => {
  const ents = Array.from({ length: 5 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000, bristol: 4 }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(ids.includes("no_pasty_week"));
});

test("告别糊状一周：里面有一张 Type 6 → 不触发", () => {
  const ents = [mk({ bristol: 6 })];
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(!ids.includes("no_pasty_week"));
});

test("纤维大师周：7 天里 5 天 fiber ≥25g → 触发", () => {
  const ents = Array.from({ length: 5 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000, totalFiber: 30 }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(ids.includes("fiber_master_week"));
});

test("纤维大师周：只有 4 天达标 → 不触发", () => {
  const ents = Array.from({ length: 4 }, (_, i) =>
    mk({ date: ymd(i), timestamp: Date.now() - i * 86_400_000, totalFiber: 30 }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(!ids.includes("fiber_master_week"));
});

test("校准 90%：10 次反馈 9 准 1 部分 → 触发", () => {
  const ents: HistoryEntry[] = [];
  for (let i = 0; i < 9; i++) ents.push(mk({ verdict: "accurate" }));
  ents.push(mk({ verdict: "partial" }));
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  // 9 + 0.5 = 9.5 / 10 = 0.95 ≥ 0.9 → 触发
  assert.ok(ids.includes("calibration_90"));
});

test("校准 90%：只有 8 次反馈即使全准 → 不触发（样本不够）", () => {
  const ents = Array.from({ length: 8 }, () => mk({ verdict: "accurate" }));
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(!ids.includes("calibration_90"));
});

test("健康分破 80：理想型 7 天 → 触发", () => {
  const ents = Array.from({ length: 7 }, (_, i) =>
    mk({
      date: ymd(i),
      timestamp: Date.now() - i * 86_400_000,
      bristol: 4,
      color: "normal",
      totalFiber: 25,
      verdict: "accurate",
    }),
  );
  const ids = detectHealthAchievements(ents).map((r) => r.id);
  assert.ok(ids.includes("score_eighty"));
});
