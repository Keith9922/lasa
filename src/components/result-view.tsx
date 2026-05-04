"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, RotateCcw, Share2, AlertTriangle } from "lucide-react";
import { toPng } from "html-to-image";
import type { Prediction } from "@/lib/predict";
import type { Achievement } from "@/lib/achievements";
import { inlineImages } from "@/lib/snapshot";
import { PoopCard } from "./poop-card";
import { NutritionRing } from "./nutrition-ring";
import { AchievementOverlay } from "./achievement-overlay";

type Props = {
  prediction: Prediction;
  roast: string;
  achievement: Achievement | null;
  onReset: () => void;
  onToast: (msg: string) => void;
};

export function ResultView({ prediction, roast, achievement, onReset, onToast }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleShare = async () => {
    const node = cardRef.current;
    if (!node || sharing) return;
    setSharing(true);

    // iOS 上 html-to-image 序列化外部 <img> + CSS filter 会丢；
    // 先把每张 img 烤进 canvas（带 filter）变成 data URL 再截，截完还原
    const restoreImages = await inlineImages(node);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "transparent",
      });

      // 尝试 Web Share API（移动端原生分享）
      if (navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `lasa-${Date.now()}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "拉啥 — 我的便便预测",
              text: roast,
            });
            onToast("已分享 ✓");
            return;
          }
        } catch {
          // share 失败 / 用户取消 → 退到下载
        }
      }

      // 桌面/不支持原生分享：下载图片
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `lasa-${Date.now()}.png`;
      a.click();
      onToast("已保存到本地 ✓");
    } catch {
      onToast("分享失败，截屏试试");
    } finally {
      restoreImages();
      setSharing(false);
    }
  };

  return (
    <div className="result">
      <AchievementOverlay achievement={achievement} />

      <button className="result-back" type="button" onClick={onReset}>
        <ArrowLeft size={14} aria-hidden />
        <span>再来一顿</span>
      </button>

      <div>
        <p className="result-eyebrow">Tomorrow&apos;s Forecast</p>
        <h2 className="result-headline">你 明 天 大 概 会 拉 出</h2>
      </div>

      <PoopCard ref={cardRef} prediction={prediction} roast={roast} achievement={achievement} />

      <NutritionRing prediction={prediction} />

      <details className="why" open={whyOpen} onToggle={(e) => setWhyOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="why-head" aria-expanded={whyOpen}>
          <span>🧪 为啥是这个结果？</span>
          <ChevronDown size={16} style={{ transform: whyOpen ? "rotate(180deg)" : "none", transition: "transform .18s" }} aria-hidden />
        </summary>
        <div className="why-body">
          <ul>
            {prediction.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </details>

      {prediction.warnings.length > 0 && (
        <div role="region" aria-label="健康提示" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prediction.warnings.map((w, i) => (
            <div key={i} className="warning">
              <AlertTriangle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button className="btn-primary" type="button" onClick={handleShare} disabled={sharing}>
          <Share2 size={15} aria-hidden /> {sharing ? "处理中…" : "分享卡片"}
        </button>
        <button className="btn-secondary" type="button" onClick={onReset}>
          <RotateCcw size={15} aria-hidden /> 再来一顿
        </button>
      </div>

      <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
    </div>
  );
}
