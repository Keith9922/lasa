"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Achievement } from "@/lib/achievements";
import { RARITY_LABEL } from "@/lib/achievements";

type Props = {
  achievement: Achievement | null;
};

const CONFETTI_COLORS = [
  "#F5C842", "#E76F51", "#7CB342", "#5BB0E0", "#A55EEA", "#FF7AB6", "#F4A261",
];

const FIREWORK_PALETTES: readonly (readonly string[])[] = [
  ["#F5C842", "#FFB200", "#FF6F00"], // gold burst
  ["#FF7AB6", "#A55EEA", "#FF6F00"], // pink/violet
  ["#5BB0E0", "#9CD8F2", "#FFFFFF"], // ice
];

export function AchievementOverlay({ achievement }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement || achievement.rarity === "common") {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (achievement.rarity === "legendary") {
      // 传说级要用户主动关闭
      return;
    }
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [achievement]);

  if (!achievement || achievement.rarity === "common" || !visible) return null;

  if (achievement.rarity === "legendary") {
    return <Legendary achievement={achievement} onClose={() => setVisible(false)} />;
  }
  return <Banner achievement={achievement} />;
}

// =================== Legendary（全屏烟花 + 弹窗）===================

function Legendary({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  return (
    <div className="legendary-overlay" role="dialog" aria-modal aria-labelledby="legendary-title">
      <div className="legendary-bg" aria-hidden />

      {/* 烟花层：3 朵在不同位置 */}
      {[
        { cx: "22%", cy: "30%", palette: 0, delay: 0 },
        { cx: "78%", cy: "26%", palette: 1, delay: 250 },
        { cx: "50%", cy: "62%", palette: 2, delay: 480 },
      ].map((fw, i) => (
        <Firework
          key={i}
          cx={fw.cx}
          cy={fw.cy}
          palette={FIREWORK_PALETTES[fw.palette]}
          delayMs={fw.delay}
        />
      ))}

      {/* 彩纸雨 */}
      <div className="confetti-layer" aria-hidden>
        {Array.from({ length: 36 }).map((_, i) => {
          const x = (i * 47) % 100;
          const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          const delay = (i * 73) % 1800;
          const rot = ((i * 137) % 360) - 180;
          return (
            <span
              key={i}
              className="confetti-piece"
              style={
                {
                  ["--x"]: `${x}%`,
                  ["--color"]: color,
                  ["--delay"]: `${delay}ms`,
                  ["--rot"]: `${rot}deg`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>

      {/* 中央弹窗 */}
      <div className="legendary-card" role="document">
        <button
          className="legendary-close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={16} />
        </button>
        <span className="legendary-tier">{RARITY_LABEL.legendary}</span>
        <h2 id="legendary-title" className="legendary-title">{achievement.title}</h2>
        <p className="legendary-blurb">{achievement.blurb}</p>
        <button className="legendary-cta" type="button" onClick={onClose}>
          收 下 这 份 殊 荣
        </button>
      </div>
    </div>
  );
}

function Firework({
  cx, cy, palette, delayMs,
}: { cx: string; cy: string; palette: readonly string[]; delayMs: number }) {
  const PARTICLES = 14;
  return (
    <div className="firework" style={{ left: cx, top: cy }}>
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const angle = (360 / PARTICLES) * i;
        const color = palette[i % palette.length];
        return (
          <span
            key={i}
            className="firework-particle"
            style={
              {
                ["--angle"]: `${angle}deg`,
                ["--color"]: color,
                ["--delay"]: `${delayMs}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// =================== Epic / Rare（顶部横幅）===================

function Banner({ achievement }: { achievement: Achievement }) {
  const isEpic = achievement.rarity === "epic";
  return (
    <div
      className={`achv-banner achv-banner--${achievement.rarity}`}
      role="status"
      aria-live="polite"
    >
      <span className="achv-banner-tier">
        {RARITY_LABEL[achievement.rarity as "rare" | "epic"]}
      </span>
      <span className="achv-banner-title">{achievement.title}</span>
      {isEpic && <span className="achv-banner-shimmer" aria-hidden />}
    </div>
  );
}
