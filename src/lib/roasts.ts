/**
 * 吐槽文案兜底池
 *
 * 当 AI 生成失败时，按预测特征匹配模板。每条 30-60 字，沙雕但不下三路。
 */

import type { Prediction } from "./predict";

type RoastTemplate = {
  match: (p: Prediction) => boolean;
  picks: readonly string[];
};

const TEMPLATES: readonly RoastTemplate[] = [
  // 极端腹泻（脂肪泻）
  {
    match: (p) => p.bristol >= 6 && p.greasy,
    picks: [
      "这一坨油得能煎鸡蛋。明天上厕所记得别看手机，专心拉。",
      "你这是把胃当油锅了？厕纸先备三卷。",
      "脂肪泻预警。别问我怎么知道，问问马桶。",
    ],
  },
  // 严重便秘
  {
    match: (p) => p.bristol === 1,
    picks: [
      "硬得能当弹珠用。多吃菜，少装勇士。",
      "你这便便能当玻璃球玩。补水补水补水。",
      "干得比戈壁滩还干，咱明天加点蔬菜行不？",
    ],
  },
  // 偏便秘（Bristol 2）
  {
    match: (p) => p.bristol === 2,
    picks: [
      "凹凸不平像菠萝。下次记得加点纤维。",
      "便便表面起伏感这么强，你是不是没喝水？",
    ],
  },
  // 理想型
  {
    match: (p) => p.bristol === 4,
    picks: [
      "教科书级别排便。今天的你，赢麻了。",
      "光滑顺溜一条龙。你是肠道选手中的莫扎特。",
      "标准答案。请保持，别浪。",
    ],
  },
  // 软便/腹泻倾向
  {
    match: (p) => p.bristol >= 5 && p.bristol <= 6,
    picks: [
      "有点稀，纤维补点呗，不然明天厕所要打卡。",
      "糊糊的像稀饭，建议明天别穿白裤子。",
    ],
  },
  // 水状（Bristol 7）
  {
    match: (p) => p.bristol === 7,
    picks: [
      "纯水状。你今天到底吃了什么？建议常驻马桶。",
      "拉的不是便便，是茶水。多歇歇，少冒险。",
    ],
  },
  // 染色
  {
    match: (p) => p.color === "red",
    picks: [
      "暗红别慌，多半是甜菜或火龙果在搞事。",
      "看见红色冷静一下，今天吃啥染色食物了？",
    ],
  },
  {
    match: (p) => p.color === "green",
    picks: [
      "绿油油，像踩了草坪。绿叶菜功劳。",
      "便便颜色比抹茶蛋糕还纯。",
    ],
  },
  {
    match: (p) => p.color === "pale" || p.color === "yellow",
    picks: [
      "颜色偏淡，今天油是不是吃多了一点。",
      "黄褐配油亮，妥妥的高脂套餐。",
    ],
  },
  // 高臭
  {
    match: (p) => p.smell >= 4,
    picks: [
      "明天蹲坑请关好门。这味儿能传三层楼。",
      "气味值拉满。室友：你最好打开抽风机。",
    ],
  },
  // 默认兜底
  {
    match: () => true,
    picks: [
      "今天的便便，平平无奇又恰到好处。",
      "整体还行，明天继续保持。",
      "马桶看了会感谢你的稳定输出。",
    ],
  },
] as const;

export function pickRoast(prediction: Prediction, seed?: number): string {
  for (const tpl of TEMPLATES) {
    if (tpl.match(prediction)) {
      const idx = pickIndex(tpl.picks.length, seed);
      return tpl.picks[idx];
    }
  }
  // 上面的默认兜底已覆盖所有情况，这行只是 TS 安全
  return "今天的便便，没什么好吐槽的。";
}

function pickIndex(len: number, seed?: number): number {
  if (typeof seed === "number") return Math.abs(seed) % len;
  return Math.floor(Math.random() * len);
}
