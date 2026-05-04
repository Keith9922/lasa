/**
 * 成就 / 稀有度系统 — 沙雕抽卡风
 *
 * 4 档稀有度：
 *   common     — 普通（默认，UI 不显示）
 *   rare       — 稀有（卡片上贴个邮票样的徽章）
 *   epic       — 史诗（结果页顶部金色横幅 + 闪光，3.5s 自动消失）
 *   legendary  — 传说（全屏烟花 + 中央弹窗，需用户手动关闭）
 *
 * 规则按"先匹配先返回"，所以**最稀有的规则放最前面**。
 */

import type { Prediction } from "./predict";
import type { IntakeItem } from "./types";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type Achievement = {
  id: string;
  rarity: Rarity;
  title: string;
  blurb: string;
};

type AchievementRule = {
  id: string;
  rarity: Exclude<Rarity, "common">;
  test: (p: Prediction, items: IntakeItem[]) => boolean;
  titles: readonly string[];
  blurbs: readonly string[];
};

// ========== Helpers for tests ==========

const sumGrams = (items: IntakeItem[], tag: string): number =>
  items.reduce((s, i) => (i.tags.includes(tag) ? s + i.grams : s), 0);

const tagCount = (items: IntakeItem[], tag: string): number =>
  items.filter((i) => i.tags.includes(tag)).length;

const colorTagsHit = (items: IntakeItem[]): number => {
  let n = 0;
  if (sumGrams(items, "leafy_green") > 100) n++;
  if (sumGrams(items, "red_pigment") > 50) n++;
  if (sumGrams(items, "dark_pigment") > 30) n++;
  if (sumGrams(items, "red_meat") > 200) n++;
  return n;
};

// ========== Rules（最稀有 → 最普通）==========

