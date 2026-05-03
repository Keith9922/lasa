"use client";

import { forwardRef } from "react";
import type { Prediction } from "@/lib/predict";

type Props = {
  prediction: Prediction;
  roast: string;
  /** 用于截图导出时去掉 stink 等动画装饰；默认 false（实时展示）*/
  staticForShare?: boolean;
};

const COLOR_FILTER: Record<string, string> = {
  normal: "none",
  dark: "brightness(0.6) contrast(1.1)",
  yellow: "hue-rotate(-10deg) brightness(1.15) saturate(0.9)",
  pale: "brightness(1.4) saturate(0.4)",
  green: "hue-rotate(40deg) saturate(0.7) brightness(0.9)",
  red: "hue-rotate(-15deg) brightness(0.85)",
  black: "brightness(0.3) contrast(1.1)",
};

const COLOR_DOT: Record<string, string> = {
  normal: "var(--c-normal)",
  dark: "var(--c-dark)",
  yellow: "var(--c-yellow)",
  pale: "var(--c-pale)",
  green: "var(--c-green)",
  red: "var(--c-red)",
  black: "var(--c-black)",
};

export const PoopCard = forwardRef<HTMLDivElement, Props>(function PoopCard(
  { prediction, roast, staticForShare = false },
  ref,
) {
  const date = formatDate(new Date());
  const filter = COLOR_FILTER[prediction.color] ?? "none";

  return (
    <article ref={ref} className="polaroid" aria-label="预测结果卡">
      <div className="polaroid-photo">
        {!staticForShare && (
          <>
            <span className="stink" aria-hidden>〰</span>
            <span className="stink" aria-hidden>〰</span>
            <span className="stink" aria-hidden>〰</span>
          </>
        )}

        <div className="polaroid-meta">
          <span className="polaroid-eyebrow">Bristol Type</span>
          <span className="polaroid-num tabular">{prediction.bristol}</span>
          <span className="polaroid-label">{prediction.bristolLabel}</span>

          <div className="chip-row">
            <span className="chip">
              <span className="chip-dot" style={{ background: COLOR_DOT[prediction.color] }} aria-hidden />
              {prediction.colorLabel}
            </span>
            {prediction.greasy && <span className="chip">油亮</span>}
            {prediction.floats && <span className="chip">漂浮</span>}
            <span className="chip">气味 {prediction.smell}/5</span>
            <span className="chip">量 · {prediction.volumeLabel}</span>
          </div>
        </div>

        <div className="polaroid-poo" data-greasy={prediction.greasy}>
          {/* 用原生 img 是因为 html-to-image 截图导出对 next/image 兼容性差 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/poo/type-${prediction.bristol}.png`}
            alt={`Bristol ${prediction.bristol} - ${prediction.bristolLabel}`}
            style={{ filter }}
          />
        </div>

        <div className="roast" style={{ gridColumn: "1 / -1" }}>
          <span className="roast-eyebrow">AI 吐槽</span>
          <p style={{ margin: 0 }}>{roast || "AI 思考中…"}</p>
        </div>
      </div>
      <div className="polaroid-stamp">
        — {date} · LASA —
      </div>
    </article>
  );
});

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
