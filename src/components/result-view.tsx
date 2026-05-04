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
import { ShareModal } from "./share-modal";

const isMobileUA = () =>
  typeof navigator !== "undefined" &&
  /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
  const [shareImage, setShareImage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const triggerDownload = (dataUrl: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `lasa-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    const node = cardRef.current;
    if (!node || sharing) return;
    setSharing(true);

    // 1) 预烤 <img>（含 CSS filter）→ 内联 data URL，绕开 iOS foreignObject 丢图
    // 2) 临时去掉 polaroid rotate(-1deg)，避免桌面端 bounding box 错位
    const restoreImages = await inlineImages(node);
    const restoreTransform = freezeTransform(node);
    let dataUrl = "";
    try {
      dataUrl = await domToPng(node, { scale: 2, backgroundColor: "transparent" });
    } catch (err) {
      console.error("[share] capture failed", err);
      onToast("截图失败，截屏试试");
      setSharing(false);
      return;
    } finally {
      restoreTransform();
      restoreImages();
    }

    // 优先 Web Share API（iOS Safari / 部分 Android Chrome 支持文件分享）
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function";

    if (canShareFiles) {
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
          setSharing(false);
          return;
        }
      } catch (err) {
        // 用户取消（AbortError）静默退出，不弹兜底 modal
        if ((err as DOMException)?.name === "AbortError") {
          setSharing(false);
          return;
        }
        // 其他错误：继续走 modal 兜底
        console.warn("[share] webshare failed, fallback to modal", err);
      }
    }

    // 桌面端：直接 a download；失败时用户能从 modal 长按 / 右键另存
    if (!isMobileUA()) {
      try {
        triggerDownload(dataUrl);
        onToast("已保存到本地 ✓");
        // 同时弹 modal 作为可复盘的确认（包含图片预览，桌面也实用）
        setShareImage(dataUrl);
        setSharing(false);
        return;
      } catch (err) {
        console.warn("[share] anchor download failed", err);
      }
    }

    // 手机其他场景（夸克 / UC / QQ / 微信内 / Android Chrome 不支持 file share）
    // → 弹 modal 让用户长按图片保存到相册
    setShareImage(dataUrl);
    onToast("长按图片保存");
    setSharing(false);
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

      <ShareModal
        dataUrl={shareImage}
        onClose={() => setShareImage(null)}
        onDownload={shareImage ? () => triggerDownload(shareImage) : undefined}
      />
    </div>
  );
}
