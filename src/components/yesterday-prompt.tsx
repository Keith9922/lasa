"use client";

/**
 * 主页顶部的「昨天那一张准不准」反馈插槽
 *
 * 触发条件：localStorage 里存在某条 history.entry，date < today 且 verdict 为空
 * 用户给出反馈后插槽自动收起，反馈写入 storage 并影响下一次预测的 calibration
 */

import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { setVerdict, type HistoryEntry, type Verdict } from "@/lib/storage";

const COLOR_HEX: Record<HistoryEntry["color"], string> = {
  normal: "#6F4E37",
  dark: "#3E2723",
  yellow: "#A0834C",
  pale: "#C4B089",
  green: "#5A5E2E",
  red: "#5C3025",
  black: "#1F1410",
};

type Props = {
  entry: HistoryEntry;
  onDone: () => void;
};

export function YesterdayPrompt({ entry, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handle = (v: Verdict) => {
    if (submitting) return;
    setSubmitting(true);
    setVerdict(entry.timestamp, v);
    // 给一点动画时间
    window.setTimeout(onDone, 300);
  };

  return (
    <section className="yesterday-prompt" aria-live="polite">
      <div className="yp-thumb" style={{ background: COLOR_HEX[entry.color] }} aria-hidden>
        <span>{entry.bristol}</span>
      </div>
      <div className="yp-body">
        <p className="yp-title">昨天预测的，准不准？</p>
        <p className="yp-sub">Type {entry.bristol} · {labelColor(entry.color)} · {labelVolume(entry.volume)}</p>
        <div className="yp-actions">
          <button className="verdict-btn yes" type="button" onClick={() => handle("accurate")}>
            <Check size={12} aria-hidden /> 准
          </button>
          <button className="verdict-btn mid" type="button" onClick={() => handle("partial")}>
            <Minus size={12} aria-hidden /> 一般
          </button>
          <button className="verdict-btn no" type="button" onClick={() => handle("wrong")}>
            <X size={12} aria-hidden /> 不准
          </button>
        </div>
      </div>
    </section>
  );
}

function labelColor(c: HistoryEntry["color"]): string {
  return { normal: "正常棕", dark: "深褐", yellow: "黄褐", pale: "灰白", green: "绿褐", red: "暗红褐", black: "黑褐" }[c];
}

function labelVolume(v: HistoryEntry["volume"]): string {
  return { small: "偏少", medium: "适中", large: "偏多", huge: "巨量" }[v];
}