const RULES: readonly AchievementRule[] = [
  // ===== LEGENDARY =====
  {
    id: "perfect_zen",
    rarity: "legendary",
    test: (p) =>
      p.bristol === 4 &&
      p.color === "normal" &&
      p.totalMacros.fiber >= 25 &&
      p.totalMacros.kcal >= 1200 &&
      p.totalMacros.kcal <= 2500,
    titles: [
      "🏆 神级排便·禅意大师",
      "🏆 完美无瑕·教科书级",
      "🏆 肠道圣体·万中无一",
    ],
    blurbs: [
      "你已超脱凡胎，明天还能再来一次的话，建议出书《我的肠道修行》。",
      "庄子见了都得跟你拜师。这是当代行为艺术的巅峰。",
      "这种排便配得上一座纪念碑。请永远保持下去。",
    ],
  },
  {
    id: "rainbow_unicorn",
    rarity: "legendary",
    test: (_p, items) => colorTagsHit(items) >= 3,
    titles: ["🌈 七色虹屎·梦幻独角兽", "🌈 不可能的彩虹屎"],
    blurbs: [
      "AI 看你这一餐都看蒙了。你的肠道是迪士尼乐园。",
      "彩虹是承诺·便便是证据。你完成了不可能的任务。",
    ],
  },
  {
    id: "rocket_launch",
    rarity: "legendary",
    test: (p) =>
      p.bristol === 7 &&
      p.volume === "huge" &&
      p.totalMacros.kcal > 0 &&
      (p.totalMacros.fat * 9) / p.totalMacros.kcal > 0.55,
    titles: ["🚀 火箭升空·重力下泄", "🚀 史诗级泻射·瀑布主播"],
    blurbs: [
      "马桶不是你的对手了。请改去户外解决。带防溅围裙。",
      "这水量足够申报水电站。开闸放水，注意泄洪。",
    ],
  },
  {
    id: "iron_baby",
    rarity: "legendary",
    test: (p) =>
      p.bristol === 1 &&
      p.totalMacros.protein > 120 &&
      p.totalMacros.fiber < 3,
    titles: ["💎 金刚不坏之肠", "💎 远古化石·考古级"],
    blurbs: [
      "考古队下周带你出土。地质学家急需研究样本。",
      "硬到能当玻璃球玩，请补水补菜补人间烟火。",
    ],
  },
  {
    id: "michelin_glutton",
    rarity: "legendary",
    test: (p) => p.totalMacros.kcal > 4500,
    titles: ["🐂 米其林暴食家·胃 OS", "🐂 一日三餐合并成一顿"],
    blurbs: [
      "厨子见你都得改行。你这一顿吃了别人三天。",
      "你的胃可以申请非物质文化遗产了。",
    ],
  },

  // ===== EPIC =====
  {
    id: "oil_baron",
    rarity: "epic",
    test: (p) => p.greasy && p.floats && p.volume === "huge",
    titles: ["💎 油田大佬·中东风采"],
    blurbs: ["你的肠道是合资石油公司。明天厕所油价上涨。"],
  },
  {
    id: "carnivore_king",
    rarity: "epic",
    test: (p) => p.color === "dark" && p.totalMacros.protein > 100,
    titles: ["🥩 食肉巨兽·荒野战神"],
    blurbs: ["这一坨蛋白浓度堪比健身餐。隔壁狮子都羡慕。"],
  },
  {
    id: "green_field",
    rarity: "epic",
    test: (p) => p.color === "green" && p.totalMacros.fiber > 18,
    titles: ["🌿 行走的菜地·叶绿素先锋"],
    blurbs: ["全村的兔子都馋你这一口。你已经长在土里了。"],
  },
  {
    id: "dragon_anger",
    rarity: "epic",
    test: (p) => p.color === "red" && (p.bristol === 6 || p.bristol === 7),
    titles: ["🐉 龙之愤怒·神话级染色"],
    blurbs: ["先冷静一下，是火龙果干的。它的工作量已经超额了。"],
  },
  {
    id: "chocolate_river",
    rarity: "epic",
    test: (p) => p.color === "black" && p.volume === "huge",
    titles: ["🍫 巧克力河·查理工厂"],
    blurbs: ["威利·旺卡看了想合作。请确认你没在嗑铁剂。"],
  },
  {
    id: "cheese_volcano",
    rarity: "epic",
    test: (p, items) => {
      const fatPct = p.totalMacros.kcal > 0 ? (p.totalMacros.fat * 9) / p.totalMacros.kcal : 0;
      return fatPct > 0.5 && sumGrams(items, "dairy") > 300;
    },
    titles: ["🧀 奶酪火山·乳脂熔岩"],
    blurbs: ["瑞士山区表示这一坨可以认证 AOP。"],
  },
  {
    id: "desert_storm",
    rarity: "epic",
    test: (p) => p.totalMacros.fiber < 3 && p.totalMacros.protein > 60,
    titles: ["🏜️ 沙漠风暴·脱水预警"],
    blurbs: ["你的肠道在喊救命。补点蔬菜不丢人。"],
  },

  // ===== RARE =====
  {
    id: "syrup_jar",
    rarity: "rare",
    test: (p) => p.totalMacros.carbs > 200 && p.totalMacros.fiber < 5,
    titles: ["🍯 糖浆罐子"],
    blurbs: ["甜到牙齿都笑了。胰岛素有点跟不上。"],
  },
  {
    id: "caffeine_panic",
    rarity: "rare",
    test: (p, items) => tagCount(items, "caffeine") >= 1 && p.bristol >= 6,
    titles: ["☕ 咖啡因紧急启动"],
    blurbs: ["咖啡当兴奋剂用，你的肠道接到了 SOS。"],
  },
  {
    id: "weekend_warrior",
    rarity: "rare",
    test: (p) => p.totalMacros.kcal > 3000 && p.totalMacros.fiber > 15,
    titles: ["🏋️ 周末战士·暴食党"],
    blurbs: ["放飞自我但还记得吃菜，及格。"],
  },
  {
    id: "franchise_owner",
    rarity: "rare",
    test: (_p, items) => tagCount(items, "fast_food") >= 2,
    titles: ["🍔 美式连锁加盟商"],
    blurbs: ["你养活了三个店长。明天的便便有 KPI。"],
  },
  {
    id: "beer_uncle",
    rarity: "rare",
    test: (p, items) => tagCount(items, "alcohol") >= 1 && p.volume === "huge",
    titles: ["🍻 啤酒大叔"],
    blurbs: ["你这肚子能藏一打。明天蹲坑请预留 30 分钟。"],
  },
  {
    id: "fiber_master",
    rarity: "rare",
    test: (p) => p.totalMacros.fiber >= 30,
    titles: ["🧹 清道夫·肠道管家"],
    blurbs: ["纤维爆表，你的肠道在感谢你。"],
  },
  {
    id: "iron_pellets",
    rarity: "rare",
    test: (p) => p.bristol === 1 || p.bristol === 2,
    titles: ["🪨 弹珠收藏家"],
    blurbs: ["这一颗颗能装进玻璃罐当摆件。"],
  },
];

export function pickAchievement(
  prediction: Prediction,
  items: IntakeItem[],
): Achievement | null {
  for (const rule of RULES) {
    if (rule.test(prediction, items)) {
      // 用 prediction 的几个特征当 seed，保证同一组数据稳定输出同一文案
      const seed = prediction.bristol + items.length + Math.round(prediction.totalMacros.kcal);
      return {
        id: rule.id,
        rarity: rule.rarity,
        title: rule.titles[seed % rule.titles.length],
        blurb: rule.blurbs[(seed * 7) % rule.blurbs.length],
      };
    }
  }
  return null;
}

export const RARITY_LABEL: Record<Exclude<Rarity, "common">, string> = {
  rare: "稀 有",
  epic: "史 诗",
  legendary: "传 说",
};
