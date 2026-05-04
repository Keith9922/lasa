/**
 * 吐槽文案兜底池
 *
 * 当 AI 生成失败时，按预测特征匹配模板。每条 30-60 字，沙雕但不下三路。
 */

import type { Prediction } from "./predict";

/** 吐槽模板只关心这几个特征，不需要完整 Prediction */
export type RoastSignals = Pick<Prediction, "bristol" | "color" | "greasy" | "smell">;

type RoastTemplate = {
  match: (p: RoastSignals) => boolean;
  picks: readonly string[];
};

const TEMPLATES: readonly RoastTemplate[] = [
  // 极端腹泻（脂肪泻）
  {
    match: (p) => p.bristol >= 6 && p.greasy,
    picks: [
      "油得能煎蛋，厕纸先备三卷。",
      "把胃当油锅了？明天蹲坑别看手机。",
      "脂肪泻预警。问问马桶就懂了。",
    ],
  },
  // 严重便秘
  {
    match: (p) => p.bristol === 1,
    picks: [
      "硬得能当弹珠玩，多吃菜。",
      "干得比戈壁还干，先补水。",
      "便便变化石，求你吃口蔬菜。",
    ],
  },
  // 偏便秘
  {
    match: (p) => p.bristol === 2,
    picks: [
      "凹凸像菠萝，下次记得加纤维。",
      "起伏感这么强，是没喝水吧？",
    ],
  },
  // 理想型
  {
    match: (p) => p.bristol === 4,
    picks: [
      "教科书级排便，今天赢麻了。",
      "光滑一条龙，肠道莫扎特。",
      "标准答案，请保持别浪。",
    ],
  },
  // 软便/腹泻倾向
  {
    match: (p) => p.bristol >= 5 && p.bristol <= 6,
    picks: [
      "有点稀，明天得打卡厕所。",
      "糊糊的，别穿白裤子。",
    ],
  },
  // 水状
  {
    match: (p) => p.bristol === 7,
    picks: [
      "纯水状，建议常驻马桶。",
      "拉的不是便便是茶水。",
    ],
  },
  // 染色
  {
    match: (p) => p.color === "red",
    picks: [
      "暗红别慌，是甜菜火龙果干的。",
      "红色冷静，问问你今天吃啥了。",
    ],
  },
  {
    match: (p) => p.color === "green",
    picks: [
      "绿油油，像踩了草坪。",
      "颜色比抹茶蛋糕还纯。",
    ],
  },
  {
    match: (p) => p.color === "pale" || p.color === "yellow",
    picks: [
      "颜色偏淡，油吃多了吧。",
      "黄褐+油亮，妥妥高脂套餐。",
    ],
  },
  // 高臭
  {
    match: (p) => p.smell >= 4,
    picks: [
      "蹲坑关好门，味儿传三楼。",
      "臭味拉满，室友求你开抽风。",
    ],
  },
  // 默认兜底
  {
    match: () => true,
    picks: [
      "平平无奇，恰到好处。",
      "整体还行，明天保持。",
      "马桶感谢你的稳定输出。",
    ],
  },
] as const;

export function pickRoast(signals: RoastSignals, seed?: number): string {
  // 最后一条模板 match=()=>true，所以 find 一定命中。`!` 是显式表达不变量。
  const tpl = TEMPLATES.find((t) => t.match(signals))!;
  return tpl.picks[pickIndex(tpl.picks.length, seed)];
}

function pickIndex(len: number, seed?: number): number {
  if (typeof seed === "number") return Math.abs(seed) % len;
  return Math.floor(Math.random() * len);
}
