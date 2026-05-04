"use client";

import { useEffect, useState } from "react";
import type { Prediction } from "@/lib/predict";
import { COLOR_FILTER } from "@/lib/poop-color";

type Props = {
  active: boolean;
  prediction: Prediction | null;
  /** 动画完成回调；onComplete 触发后页面会等真 AI 回包再切结果，期间 scene 仍可见 */
  onComplete: () => void;
};

/** 8 个水珠的发射角度（度），均匀散开 */
const DROPLET_ANGLES = [-72, -52, -30, -10, 10, 30, 52, 72] as const;

/** scene 期间轮播的 loading 文案，每 ~2 秒切一条 */
const LOADING_LINES = [
  "computing your future…",
  "AI 在编写吐槽…",
  "马桶在做最后估算…",
  "稍等一下，要好了…",
] as const;

export function ToiletAnimation({ active, prediction, onComplete }: Props) {
  const [shake, setShake] = useState(false);
  const [toiletIn, setToiletIn] = useState(false);
  const [drop, setDrop] = useState(false);
  const [splash, setSplash] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    setShake(false);
    setToiletIn(false);
    setDrop(false);
    setSplash(false);
    setLoadingIdx(0);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }

    // 主时序 ~3.5s，给 AI 多留思考时间；onComplete 后 page 会 await 真 roast 才切页
    const t1 = setTimeout(() => setShake(true), 50);
    const t2 = setTimeout(() => setToiletIn(true), 250);
    const t3 = setTimeout(() => setShake(false), 430);
    const t4 = setTimeout(() => setDrop(true), 1000);
    const t5 = setTimeout(() => setSplash(true), 1900);
    const t6 = setTimeout(onComplete, 3500);

    // 文案轮播（仅视觉，scene 期间一直走）
    const loadingTimer = window.setInterval(() => {
      setLoadingIdx((i) => (i + 1) % LOADING_LINES.length);
    }, 2200);

    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
      window.clearInterval(loadingTimer);
    };
  }, [active, onComplete]);

  const filter = prediction ? COLOR_FILTER[prediction.color] : "none";
  const bristol = prediction?.bristol ?? 4;

  return (
    <div
      className={`scene${shake ? " scene-shake" : ""}`}
      data-show={active}
      aria-hidden={!active}
      role="status"
      aria-live="polite"
    >
      <div className="scene-stage">
        {/* 掉落的💩 */}
        <div className="poo-falling" data-drop={drop}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/poo/type-${bristol}.png`}
            alt=""
            style={{ width: "100%", height: "100%", filter }}
          />
        </div>

        {/* 水花层：放射水珠 + 中心皇冠 + 同心涟漪 */}
        <div className="splash-layer" data-go={splash}>
          {DROPLET_ANGLES.map((deg, i) => (
            <span
              key={i}
              className="splash-droplet"
              style={{
                ["--angle" as string]: `${deg}deg`,
                ["--delay" as string]: `${i * 18}ms`,
              }}
            />
          ))}
          {/* 皇冠形水花 SVG（5 个尖刺） */}
          <svg className="splash-crown" viewBox="0 0 200 80" aria-hidden>
            <defs>
              <linearGradient id="splash-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9CD8F2" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#5BB0E0" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M20 70 Q40 18 60 50 Q80 8 100 45 Q120 4 140 48 Q160 18 180 70"
              fill="none"
              stroke="url(#splash-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="60" cy="32" r="3" fill="#9CD8F2" />
            <circle cx="100" cy="22" r="3.5" fill="#9CD8F2" />
            <circle cx="140" cy="30" r="3" fill="#9CD8F2" />
          </svg>
          {/* 双层涟漪 */}
          <span className="ripple ripple-1" />
          <span className="ripple ripple-2" />
        </div>

        {/* 马桶（更大尺寸） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="toilet" src="/toilet.png" alt="" data-in={toiletIn} />

        <p className="scene-loading" aria-live="polite">{LOADING_LINES[loadingIdx]}</p>
      </div>
    </div>
  );
}
