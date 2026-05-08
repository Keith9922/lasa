"use client";

/**
 * 「肠道月报」组件 —— 嵌在 /insights 顶部
 *
 *  - 默认渲染当前月份；如果用户已生成过 → 直接显示缓存（避免重复花 token）
 *  - 没有缓存时显示一个"📰 给我写一份"按钮，点了流式生成
 *  - 生成后写入 localStorage，下次进 insights 直接读
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Newspaper, RotateCcw, Share2, Sparkles } from "lucide-react";
import {
  getHistory,
  getSettings,
  getRecap,
  saveRecap,
  clearRecap,
  logAICall,
  getAchievements,
  type HistoryEntry,
  type RecapCache,
} from "@/lib/storage";
import { computeStats, COLOR_LABELS } from "@/lib/stats";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(p: string): string {
  const [y, m] = p.split("-");
  return `${y} 年 ${parseInt(m, 10)} 月`;
}

/** 取本月份范围内的 history */
function historyOfPeriod(list: HistoryEntry[], period: string): HistoryEntry[] {
  return list.filter((e) => e.date.startsWith(period));
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; partial: string }
  | { kind: "done"; cache: RecapCache };

export function MonthlyRecap() {
  const period = useMemo(() => currentPeriod(), []);
  const [list, setList] = useState<HistoryEntry[] | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  /**
   * 折叠态：缓存命中时默认折叠，避免 200 字散文压在首屏挤占趋势数据
   * 用户刚刚生成完 / 主动点开后 → 展开
   */
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setList(getHistory());
    const cached = getRecap(period);
    if (cached) {
      setPhase({ kind: "done", cache: cached });
      setExpanded(false);
    }
  }, [period]);

  const monthEntries = useMemo(
    () => (list ? historyOfPeriod(list, period) : []),
    [list, period],
  );

  const generate = async () => {
    if (monthEntries.length === 0) return;
    const stats = computeStats(monthEntries);
    const settings = getSettings();
    const achievementIds = getAchievements()
      .filter((a) => a.unlockedAt >= new Date(period + "-01").getTime())
      .map((a) => a.id);

    const context = {
      total: stats.total,
      days: new Set(monthEntries.map((e) => e.date)).size,
      bristol: stats.bristol as Record<string, number>,
      topColors: stats.topColors.map((c) => ({ color: COLOR_LABELS[c.color], count: c.count })),
      avgKcalPerDay: stats.avgKcalPerDay,
      accuracy: stats.accuracy,
      streak: stats.streak,
      observations: stats.observations,
      topFoods: stats.topFoods.map((f) => ({ name: f.name, count: f.count })),
      achievements: achievementIds,
    };

    setPhase({ kind: "loading", partial: "" });
    const t0 = performance.now();
    const url = `/api/recap${settings.preferRealAi ? "?strict=1" : ""}`;
    let text = "";
    let source: "ai" | "template" | "error" = "ai";
    let errorMsg: string | undefined;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, context, tone: settings.tone }),
        signal: AbortSignal.timeout(65_000),
      });
      if (!res.ok || !res.body) {
        text = "";
        source = "error";
        errorMsg = `HTTP ${res.status}`;
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";
          for (const ev of events) {
            const line = ev.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const obj = JSON.parse(payload) as
                | { type: "delta"; text: string }
                | { type: "done"; text: string; source: "ai" | "template" | "error"; latencyMs?: number; error?: string }
                | { type: "error"; message: string; code: number };
              if (obj.type === "delta") {
                text = obj.text;
                setPhase({ kind: "loading", partial: text });
              } else if (obj.type === "done") {
                text = obj.text;
                source = obj.source;
                errorMsg = obj.error;
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err) {
      source = "error";
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Math.round(performance.now() - t0);
    const cache: RecapCache = { period, text, source, generatedAt: Date.now() };
    if (source !== "error") {
      saveRecap(cache);
    }
    setPhase({ kind: "done", cache });
    setExpanded(true);
    try {
      logAICall({ endpoint: "generate-roast", source, latencyMs, at: Date.now(), errorMsg });
    } catch { /* swallow */ }
  };

  const regenerate = () => {
    clearRecap(period);
    setPhase({ kind: "idle" });
    setExpanded(true);
    void generate();
  };

  const handleCopy = async () => {
    if (phase.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(phase.cache.text);
    } catch { /* swallow */ }
  };

  if (monthEntries.length === 0) {
    // 月内还没有数据：不渲染，让 insights 主流程自己处理空态
    return null;
  }

  /** 缓存命中且未展开 → 紧凑 CTA 一行（不挤占首屏） */
  if (phase.kind === "done" && !expanded) {
    return (
      <section className="recap-collapsed" aria-label="本月肠道剧本（已折叠）">
        <button
          type="button"
          className="recap-collapsed-btn"
          onClick={() => setExpanded(true)}
        >
          <Newspaper size={14} aria-hidden />
          <span className="recap-collapsed-label">{periodLabel(period)} · 肠道剧本</span>
          <span className={`recap-source recap-source--${phase.cache.source}`}>
            {phase.cache.source === "ai" && "✨ AI 写"}
            {phase.cache.source === "template" && "📋 兜底"}
            {phase.cache.source === "error" && "⚠ 失败"}
          </span>
          <ChevronDown size={14} aria-hidden />
        </button>
      </section>
    );
  }

  return (
    <section className="recap-card" aria-label="本月肠道剧本">
      <header className="recap-head">
        <h3 className="recap-title">
          <Newspaper size={14} aria-hidden /> {periodLabel(period)} · 肠道剧本
        </h3>
        <div className="recap-head-right">
          {phase.kind === "done" && (
            <span className={`recap-source recap-source--${phase.cache.source}`}>
              {phase.cache.source === "ai" && "✨ AI 写"}
              {phase.cache.source === "template" && "📋 兜底"}
              {phase.cache.source === "error" && "⚠ 失败"}
            </span>
          )}
          {phase.kind === "done" && (
            <button
              type="button"
              className="btn-ghost recap-mini-btn"
              onClick={() => setExpanded(false)}
              aria-label="收起本月剧本"
            >
              <ChevronUp size={12} aria-hidden /> 收起
            </button>
          )}
        </div>
      </header>

      {phase.kind === "idle" && (
        <div className="recap-empty">
          <p>本月已记 {monthEntries.length} 张卡，让 AI 给你写一段 200 字小剧本？</p>
          <button type="button" className="btn-secondary recap-btn" onClick={generate}>
            <Sparkles size={14} aria-hidden /> 写一份本月剧本
          </button>
        </div>
      )}

      {phase.kind === "loading" && (
        <div className="recap-body recap-body--loading">
          <p>{phase.partial || "AI 正在翻你这个月的肠道剧本…"}</p>
        </div>
      )}

      {phase.kind === "done" && (
        <>
          <div className={`recap-body recap-body--${phase.cache.source}`}>
            {phase.cache.text ? (
              <p>{phase.cache.text}</p>
            ) : (
              <p className="recap-error">AI 这次没说话{phase.cache.source === "error" ? "（开了 strict，没走兜底）" : ""}。再试一次？</p>
            )}
          </div>
          <div className="recap-actions">
            <button type="button" className="btn-ghost recap-mini-btn" onClick={regenerate}>
              <RotateCcw size={12} aria-hidden /> 重新生成
            </button>
            {phase.cache.text && (
              <button type="button" className="btn-ghost recap-mini-btn" onClick={handleCopy}>
                <Share2 size={12} aria-hidden /> 复制全文
              </button>
            )}
            <span className="recap-time">
              {new Date(phase.cache.generatedAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
