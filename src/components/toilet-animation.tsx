"use client";

import { useEffect, useState } from "react";
import type { Prediction } from "@/lib/predict";
import { COLOR_FILTER } from "@/lib/poop-color";

type Props = {
  active: boolean;
  prediction: Prediction | null;
  /** 动画完成回调（包含 ~3.6 秒的全部时序）*/
  onComplete: () => void;
};

export function ToiletAnimation({ active, prediction, onComplete }: Props) {
  const [shake, setShake] = useState(false);
  const [toiletIn, setToiletIn] = useState(false);
  const [drop, setDrop] = useState(false);
  const [splash, setSplash] = useState(false);

  useEffect(() => {
    if (!active) return;
    setShake(false);
    setToiletIn(false);
    setDrop(false);
    setSplash(false);

    const reduced = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // 跳过动画，直接 1 秒后触发完成（仍然给加载文案一点时间感）
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setShake(true), 50);
    const t2 = setTimeout(() => setToiletIn(true), 250);
    const t3 = setTimeout(() => setShake(false), 450);
    const t4 = setTimeout(() => setDrop(true), 1100);
    const t5 = setTimeout(() => setSplash(true), 1900);
    const t6 = setTimeout(onComplete, 3500);

    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
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
        <div className="poo-falling" data-drop={drop}>
          {/* 动画里用原生 img；next/image 的 lazy/srcset 会和 keyframe 时序冲突 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/poo/type-${bristol}.png`}
            alt=""
            style={{ width: "100%", height: "100%", filter }}
          />
        </div>
        <svg className="splash" data-go={splash} width="120" height="60" viewBox="0 0 120 60" aria-hidden>
          <path
            d="M10 50 Q15 20 25 35 M30 55 Q40 15 45 40 M55 50 Q60 10 65 30 M75 55 Q85 20 90 40 M95 50 Q105 25 110 45"
            stroke="var(--brand)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <div className="ripple" data-go={splash} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="toilet" src="/toilet.png" alt="" data-in={toiletIn} />
        <p className="scene-loading">computing your future…</p>
      </div>
    </div>
  );
}
