"use client";

/**
 * 💩图鉴 —— 7 (Bristol) × 7 (颜色) = 49 格 + 成就墙
 *
 * 解锁机制：每出一张卡 → unlockDex(bristol, color)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getDex,
  getAchievements,
  unlockAchievement,
  type DexCell,
  type AchievementRecord,
} from "@/lib/storage";
import type { Prediction } from "@/lib/predict";
import { DexSkeleton } from "@/components/skeletons";
import { computeBingo, diffNewBingos } from "@/lib/bingo";
import { COLOR_HEX } from "@/lib/stats";

const COLORS: { key: Prediction["color"]; label: string }[] = [
  { key: "normal", label: "正常棕" },
  { key: "yellow", label: "黄褐" },
  { key: "dark", label: "深褐" },
  { key: "pale", label: "灰白" },
  { key: "green", label: "绿褐" },
  { key: "red", label: "暗红褐" },
  { key: "black", label: "黑褐" },
];

const BRISTOLS: Prediction["bristol"][] = [1, 2, 3, 4, 5, 6, 7];
const TOTAL = COLORS.length * BRISTOLS.length; // 49

const RARITY_LABEL = {
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
} as const;

export default function DexPage() {
  const [cells, setCells] = useState<DexCell[] | null>(null);
  const [achievements, setAchievements] = useState<AchievementRecord[] | null>(null);

  useEffect(() => {
    const dex = getDex();
    const ach = getAchievements();
    setCells(dex);

    // 进入页面时检测：用户上次出卡可能正好通关了行/列，但本地存档没拿到那次成就 ——
    // 这里"补办"一次，把 BINGO 推到成就墙。
    const state = computeBingo(dex);
    const unlockedIds = new Set(ach.map((a) => a.id));
    const news = diffNewBingos(state, unlockedIds);
    let nextAch = ach;
    for (const n of news) {
      const isGrand = n.id === "bingo_grand_slam";
      const { list } = unlockAchievement({
        id: n.id,
        rarity: isGrand ? "legendary" : "epic",
        title: n.title,
        blurb: n.blurb,
      });
      nextAch = list;
    }
    setAchievements(nextAch);
  }, []);

  const unlockedMap = useMemo(() => {
    const map = new Map<string, DexCell>();
    (cells ?? []).forEach((c) => map.set(`${c.bristol}-${c.color}`, c));
    return map;
  }, [cells]);

  const bingoState = useMemo(
    () => (cells ? computeBingo(cells) : null),
    [cells],
  );

  const unlockedCount = unlockedMap.size;

  if (cells === null || achievements === null || bingoState === null) {
    return <DexSkeleton />;
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>📚</span>
            <span className="brand-zh">图鉴</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="dex-summary">
          <div className="dex-progress">
            <div className="dex-progress-bar">
              <div
                className="dex-progress-fill"
                style={{ width: `${(unlockedCount / TOTAL) * 100}%` }}
              />
            </div>
            <p className="dex-progress-text">
              <strong>{unlockedCount}</strong> / {TOTAL} 已解锁
              <span className="dex-bingo-summary">
                · BINGO <strong>{bingoState.completedCount}</strong> / 15
              </span>
            </p>
          </div>
        </section>

        <section>
          <h3 className="dex-section-title">形态 × 颜色</h3>
          <div className="dex-grid" role="grid" aria-label="便便图鉴">
            <div className="dex-grid-row dex-grid-head" role="row">
              <div role="rowheader" />
              {BRISTOLS.map((b) => {
                const col = bingoState.cols.find((c) => c.key === b);
                return (
                  <div key={b} role="columnheader" className="dex-col-head" data-bingo={col?.complete || undefined}>
                    {b}
                    {col?.complete && <span className="dex-bingo-flag" aria-label="BINGO 列已通关">✓</span>}
                  </div>
                );
              })}
            </div>
            {COLORS.map((color) => {
              const row = bingoState.rows.find((r) => r.key === color.key);
              return (
                <div className="dex-grid-row" key={color.key} role="row" data-bingo={row?.complete || undefined}>
                  <div role="rowheader" className="dex-row-head" title={color.label}>
                    <span className="dex-color-swatch" style={{ background: COLOR_HEX[color.key] }} aria-hidden />
                    <span className="dex-row-head-label">{color.label}</span>
                    {row?.complete && <span className="dex-bingo-flag" aria-label="BINGO 行已通关">✓</span>}
                  </div>
                  {BRISTOLS.map((b) => {
                    const cell = unlockedMap.get(`${b}-${color.key}`);
                    return (
                      <div
                        key={b}
                        role="gridcell"
                        className={`dex-cell ${cell ? "unlocked" : "locked"}`}
                        title={
                          cell
                            ? `Type ${b} · ${color.label} · 解锁 ${cell.count} 次`
                            : `Type ${b} · ${color.label}（未解锁）`
                        }
                        style={cell ? { background: COLOR_HEX[color.key] } : undefined}
                      >
                        {cell ? <span className="dex-cell-num">{b}</span> : <span className="dex-cell-lock">?</span>}
                        {cell && cell.count > 1 && (
                          <span className="dex-cell-count">×{cell.count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        {achievements.length > 0 && (
          <section>
            <h3 className="dex-section-title">成就墙</h3>
            <ul className="achievement-list">
              {achievements.map((a) => (
                <li key={a.id} className={`achievement-row rarity-${a.rarity}`}>
                  <div className="achievement-meta">
                    <span className={`rarity-tag rarity-${a.rarity}`}>{RARITY_LABEL[a.rarity]}</span>
                    <strong>{a.title}</strong>
                  </div>
                  <p className="achievement-blurb">{a.blurb}</p>
                  <p className="achievement-foot">
                    {formatDate(a.unlockedAt)}{a.count > 1 ? ` · 触发 ${a.count} 次` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
      </div>
    </main>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
