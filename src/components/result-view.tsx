"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, RotateCcw, Share2, AlertTriangle } from "lucide-react";
import { domToBlob } from "modern-screenshot";
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

  // 用 useEffect 兜底回收 blob URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (shareImage?.startsWith("blob:")) URL.revokeObjectURL(shareImage);
    };
  }, [shareImage]);

  const triggerDownloadBlob = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
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
    let blob: Blob;
    try {
      // 直接生成 Blob（比 dataURL 更省内存，移动端 img 加载也更稳）
      blob = await domToBlob(node, { scale: 2, backgroundColor: "transparent" });
    } catch (err) {
      console.error("[share] capture failed", err);
      onToast("截图失败，截屏试试");
      setSharing(false);
      restoreTransform();
      restoreImages();
      return;
    } finally {
      restoreTransform();
      restoreImages();
    }

    // 优先 Web Share API（iOS Safari / 支持的 Android）
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function";

    if (canShareFiles) {
      try {
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
        if ((err as DOMException)?.name === "AbortError") {
          setSharing(false);
          return;
        }
        console.warn("[share] webshare failed, fallback to modal", err);
      }
    }

    // 创建 blob URL（比 data URL 短得多，长按保存也能正常弹菜单）
    const blobUrl = URL.createObjectURL(blob);

    // 桌面端：尝试直接下载 + 同时弹 modal 让用户能再次操作
    if (!isMobileUA()) {
      try {
        triggerDownloadBlob(blobUrl);
        onToast("已保存到本地 ✓");
      } catch (err) {
        console.warn("[share] desktop download failed", err);
      }
    } else {
      onToast("长按图片保存到相册");
    }

    // 移动端 / 桌面都弹 modal（移动端是主救命稻草，桌面端是预览）
    setShareImage(blobUrl);
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
        onClose={() => {
          if (shareImage?.startsWith("blob:")) URL.revokeObjectURL(shareImage);
          setShareImage(null);
        }}
        onDownload={shareImage ? () => triggerDownloadBlob(shareImage) : undefined}
      />
    </div>
  );
}
