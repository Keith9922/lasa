/**
 * 预测引擎单测 —— 用 node:test，零依赖
 *
 * 跑法：
 *   node --import tsx --test src/lib/predict.test.ts
 *
 * 这些用例不是黑盒断言"必须等于 X"，而是**期待行为**：
 * 给定典型场景 → 预测落在合理区间。算法日后调整阈值，
 * 用例仍应该过；不过的话说明语义改变，需要 review。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { predict } from "./predict";
import type { IntakeItem } from "./types";

function mk(
  partial: Partial<IntakeItem> & {
    name: string;
    grams: number;
    macros: IntakeItem["macros"];
    tags?: string[];
  },
): IntakeItem {
  return {
    id: partial.id ?? `t-${partial.name}`,
    emoji: partial.emoji ?? "🍽️",
    name: partial.name,
    grams: partial.grams,
    source: partial.source ?? "preset",
    macros: partial.macros,
    tags: partial.tags ?? [],
  };
}

test("空摄入 → 不抛，给到默认稳态", () => {
  const p = predict({ items: [] });
  assert.equal(p.bristol, 4);
  assert.equal(p.color, "normal");
  assert.equal(p.totalMacros.kcal, 0);
});

test("纯肉 + 0 纤维 + 0 水 → 干硬倾向（Bristol 1-2）", () => {
  const p = predict({
    items: [
      mk({ name: "牛排", grams: 400, macros: { kcal: 1000, carbs: 0, fiber: 0, protein: 120, fat: 50 }, tags: ["red_meat", "grilled"] }),
    ],
  });
  assert.ok(p.bristol <= 2, `expected hard stool, got ${p.bristol}`);
});

test("高纤维 + 充足水 → 接近理想（Bristol 3-4）", () => {
  const p = predict({
    items: [
      mk({ name: "杂菜饭", grams: 500, macros: { kcal: 480, carbs: 70, fiber: 28, protein: 18, fat: 12 }, tags: ["vegetable", "high_fiber", "staple"] }),
      mk({ name: "汤", grams: 400, macros: { kcal: 60, carbs: 5, fiber: 1, protein: 3, fat: 2 }, tags: ["hydration_high"] }),
    ],
    extraWaterMl: 500,
  });
  assert.ok(p.bristol === 3 || p.bristol === 4, `expected ideal, got ${p.bristol}`);
  assert.equal(p.color, "normal");
});

test("高脂火锅 + 啤酒 → 偏稀偏油（Bristol 5-6 + greasy）", () => {
  const p = predict({
    items: [
      mk({ name: "火锅", grams: 800, macros: { kcal: 1200, carbs: 50, fiber: 8, protein: 80, fat: 70 }, tags: ["red_meat", "spicy", "high_fat", "hydration_high"] }),
      mk({ name: "啤酒", grams: 1000, macros: { kcal: 420, carbs: 36, fiber: 0, protein: 4, fat: 0 }, tags: ["alcohol"] }),
    ],
  });
  assert.ok(p.bristol >= 5 && p.bristol <= 6, `expected loose, got ${p.bristol}`);
  assert.ok(p.greasy);
});

test("火龙果 → 暗红褐染色", () => {
  const p = predict({
    items: [
      mk({ name: "火龙果", grams: 400, macros: { kcal: 240, carbs: 53, fiber: 11, protein: 5, fat: 1 }, tags: ["fruit", "red_pigment", "high_fiber"] }),
    ],
  });
  assert.equal(p.color, "red");
});

test("酸奶（益生菌）+ 中等纤维 → 形态稳定，臭味偏低", () => {
  const p = predict({
    items: [
      mk({ name: "酸奶", grams: 200, macros: { kcal: 130, carbs: 17, fiber: 0, protein: 7, fat: 4 }, tags: ["dairy", "probiotic", "fermented"] }),
      mk({ name: "杂粮饭", grams: 200, macros: { kcal: 250, carbs: 50, fiber: 8, protein: 7, fat: 2 }, tags: ["staple", "high_fiber"] }),
    ],
  });
  assert.ok(p.bristol >= 3 && p.bristol <= 4);
  assert.ok(p.smell <= 3);
});

test("校准 bias > 0 → 推向更稀", () => {
  const items = [
    mk({ name: "牛排", grams: 300, macros: { kcal: 800, carbs: 0, fiber: 0, protein: 90, fat: 40 }, tags: ["red_meat"] }),
  ];
  const baseline = predict({ items });
  const biased = predict({ items, bristolBias: 2 });
  assert.ok(biased.bristol >= baseline.bristol, `bias should not push harder`);
});

test("水分 extraWaterMl 抬升体积", () => {
  const items = [
    mk({ name: "牛排", grams: 300, macros: { kcal: 800, carbs: 0, fiber: 0, protein: 90, fat: 40 }, tags: ["red_meat"] }),
  ];
  const dry = predict({ items });
  const wet = predict({ items, extraWaterMl: 2000 });
  // 体积或形态至少有一项变软变多
  const dryOrder = ["small", "medium", "large", "huge"].indexOf(dry.volume);
  const wetOrder = ["small", "medium", "large", "huge"].indexOf(wet.volume);
  assert.ok(wetOrder >= dryOrder || wet.bristol > dry.bristol);
});

test("4500+ kcal → 体积巨量", () => {
  const p = predict({
    items: [
      mk({ name: "暴食", grams: 2000, macros: { kcal: 4800, carbs: 400, fiber: 25, protein: 200, fat: 200 }, tags: ["red_meat", "high_fat", "high_sugar"] }),
    ],
  });
  assert.equal(p.volume, "huge");
});

test("大量咖啡因 → 形态偏软", () => {
  const noCaffeine = predict({
    items: [
      mk({ name: "肉夹馍", grams: 400, macros: { kcal: 700, carbs: 60, fiber: 5, protein: 30, fat: 22 }, tags: ["staple", "red_meat"] }),
    ],
  });
  const heavyCaffeine = predict({
    items: [
      mk({ name: "肉夹馍", grams: 400, macros: { kcal: 700, carbs: 60, fiber: 5, protein: 30, fat: 22 }, tags: ["staple", "red_meat"] }),
      mk({ name: "美式四杯", grams: 1000, macros: { kcal: 32, carbs: 0, fiber: 0, protein: 0, fat: 0 }, tags: ["caffeine", "hydration"] }),
    ],
  });
  // 咖啡因加进来后形态应该不会变得更硬
  assert.ok(heavyCaffeine.bristol >= noCaffeine.bristol, `caffeine should not push harder; got ${noCaffeine.bristol} → ${heavyCaffeine.bristol}`);
});

test("乳制品 + 益生菌 → 不会被推向 6（被缓冲）", () => {
  const noProbiotic = predict({
    items: [
      mk({ name: "牛奶", grams: 500, macros: { kcal: 300, carbs: 25, fiber: 0, protein: 16, fat: 16 }, tags: ["dairy"] }),
    ],
  });
  const withProbiotic = predict({
    items: [
      mk({ name: "酸奶", grams: 500, macros: { kcal: 300, carbs: 25, fiber: 0, protein: 16, fat: 16 }, tags: ["dairy", "probiotic", "fermented"] }),
    ],
  });
  // 同样量乳制品，益生菌版本不该比无益生菌版本更稀
  assert.ok(withProbiotic.bristol <= noProbiotic.bristol, `probiotic should buffer dairy; got ${noProbiotic.bristol} → ${withProbiotic.bristol}`);
});

test("macroRatio 四项相加恒等于 100，含酒精时 other 接住缺口", () => {
  // 啤酒：210kcal / 18g 碳水 / 2g 蛋白 / 0g 脂肪
  // 18*4 + 2*4 + 0*9 = 80 kcal 解释，剩 130 kcal 是酒精，约 62% other
  const beerOnly = predict({
    items: [
      mk({ name: "啤酒", grams: 500, macros: { kcal: 210, carbs: 18, fiber: 0, protein: 2, fat: 0 }, tags: ["alcohol"] }),
    ],
  });
  const sum = beerOnly.macroRatio.carbs + beerOnly.macroRatio.protein + beerOnly.macroRatio.fat + beerOnly.macroRatio.other;
  assert.equal(sum, 100, `expected sum=100, got ${sum}: ${JSON.stringify(beerOnly.macroRatio)}`);
  assert.ok(beerOnly.macroRatio.other > 50, `expected most kcal in 'other' for beer, got ${beerOnly.macroRatio.other}`);
});

test("macroRatio：无酒精饮食的 other 应为估算误差小值（<= 8%）", () => {
  // 注：即使是"纯三大宏量"，AI/预设估算本身有 5-7% 误差（食材克数 vs 实测热量）
  // 所以 other 阈值放宽到 8%，这跟"啤酒导致 other > 50%"的场景仍然清晰可分
  const p = predict({
    items: [
      mk({ name: "鸡胸肉", grams: 200, macros: { kcal: 330, carbs: 0, fiber: 0, protein: 60, fat: 8 }, tags: ["white_meat"] }),
      mk({ name: "米饭", grams: 200, macros: { kcal: 260, carbs: 56, fiber: 1, protein: 5, fat: 1 }, tags: ["staple"] }),
    ],
  });
  const sum = p.macroRatio.carbs + p.macroRatio.protein + p.macroRatio.fat + p.macroRatio.other;
  assert.equal(sum, 100);
  assert.ok(p.macroRatio.other <= 8, `pure macros: other should be < 8% (估算误差), got ${p.macroRatio.other}`);
});

test("夜宵主导 → 推向偏稀", () => {
  const dinnerOnly = predict({
    items: [
      mk({ name: "晚餐肉", grams: 400, macros: { kcal: 800, carbs: 30, fiber: 5, protein: 60, fat: 40 }, tags: ["red_meat", "meal_dinner"] }),
    ],
  });
  const lateNight = predict({
    items: [
      mk({ name: "夜宵肉", grams: 400, macros: { kcal: 800, carbs: 30, fiber: 5, protein: 60, fat: 40 }, tags: ["red_meat", "meal_late_night"] }),
    ],
  });
  assert.ok(lateNight.bristol >= dinnerOnly.bristol);
});
