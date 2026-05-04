"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, RotateCcw, Share2, AlertTriangle } from "lucide-react";
import { domToPng } from "modern-screenshot";
import type { Prediction } from "@/lib/predict";
import type { Achievement } from "@/lib/achievements";
import { inlineImages, freezeTransform } from "@/lib/snapshot";
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

    // 1) 预烤所有 <img>（含 CSS filter）→ 内联 data URL，绕开 iOS 的 foreignObject 丢图 bug
    // 2) 截图期间临时去掉 polaroid 的 rotate(-1deg)，避免桌面端 bounding box 错位
    const restoreImages = await inlineImages(node);
    const restoreTransform = freezeTransform(node);
    try {
      const dataUrl = await domToPng(node, {
        scale: 2,
        backgroundColor: "transparent",
      });

      // 尝试 Web Share API（移动端原生分享，iOS 14.5+ / Android Chrome 75+）
      const shareCapable = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
      if (shareCapable) {
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
        } catch (err) {
          // 用户取消 share 不是错误，静默退到下载
          if ((err as DOMException)?.name === "AbortError") {
            onToast("已取消");
            return;
          }
          // 其他错误：退到下载
        }
      }

      // 桌面 / 不支持原生分享：下载图片
      // iOS Safari 不支持 <a download>，需要新窗口打开 data URL 让用户长按保存
      const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);
      if (isIOS && !shareCapable) {
        // 极端情况：iOS 老版本不支持 share API。新窗口展示让用户长按保存
        const win = window.open();
        if (win) {
          win.document.write(`<img src="${dataUrl}" style="max-width:100%" />`);
          onToast("长按图片保存到相册");
        } else {
          onToast("请允许弹窗后重试");
        }
        return;
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `lasa-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast("已保存到本地 ✓");
    } catch (err) {
      console.error("[share] failed", err);
      onToast("分享失败，截屏试试");
    } finally {
      restoreTransform();
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
