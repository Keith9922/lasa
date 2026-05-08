"use client";

/**
 * 病例档案 —— 7 (Bristol) × 7 (颜色) = 49 格中性档案 + 成就墙
 *
 * 重定位：
 *  - 不再叫"图鉴"、不再有 BINGO / 集卡机制（隐式鼓励吃出异常状态，跟健康相反）
 *  - 改名"病例档案"，仅作为"你见过的肠道形态"的中性记录
 *  - 异常颜色（灰白 / 黑褐 / 暗红）解锁时附就医提示
 *  - 不再高亮"完成度"，进度文字仅陈述事实
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  getDex,
  getAchievements,
  type DexCell,
  type AchievementRecord,
} from "@/lib/storage";
import type { Prediction } from "@/lib/predict";
import { DexSkeleton } from "@/components/skeletons";
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

/**
 * 哪些颜色一旦反复出现需要提醒就医：
 *  - pale  灰白：可能是胆汁/胆道问题
 *  - black 黑褐：可能是上消化道出血（排除饮食染色）
 *  - red   暗红褐：可能下消化道出血（排除红色素食物）
 */
const WARNING_COLORS = new Set<Prediction["color"]>(["pale", "black", "red"]);

const RARITY_LABEL = {
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
} as const;

export default function DexPage() {
  const [cells, setCells] = useState<DexCell[] | null>(null);
  const [achievements, setAchievements] = useState<AchievementRecord[] | null>(null);

  useEffect(() => {
    setCells(getDex());
    setAchievements(getAchievements());
  }, []);

  const unlockedMap = useMemo(() => {
    const map = new Map<string, DexCell>();
    (cells ?? []).forEach((c) => map.set(`${c.bristol}-${c.color}`, c));
    return map;
  }, [cells]);

  /** 用户实际见过的"颜色 × 形态"组合数（陈述事实，不是"集齐目标"）*/
  const seenCount = unlockedMap.size;

  /** 已解锁的异常颜色集合 —— 用于头部就医提示横幅 */
  const seenWarningColors = useMemo(() => {
    const out = new Set<Prediction["color"]>();
    (cells ?? []).forEach((c) => {
      if (WARNING_COLORS.has(c.color) && c.count >= 2) out.add(c.color);
    });
    return out;
  }, [cells]);

  if (cells === null || achievements === null) {
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
            <span className="brand-emoji" aria-hidden>📋</span>
            <span className="brand-zh">病例档案</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="dex-summary">
          <p className="dex-fact-line">
            你见过 <strong>{seenCount}</strong> 种「形态 × 颜色」组合。这是档案，不是收集任务——
            如果你饮食一直规律，理应大部分卡都停留在 Type 3-5 + 正常棕。
          </p>
        </section>

        {seenWarningColors.size > 0 && (
          <section className="dex-warning" role="alert">
            <AlertTriangle size={14} aria-hidden />
            <div>
              <p>
                <strong>你的档案里多次出现了
                {Array.from(seenWarningColors)
                  .map((c) => COLORS.find((x) => x.key === c)?.label)
                  .filter(Boolean)
                  .join(" / ")}
                </strong>
                。这些颜色排除饮食影响（甜菜 / 火龙果 / 黑芝麻 / 铁剂等）后仍持续出现，建议**就医检查**——可能涉及胆汁、上下消化道等问题。
              </p>
              <p className="dex-warning-sub">本工具不构成医学建议，但这一栏特地拉出来提示你。</p>
            </div>
          </section>
        )}

        <section>
          <h3 className="dex-section-title">形态 × 颜色 档案</h3>
          <div className="dex-grid" role="grid" aria-label="病例档案 - 形态颜色矩阵">
            <div className="dex-grid-row dex-grid-head" role="row">
              <div role="rowheader" />
              {BRISTOLS.map((b) => (
                <div key={b} role="columnheader" className="dex-col-head">{b}</div>
              ))}
            </div>
            {COLORS.map((color) => {
              const isWarn = WARNING_COLORS.has(color.key);
              return (
                <div className="dex-grid-row" key={color.key} role="row">
                  <div
                    role="rowheader"
                    className={`dex-row-head${isWarn ? " dex-row-head--warn" : ""}`}
                    title={color.label + (isWarn ? "（如反复出现建议就医）" : "")}
                  >
                    <span className="dex-color-swatch" style={{ background: COLOR_HEX[color.key] }} aria-hidden />
                    <span className="dex-row-head-label">{color.label}</span>
                    {isWarn && <span className="dex-row-warn-flag" aria-label="健康提醒">⚠</span>}
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
                            ? `Type ${b} · ${color.label} · 出现 ${cell.count} 次${
                                isWarn && cell.count >= 2 ? " · 建议就医确认" : ""
                              }`
                            : `Type ${b} · ${color.label}（未出现过）`
                        }
                        style={cell ? { background: COLOR_HEX[color.key] } : undefined}
                      >
                        {cell ? <span className="dex-cell-num">{b}</span> : <span className="dex-cell-lock">·</span>}
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
