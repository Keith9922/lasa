/**
 * 历史数据聚合 —— 给 /insights 页用
 *
 * 全部从 HistoryEntry[] 里算，纯函数零副作用，可单测。
 */

import type { Prediction } from "./predict";
import type { HistoryEntry, Verdict } from "./storage";

export type HistoryStats = {
  /** 总记录数 */
  total: number;
  /** 已反馈数 */
  feedbackCount: number;
  /** 命中率：(accurate + 0.5*partial) / feedbackCount，0-1；feedbackCount=0 时为 null */
  accuracy: number | null;
  /** 反馈分布 */
  verdicts: Record<Verdict, number>;
  /** 最近一周记录数（含今天） */
  last7Days: number;
  /** 上一周（8-14 天前）记录数，用于趋势对比 */
  prev7Days: number;
  /** 平均每日热量（最近 7 天里有记录的日子的均值） */
  avgKcalPerDay: number | null;
  /** 连续记录天数 —— 以今天或昨天为锚点向前数（断 1 天即归零） */
  streak: number;
  /** Bristol 1-7 频次分布 */
  bristol: Record<Prediction["bristol"], number>;
  /** 颜色频次分布（按降序，截最常见 4 个）*/
  topColors: { color: Prediction["color"]; count: number }[];
  /** 最常出现的食物（最常见 5 个） */
  topFoods: { name: string; emoji: string; count: number }[];
  /** 长期健康观察 —— 触发的提示项 */
  observations: string[];
};

const COLORS: Prediction["color"][] = [
  "normal", "dark", "yellow", "pale", "green", "red", "black",
];

export function computeStats(history: HistoryEntry[]): HistoryStats {
  if (history.length === 0) {
    return {
      total: 0,
      feedbackCount: 0,
      accuracy: null,
      verdicts: { accurate: 0, partial: 0, wrong: 0 },
      last7Days: 0,
      prev7Days: 0,
      avgKcalPerDay: null,
      streak: 0,
      bristol: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      topColors: [],
      topFoods: [],
      observations: [],
    };
  }

  const verdicts: Record<Verdict, number> = { accurate: 0, partial: 0, wrong: 0 };
  let feedbackCount = 0;
  for (const e of history) {
    if (e.verdict) {
      verdicts[e.verdict]++;
      feedbackCount++;
    }
  }
  const accuracy =
    feedbackCount === 0
      ? null
      : (verdicts.accurate + 0.5 * verdicts.partial) / feedbackCount;

  // 时间窗口
  const now = Date.now();
  const oneDayMs = 86_400_000;
  let last7Days = 0;
  let prev7Days = 0;
  /**
   * 同一天可能多次出卡（用户加食物 / 改反馈 / 刷新预测）。
   * 之前的实现把 last7Kcal 全部 sum / dates，导致一天 3 张时
   * "日均 = 3 张相加" 的虚高。普通用户一眼觉得"我一天吃 5656 大卡"。
   * 现在按日聚合 → 每天取**最大** kcal（"那天最丰盛的一次记录"代表当日总摄入），
   * 再除以有记录的天数。
   */
  const last7DailyMax = new Map<string, number>();
  for (const e of history) {
    const age = now - e.timestamp;
    if (age <= 7 * oneDayMs) {
      last7Days++;
      const cur = last7DailyMax.get(e.date) ?? 0;
      if (e.totalKcal > cur) last7DailyMax.set(e.date, e.totalKcal);
    } else if (age <= 14 * oneDayMs) {
      prev7Days++;
    }
  }
  const avgKcalPerDay =
    last7DailyMax.size === 0
      ? null
      : Math.round(
          Array.from(last7DailyMax.values()).reduce((s, v) => s + v, 0) /
            last7DailyMax.size,
        );

  // Bristol 分布
  const bristol: Record<Prediction["bristol"], number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
  };
  for (const e of history) bristol[e.bristol]++;

  // 颜色分布（不展示 normal —— 太常见，挤掉信息）
  const colorMap = new Map<Prediction["color"], number>();
  for (const e of history) {
    if (e.color === "normal") continue;
    colorMap.set(e.color, (colorMap.get(e.color) ?? 0) + 1);
  }
  const topColors = COLORS
    .map((c) => ({ color: c, count: colorMap.get(c) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // 食物 top 5
  const foodMap = new Map<string, { name: string; emoji: string; count: number }>();
  for (const e of history) {
    for (const it of e.intake) {
      const key = it.name;
      const cur = foodMap.get(key);
      if (cur) cur.count++;
      else foodMap.set(key, { name: it.name, emoji: it.emoji, count: 1 });
    }
  }
  // 数据稀疏时（每项都 ×1）"Top 5"称呼显得无意义，过滤 ≥2 才计入
  const topFoods = Array.from(foodMap.values())
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 长期观察 —— 软提示，不是医学建议
  const observations: string[] = [];
  const total = history.length;
  if (total >= 5) {
    const constipated = bristol[1] + bristol[2];
    const loose = bristol[6] + bristol[7];
    if (constipated / total > 0.4) observations.push("最近偏便秘的天数比较多，多补点纤维和水。");
    if (loose / total > 0.4) observations.push("最近偏稀的天数偏多，留意一下乳制品/辛辣/油脂。");
    const fiberAvg =
      history.reduce((s, e) => s + (e.intake.length || 0), 0) / total;
    if (fiberAvg < 2) observations.push("每天记录的食物种类偏少，多种食材可能让结果更准。");
  }
  if (verdicts.wrong > verdicts.accurate * 2 && feedbackCount >= 5) {
    observations.push("近期「不准」反馈较多，可能你的肠道节奏不在常规模型里——等校准积累后会更靠谱。");
  }

  // streak —— 把所有出卡日期去重排成集合，从"今天 or 昨天"开始往回数
  // 锚点宽容：今天还没出 但昨天出了 也认为 streak 至少 1
  const streak = computeStreak(history);

  return {
    total,
    feedbackCount,
    accuracy,
    verdicts,
    last7Days,
    prev7Days,
    avgKcalPerDay,
    streak,
    bristol,
    topColors,
    topFoods,
    observations,
  };
}

function computeStreak(history: HistoryEntry[]): number {
  const dateSet = new Set(history.map((e) => e.date));
  if (dateSet.size === 0) return 0;
  const today = ymd(new Date());
  const yesterday = ymd(new Date(Date.now() - 86_400_000));
  // 锚点：今天有记录就从今天起；否则若昨天有就从昨天起；都没就 0
  let cursor: Date;
  if (dateSet.has(today)) cursor = new Date();
  else if (dateSet.has(yesterday)) cursor = new Date(Date.now() - 86_400_000);
  else return 0;
  let count = 0;
  while (dateSet.has(ymd(cursor))) {
    count++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const COLOR_LABELS: Record<Prediction["color"], string> = {
  normal: "正常棕",
  dark: "深褐",
  yellow: "黄褐",
  pale: "灰白",
  green: "绿褐",
  red: "暗红褐",
  black: "黑褐",
};

export const COLOR_HEX: Record<Prediction["color"], string> = {
  normal: "#7E5A3F",
  dark: "#2A1610",
  yellow: "#B8954A",
  pale: "#DDC7A0",
  green: "#6B7D3A",
  red: "#74281C",
  black: "#14080A",
};
