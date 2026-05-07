/**
 * 共用骨架屏 —— 统一插值动画、统一形状、和真实组件像素级对齐
 *
 * 设计取舍：
 *  - 全部纯 JSX，可 SSR 也可 CSR
 *  - 真实组件 mount 后立刻替换，这一帧的"空白闪烁"被骨架覆盖
 *  - 走 .skeleton-shimmer 的 CSS 动画，prefers-reduced-motion 自动降级
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function ShellHead({ emoji, label }: { emoji: string; label: string }) {
  return (
    <header className="brand">
      <Link href="/" className="icon-btn" aria-label="返回">
        <ArrowLeft size={14} aria-hidden /> <span>返回</span>
      </Link>
      <span className="brand-logo">
        <span className="brand-emoji" aria-hidden>{emoji}</span>
        <span className="brand-zh">{label}</span>
      </span>
      <span style={{ width: 56 }} />
    </header>
  );
}

export function HistorySkeleton() {
  return (
    <main className="page" aria-busy="true">
      <div className="shell">
        <ShellHead emoji="📔" label="屎相日记" />
        <ol className="history-list">
          {[0, 1].map((i) => (
            <li key={i} className="history-day">
              <h3 className="history-day-title">
                <span className="skeleton-shimmer" style={{ width: 80, height: 18, display: "inline-block", borderRadius: 6 }} />
                <span className="history-day-count" style={{ visibility: "hidden" }}>0 张</span>
              </h3>
              <ul className="history-cards">
                {[0, 1].map((j) => (
                  <li key={j} className="history-card">
                    <div className="history-thumb skeleton-shimmer" aria-hidden />
                    <div className="history-meta">
                      <div className="history-line"><span className="skeleton-shimmer" style={{ width: "60%", height: 14, borderRadius: 4 }} /></div>
                      <div className="history-line"><span className="skeleton-shimmer" style={{ width: "80%", height: 12, borderRadius: 4 }} /></div>
                      <div className="history-line"><span className="skeleton-shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} /></div>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

export function DexSkeleton() {
  const cols = [1, 2, 3, 4, 5, 6, 7];
  const rows = [0, 1, 2, 3, 4, 5, 6];
  return (
    <main className="page" aria-busy="true">
      <div className="shell">
        <ShellHead emoji="📚" label="图鉴" />
        <section className="dex-summary">
          <div className="dex-progress">
            <div className="dex-progress-bar"><div className="dex-progress-fill" style={{ width: 0 }} /></div>
            <p className="dex-progress-text"><span className="skeleton-shimmer" style={{ width: 90, height: 16, display: "inline-block", borderRadius: 4 }} /></p>
          </div>
        </section>
        <section>
          <h3 className="dex-section-title">形态 × 颜色</h3>
          <div className="dex-grid" role="grid" aria-label="便便图鉴" aria-busy="true">
            <div className="dex-grid-row dex-grid-head" role="row">
              <div role="rowheader" />
              {cols.map((c) => (
                <div key={c} role="columnheader" className="dex-col-head">{c}</div>
              ))}
            </div>
            {rows.map((r) => (
              <div className="dex-grid-row" key={r} role="row">
                <div role="rowheader" className="dex-row-head">
                  <span className="dex-color-swatch skeleton-shimmer" aria-hidden />
                  <span className="dex-row-head-label" style={{ visibility: "hidden" }}>—</span>
                </div>
                {cols.map((c) => (
                  <div key={c} role="gridcell" className="dex-cell locked skeleton-shimmer">
                    <span className="dex-cell-lock">?</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function SettingsSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <div className="shell">
        <ShellHead emoji="⚙️" label="设置" />
        {[
          { title: "体验", rows: 2 },
          { title: "调性", rows: 2 },
          { title: "校准", rows: 1 },
          { title: "数据", rows: 2 },
        ].map((g) => (
          <section className="settings-group" key={g.title}>
            <h3 className="settings-title">{g.title}</h3>
            {Array.from({ length: g.rows }, (_, i) => (
              <div className="settings-row" key={i}>
                <span className="settings-row-text">
                  <span className="settings-row-label"><span className="skeleton-shimmer" style={{ width: 80, height: 14, display: "inline-block", borderRadius: 4 }} /></span>
                  <span className="settings-row-sub"><span className="skeleton-shimmer" style={{ width: 200, height: 12, display: "inline-block", borderRadius: 4 }} /></span>
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
