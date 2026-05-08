"use client";

/**
 * 历史时间轴
 *
 * 核心目的：
 *  1. 让用户回看自己的"屎相日记"
 *  2. 给"昨日预测"补打反馈，回灌校准
 *
 * 数据全部来自 localStorage（src/lib/storage.ts）
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Trash2, X } from "lucide-react";
import {
  getHistory,
  setVerdict,
  removeHistoryEntry,
  type HistoryEntry,
  type Verdict,
} from "@/lib/storage";
import { HistorySkeleton } from "@/components/skeletons";

// 从 lib/stats 导入避免硬编码漂移
import { COLOR_HEX } from "@/lib/stats";

const VERDICT_LABEL: Record<Verdict, string> = {
  accurate: "准了",
  partial: "差不多",
  wrong: "不准",
};

export default function HistoryPage() {
  const [list, setList] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setList(getHistory());
  }, []);

  const grouped = useMemo(() => groupByDate(list ?? []), [list]);

  const handleVerdict = (timestamp: number, verdict: Verdict) => {
    const next = setVerdict(timestamp, verdict);
    setList(next);
  };

  const handleDelete = (timestamp: number) => {
    if (!confirm("确定删除这一条记录？此操作不可撤回。")) return;
    setList(removeHistoryEntry(timestamp));
  };

  if (list === null) {
    return <HistorySkeleton />;
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>📔</span>
            <span className="brand-zh">屎相日记</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        {list.length === 0 ? (
          <section className="hero empty-state">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/empty-scroll.svg"
              alt=""
              width={200}
              height={166}
              className="empty-illustration"
            />
            <p className="hero-eyebrow">No record yet</p>
            <h1 className="hero-title">还没拉过</h1>
            <p className="hero-sub">先回首页开一张卡，明天再回来看看。</p>
            <Link href="/" className="cta" style={{ marginTop: 16, textDecoration: "none", display: "inline-block" }}>
              去开拉
            </Link>
          </section>
        ) : (
          <ol className="history-list">
            {grouped.map(([date, entries]) => (
              <li key={date} className="history-day">
                <h3 className="history-day-title">
                  {formatDateLabel(date)}
                  <span className="history-day-count">{entries.length} 张</span>
                </h3>
                <ul className="history-cards">
                  {entries.map((e) => {
                    const isPending = !e.verdict && isYesterdayOrEarlier(e.date);
                    return (
                      <li
                        key={e.timestamp}
                        className="history-card"
                        data-pending={isPending || undefined}
                      >
                        <div className="history-thumb" style={{ background: COLOR_HEX[e.color] }} aria-hidden>
                          <span>{e.bristol}</span>
                        </div>
                        <div className="history-meta">
                          <div className="history-line">
                            <strong>Type {e.bristol}</strong>
                            <span className="muted">·</span>
                            <span>{labelColor(e.color)}</span>
                            <span className="muted">·</span>
                            <span>{labelVolume(e.volume)}</span>
                            <span className="muted">·</span>
                            <span className="muted small tabular">{formatTime(e.timestamp)}</span>
                            {isPending && (
                              <span className="history-pending-badge" aria-label="待反馈">待反馈</span>
                            )}
                          </div>
                          <div className="history-line muted small">
                            {e.intake.slice(0, 4).map((it) => `${it.emoji}${it.name}`).join(" / ")}
                            {e.intake.length > 4 && ` 等 ${e.intake.length} 项`}
                          </div>
                          <div className="history-line muted small">
                            {e.totalKcal} kcal
                          </div>
                          <div className="history-verdict">
                            {e.verdict ? (
                              <span className={`verdict verdict-${e.verdict}`}>
                                你的反馈：{VERDICT_LABEL[e.verdict]}
                              </span>
                            ) : (
                              <>
                                <span className="muted small">实际怎么样？</span>
                                <button className="verdict-btn yes" onClick={() => handleVerdict(e.timestamp, "accurate")}>
                                  <Check size={12} aria-hidden /> 准
                                </button>
                                <button className="verdict-btn mid" onClick={() => handleVerdict(e.timestamp, "partial")}>
                                  <Minus size={12} aria-hidden /> 一般
                                </button>
                                <button className="verdict-btn no" onClick={() => handleVerdict(e.timestamp, "wrong")}>
                                  <X size={12} aria-hidden /> 不准
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="history-delete"
                          onClick={() => handleDelete(e.timestamp)}
                          aria-label={`删除这一条记录（Type ${e.bristol}, ${formatTime(e.timestamp)}）`}
                          title="删除"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}

        <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
      </div>
    </main>
  );
}

// ---- helpers ----

function groupByDate(list: HistoryEntry[]): [string, HistoryEntry[]][] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of list) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return Array.from(map.entries()); // 已按 history 顺序（最新在前）
}

function formatDateLabel(date: string): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (date === todayStr) return "今天";
  if (date === yStr) return "昨天";
  return date;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 今天还在演 — 不展示"待反馈"催促；昨天及以前没反馈才算"待办" */
function isYesterdayOrEarlier(date: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return date < todayStr;
}

function labelColor(c: HistoryEntry["color"]): string {
  return { normal: "正常棕", dark: "深褐", yellow: "黄褐", pale: "灰白", green: "绿褐", red: "暗红褐", black: "黑褐" }[c];
}

function labelVolume(v: HistoryEntry["volume"]): string {
  return { small: "偏少", medium: "适中", large: "偏多", huge: "巨量" }[v];
}
