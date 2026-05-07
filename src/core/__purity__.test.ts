/**
 * 验证 src/core/ 真的能在 Node-only 环境下解析 + 跑业务调用，
 * 不需要 window / document / fetch / localStorage / React。
 *
 * 跑法：node --import tsx --test src/core/__purity__.test.ts
 *
 * 这个测试如果挂了，意味着核心层依赖了浏览器 API —— 小程序移植会卡壳。
 */

import test from "node:test";
import assert from "node:assert/strict";
import * as core from "./index";

test("core 模块导入不依赖任何浏览器全局", () => {
  // 仅声明，不引用 window；如果 import 自己崩了在到达这一行前就挂了
  assert.ok(typeof core.predict === "function");
  assert.ok(Array.isArray(core.PRESET_FOODS));
  assert.ok(core.PRESET_FOODS.length > 0);
});

test("core.predict 在零摄入下给稳态结果（与 lib 单测一致）", () => {
  const p = core.predict({ items: [] });
  assert.equal(p.bristol, 4);
  assert.equal(p.color, "normal");
});

test("core.computeStats 接空数组不抛", () => {
  const s = core.computeStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.accuracy, null);
});

test("core.pickRoast 一定返回非空字符串", () => {
  const r = core.pickRoast({ bristol: 4, color: "normal", greasy: false, smell: 1 });
  assert.ok(typeof r === "string" && r.length > 0);
});

test("core.intakeFromPreset 计算份量倍数", () => {
  const food = core.PRESET_FOODS[0];
  const item = core.intakeFromPreset(food, "huge");
  assert.ok(item.grams >= food.base.grams);
  assert.equal(item.source, "preset");
});
