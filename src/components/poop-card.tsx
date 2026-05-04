"use client";

import { forwardRef } from "react";
import type { Prediction } from "@/lib/predict";
import type { Achievement } from "@/lib/achievements";
import { RARITY_LABEL } from "@/lib/achievements";
import { COLOR_FILTER, COLOR_DOT_VAR } from "@/lib/poop-color";

type Props = {
  prediction: Prediction;
  roast: string;
  achievement: Achievement | null;
};

const VOLUME_RANK: Record<Prediction["volume"], number> = {
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
};

export const PoopCard = forwardRef<HTMLDivElement, Props>(function PoopCard(
  { prediction, roast, achievement },
  ref,
) {
  const date = formatDate(new Date());
  const filter = COLOR_FILTER[prediction.color];
  const tier =
    achievement && achievement.rarity !== "common"
      ? (achievement.rarity as "rare" | "epic" | "legendary")
      : null;

  return (
    <article ref={ref} className="polaroid" aria-label="预测结果卡">
      <div className="polaroid-photo">
        {/* 臭气线 */}
        <span className="stink" aria-hidden>〰</span>
        <span className="stink" aria-hidden>〰</span>
        <span className="stink" aria-hidden>〰</span>

        {/* 稀有度徽章（仅 rare/epic/legendary 出现）*/}
        {tier && achievement && (
          <div className={`polaroid-rarity polaroid-rarity--${tier}`}>
            <span className="polaroid-rarity-tier">{RARITY_LABEL[tier]}</span>
            <span className="polaroid-rarity-title">{achievement.title}</span>
          </div>
        )}

        {/* 顶部 eyebrow */}
        <div className="polaroid-top">
          <span className="polaroid-eyebrow">Bristol Type</span>
          <span className="polaroid-stamp-date">{date}</span>
        </div>

        {/* 主视觉：大数字 + 居中💩 */}
        <div className="polaroid-hero">
          <div className="polaroid-num-wrap">
            <span className="polaroid-num tabular">{prediction.bristol}</span>
            <span className="polaroid-label">{prediction.bristolLabel}</span>
          </div>
          <div className="polaroid-poo-big" data-greasy={prediction.greasy}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/poo/type-${prediction.bristol}.png`}
              alt={`Bristol ${prediction.bristol} - ${prediction.bristolLabel}`}
              style={{ filter }}
            />
          </div>
        </div>

        {/* 颜色 / 臭味 / 排量 三联属性 */}
        <div className="trinity">
          <div className="trinity-cell">
            <span className="trinity-label">颜色</span>
            <span
              className="trinity-color"
              style={{ background: COLOR_DOT_VAR[prediction.color] }}
              aria-hidden
            />
            <span className="trinity-value">{prediction.colorLabel}</span>
          </div>
          <div className="trinity-cell">
            <span className="trinity-label">臭味</span>
            <span className="trinity-dots" aria-label={`臭味 ${prediction.smell}/5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="trinity-dot"
                  data-on={i <= prediction.smell}
                />
              ))}
            </span>
            <span className="trinity-value">{prediction.smell}/5</span>
          </div>
          <div className="trinity-cell">
            <span className="trinity-label">排量</span>
            <span className="trinity-bars" aria-label={`排量 ${prediction.volumeLabel}`}>
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="trinity-bar"
                  data-on={i <= VOLUME_RANK[prediction.volume]}
                />
              ))}
            </span>
            <span className="trinity-value">{prediction.volumeLabel}</span>
          </div>
        </div>

        {/* 状态徽章（漂浮 / 油亮，按需出现）*/}
        {(prediction.greasy || prediction.floats) && (
          <div className="state-badges">
            {prediction.greasy && (
              <span className="state-badge state-badge--greasy">✨ 油亮</span>
            )}
            {prediction.floats && (
              <span className="state-badge state-badge--floats">💧 漂浮</span>
            )}
          </div>
        )}

        {/* AI 吐槽（roast 还在路上时显示思考中占位）*/}
        <div className="roast" data-pending={!roast}>
          <span className="roast-eyebrow">AI 吐槽</span>
          <p>
            {roast || (
              <>
                AI 正在搜刮素材
                <span className="roast-dots" aria-hidden>…</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="polaroid-stamp">— LASA · 拉啥 —</div>
    </article>
  );
});

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
