/**
 * 健康轨道 —— 取代旧 BINGO，把"集卡"改成"做对了才解锁"。
 *
 * 7 条规则按"日历窗口 + 健康指标"判定：
 *  1. 光滑七连     — 最近 7 个日历日全部 Bristol 3-5
 *  2. 告别糊状一周 — 最近 7 天没出现 Type 6-7
 *  3. 正色一月     — 最近 30 天颜色全部 normal
 *  4. 纤维大师周   — 最近 7 天 ≥5 天纤维 ≥25g
 *  5. 轻量月       — 最近 30 天 ≥14 天有记录，日均 kcal 1800-2200
 *  6. 校准 90%     — 反馈 ≥10 次，命中率 ≥90%
 *  7. 健康分破 80  — 当前 7 天健康分 ≥80
 *
 * 新规则：解锁条件全部跟"健康优化"对齐——奖励做对了，不奖励吃出问题。
 *
 * 此模块纯函数零副作用，可单测；不知道 storage / DOM。
 */

import type { HistoryEntry } from "./storage";
import { computeHealthScore } from "./stats";

export type HealthRule = {
  id: string;
  rarity: "rare" | "epic" | "legendary";
  title: string;
  blurb: string;
  detect: (history: HistoryEntry[]) => boolean;
};

/** 最近 N 个日历日的日期集合（含今天，YYYY-MM-DD 格式） */
function lastNCalendarDays(n: number, now: number = Date.now()): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < n; i++) {
    const d = new Date(now - i * 86_400_000);
    out.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

const RULES: readonly HealthRule[] = [
  {
    id: "smooth_seven",
    rarity: "epic",
    title: "🌿 光滑七连",
    blurb: "连续 7 天 Bristol 3-5。肠道很稳，继续保持。",
    detect: (history) => {
      const days = lastNCalendarDays(7);
      const inWindow = history.filter((e) => days.has(e.date));
      // 7 天每天都得有记录，且不能有任何 1-2 / 6-7
      const distinctDates = new Set(inWindow.map((e) => e.date));
      if (distinctDates.size < 7) return false;
      return inWindow.every((e) => e.bristol >= 3 && e.bristol <= 5);
    },
  },
  {
    id: "no_pasty_week",
    rarity: "rare",
    title: "✨ 告别糊状一周",
    blurb: "近 7 天没出现 Type 6-7。水分纤维稳得很。",
    detect: (history) => {
      const days = lastNCalendarDays(7);
      const inWindow = history.filter((e) => days.has(e.date));
      if (inWindow.length === 0) return false;
      return !inWindow.some((e) => e.bristol >= 6);
    },
  },
  {
    id: "normal_color_month",
    rarity: "epic",
    title: "🎨 正色一月",
    blurb: "近 30 天颜色全是「正常棕」。饮食规律到肠道不带任何小心思。",
    detect: (history) => {
      const days = lastNCalendarDays(30);
      const inWindow = history.filter((e) => days.has(e.date));
      const distinctDates = new Set(inWindow.map((e) => e.date));
      if (distinctDates.size < 30) return false;
      return inWindow.every((e) => e.color === "normal");
    },
  },
  {
    id: "fiber_master_week",
    rarity: "rare",
    title: "🌾 纤维大师周",
    blurb: "近 7 天 ≥5 天纤维 ≥25g。蔬菜界 MVP。",
    detect: (history) => {
      const days = lastNCalendarDays(7);
      const goodDays = new Set<string>();
      for (const e of history) {
        if (!days.has(e.date)) continue;
        if ((e.totalFiber ?? 0) >= 25) goodDays.add(e.date);
      }
      return goodDays.size >= 5;
    },
  },
  {
    id: "light_month",
    rarity: "epic",
    title: "🍃 轻量月",
    blurb: "近 30 天 ≥14 天有记录，日均热量在 1800-2200。克制有度。",
    detect: (history) => {
      const days = lastNCalendarDays(30);
      const dayMax = new Map<string, number>();
      for (const e of history) {
        if (!days.has(e.date)) continue;
        const cur = dayMax.get(e.date) ?? 0;
        if (e.totalKcal > cur) dayMax.set(e.date, e.totalKcal);
      }
      if (dayMax.size < 14) return false;
      const avg = Array.from(dayMax.values()).reduce((s, v) => s + v, 0) / dayMax.size;
      return avg >= 1800 && avg <= 2200;
    },
  },
  {
    id: "calibration_90",
    rarity: "legendary",
    title: "🎯 校准 90%",
    blurb: "10 次反馈以上，命中率 ≥ 90%。预测和你的肠子已经心连心。",
    detect: (history) => {
      let count = 0;
      let weighted = 0;
      for (const e of history) {
        if (!e.verdict) continue;
        count++;
        if (e.verdict === "accurate") weighted += 1;
        else if (e.verdict === "partial") weighted += 0.5;
      }
      return count >= 10 && weighted / count >= 0.9;
    },
  },
  {
    id: "score_eighty",
    rarity: "rare",
    title: "🌟 健康分破 80",
    blurb: "首次健康分跨过 80。肠道很满意。",
    detect: (history) => {
      const s = computeHealthScore(history);
      return !!s && s.total >= 80;
    },
  },
];

export function detectHealthAchievements(history: HistoryEntry[]): HealthRule[] {
  return RULES.filter((r) => r.detect(history));
}

/** 暴露规则只读视图（供 settings 页"健康成就清单"展示用） */
export const HEALTH_RULES: readonly HealthRule[] = RULES;
