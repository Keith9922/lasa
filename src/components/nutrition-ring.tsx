"use client";

import type { Prediction } from "@/lib/predict";

type Props = {
  prediction: Prediction;
};

export function NutritionRing({ prediction }: Props) {
  const { macroRatio, totalMacros } = prediction;
  // 段落颜色：碳水黄、蛋白红、脂肪棕、其他（酒精/糖醇）灰
  // other 为 0 时不渲染那一段；> 0 时三大宏量 + 其他 必然加起来 = 100。
  const segments = [
    { label: "碳水", pct: macroRatio.carbs, color: "var(--gold)" },
    { label: "蛋白", pct: macroRatio.protein, color: "var(--hot)" },
    { label: "脂肪", pct: macroRatio.fat, color: "var(--brand)" },
    ...(macroRatio.other > 0
      ? [{ label: "其他", pct: macroRatio.other, color: "var(--ink-3)" }]
      : []),
  ];

  // SVG 圆环参数
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="nutrition" aria-label="今日营养摘要">
      <div className="nutrition-ring" aria-hidden>
        <svg viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--soft)" strokeWidth="14" />
          {segments.map((seg) => {
            const length = (seg.pct / 100) * circumference;
            const dasharray = `${length} ${circumference - length}`;
            const dashoffset = -offset;
            offset += length;
            return (
              <circle
                key={seg.label}
                cx="48" cy="48" r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="nutrition-ring-center">
          <span className="nutrition-ring-num tabular">{Math.round(totalMacros.kcal)}</span>
          <span className="nutrition-ring-unit">kcal</span>
        </div>
      </div>

      <div className="nutrition-bars">
        {segments.map((seg) => (
          <div key={seg.label} className="nutrition-row">
            <span className="nutrition-row-label">
              <span className="chip-dot" style={{ background: seg.color }} aria-hidden />
              {seg.label}
            </span>
            <span className="nutrition-row-num">{seg.pct}%</span>
          </div>
        ))}
        <div className="nutrition-fiber">
          <span>纤维</span>
          <span className="tabular">{totalMacros.fiber.toFixed(1)} g</span>
        </div>
      </div>
    </section>
  );
}
