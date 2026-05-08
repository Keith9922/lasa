"use client";

/**
 * /insights —— 屎相趋势
 *
 * 把 history 拍成几张可分享的图：形态分布、颜色排行、食物排行、命中率。
 * 数据全部本地，纯客户端聚合。
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, Flame, Lightbulb, Target, Trophy } from "lucide-react";
import { getHistory, type HistoryEntry } from "@/lib/storage";
import { computeStats, COLOR_LABELS, COLOR_HEX } from "@/lib/stats";
import { MonthlyRecap } from "@/components/monthly-recap";

const BRISTOL_LABELS = {
  1: "硬球",
  2: "凹凸",
  3: "裂纹",
  4: "光滑",
  5: "软团",
  6: "糊状",
  7: "水状",
} as const;

export default function InsightsPage() {
  const [list, setList] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setList(getHistory());
  }, []);

  const stats = useMemo(() => (list ? computeStats(list) : null), [list]);

  if (!stats) {
    return (
      <main className="page" aria-busy="true">
        <div className="shell">
          <header className="brand">
            <Link href="/" className="icon-btn" aria-label="返回">
              <ArrowLeft size={14} aria-hidden /> <span>返回</span>
            </Link>
            <span className="brand-logo">
              <span className="brand-emoji" aria-hidden>📊</span>
              <span className="brand-zh">趋势</span>
            </span>
            <span style={{ width: 56 }} />
          </header>
          <p className="disclaimer">读取中…</p>
        </div>
      </main>
    );
  }

  if (stats.total === 0) {
    return (
      <main className="page">
        <div className="shell">
          <header className="brand">
            <Link href="/" className="icon-btn" aria-label="返回">
              <ArrowLeft size={14} aria-hidden /> <span>返回</span>
            </Link>
            <span className="brand-logo">
              <span className="brand-emoji" aria-hidden>📊</span>
              <span className="brand-zh">趋势</span>
            </span>
            <span style={{ width: 56 }} />
          </header>
          <section className="hero empty-state">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/empty-scroll.svg"
              alt=""
              width={200}
              height={166}
              className="empty-illustration"
            />
            <p className="hero-eyebrow">No data yet</p>
            <h1 className="hero-title">还没有数据</h1>
            <p className="hero-sub">先回首页开几张卡，趋势会越来越准。</p>
            <Link
              href="/"
              className="cta"
              style={{ marginTop: 16, textDecoration: "none", display: "inline-block" }}
            >
              去开拉
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const trend = stats.last7Days - stats.prev7Days;

  // Bristol 分布最大值用于条形归一
  const bristolMax = Math.max(...Object.values(stats.bristol), 1);

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>📊</span>
            <span className="brand-zh">趋势</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <MonthlyRecap />

        <section className="insights-summary" aria-label="总览">
          <div className="insights-card insights-card--streak" data-active={stats.streak > 0}>
            <div className="insights-card-icon" aria-hidden><Flame size={16} /></div>
            <div>
              <p className="insights-card-num tabular">{stats.streak}</p>
              <p className="insights-card-sub">
                {stats.streak === 0 ? "再开一张就续上" : `连续记录 · 共 ${stats.total} 张`}
              </p>
            </div>
          </div>
          <div className="insights-card">
            <div className="insights-card-icon" aria-hidden><CalendarDays size={16} /></div>
            <div>
              <p className="insights-card-num tabular">{stats.last7Days}</p>
              <p className="insights-card-sub">
                近 7 天
                {trend !== 0 && (
                  <span className={trend > 0 ? "trend-up" : "trend-down"}>
                    {" "}
                    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="insights-card">
            <div className="insights-card-icon" aria-hidden><Target size={16} /></div>
            <div>
              <p className="insights-card-num tabular">
                {stats.accuracy === null ? "—" : `${Math.round(stats.accuracy * 100)}%`}
              </p>
              <p className="insights-card-sub">
                命中率 · {stats.feedbackCount} 次反馈
              </p>
            </div>
          </div>
          <div className="insights-card">
            <div className="insights-card-icon" aria-hidden><Trophy size={16} /></div>
            <div>
              <p className="insights-card-num tabular">
                {stats.avgKcalPerDay ?? "—"}
              </p>
              <p className="insights-card-sub">近 7 天日均 kcal</p>
            </div>
          </div>
        </section>

        <section className="insights-section" aria-label="形态分布">
          <h3 className="insights-section-title">
            <BarChart3 size={14} aria-hidden /> 形态分布
          </h3>
          <ul className="bristol-bars">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((b) => {
              const count = stats.bristol[b];
              const pct = (count / bristolMax) * 100;
              return (
                <li key={b} className="bristol-bar">
                  <span className="bristol-bar-label tabular">{b}</span>
                  <div className="bristol-bar-track" aria-hidden>
                    <div
                      className="bristol-bar-fill"
                      style={{ width: `${pct}%` }}
                      data-empty={count === 0}
                    />
                  </div>
                  <span className="bristol-bar-name">{BRISTOL_LABELS[b]}</span>
                  <span className="bristol-bar-count tabular">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {stats.topColors.length > 0 && (
          <section className="insights-section" aria-label="非常规颜色">
            <h3 className="insights-section-title">非常规颜色 Top 4</h3>
            <ul className="color-rank">
              {stats.topColors.map((c) => (
                <li key={c.color} className="color-rank-row">
                  <span
                    className="color-rank-swatch"
                    style={{ background: COLOR_HEX[c.color] }}
                    aria-hidden
                  />
                  <span className="color-rank-label">{COLOR_LABELS[c.color]}</span>
                  <span className="color-rank-count tabular">{c.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats.topFoods.length > 0 && (
          <section className="insights-section" aria-label="高频食物">
            <h3 className="insights-section-title">高频食物 Top 5</h3>
            <ul className="food-rank">
              {stats.topFoods.map((f) => (
                <li key={f.name} className="food-rank-row">
                  <span className="food-rank-emoji" aria-hidden>{f.emoji}</span>
                  <span className="food-rank-name">{f.name}</span>
                  <span className="food-rank-count tabular">×{f.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats.observations.length > 0 && (
          <section className="insights-section" aria-label="健康观察">
            <h3 className="insights-section-title">
              <Lightbulb size={14} aria-hidden /> 软提示
            </h3>
            <ul className="observation-list">
              {stats.observations.map((o, i) => (
                <li key={i} className="observation-row">{o}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
      </div>
    </main>
  );
}
