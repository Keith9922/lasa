"use client";

import { forwardRef } from "react";
import type { Prediction } from "@/lib/predict";
import { COLOR_FILTER, COLOR_DOT_VAR } from "@/lib/poop-color";

type Props = {
  prediction: Prediction;
  roast: string;
};

export const PoopCard = forwardRef<HTMLDivElement, Props>(function PoopCard(
  { prediction, roast },
  ref,
) {
  const date = formatDate(new Date());
  const filter = COLOR_FILTER[prediction.color];

  return (
    <article ref={ref} className="polaroid" aria-label="预测结果卡">
      <div className="polaroid-photo">
        <span className="stink" aria-hidden>〰</span>
        <span className="stink" aria-hidden>〰</span>
        <span className="stink" aria-hidden>〰</span>

        <div className="polaroid-meta">
          <span className="polaroid-eyebrow">Bristol Type</span>
          <span className="polaroid-num tabular">{prediction.bristol}</span>
          <span className="polaroid-label">{prediction.bristolLabel}</span>

          <div className="chip-row">
            <span className="chip">
              <span className="chip-dot" style={{ background: COLOR_DOT_VAR[prediction.color] }} aria-hidden />
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
