"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, RotateCcw, Share2, AlertTriangle } from "lucide-react";
import { domToBlob } from "modern-screenshot";
import type { Prediction } from "@/lib/predict";
import type { Achievement } from "@/lib/achievements";
import { inlineImages, freezeTransform } from "@/lib/snapshot";
import { PoopCard } from "./poop-card";
import { NutritionRing } from "./nutrition-ring";
import { AchievementOverlay } from "./achievement-overlay";

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
  const cardRef = useRef<HTMLDivElement | null>(null);

  /** 构造服务端渲染 PNG 的下载 URL（强制 attachment，所有浏览器都触发下载） */
  const buildServerDownloadUrl = (): string => {
    const params = new URLSearchParams({
      bristol: String(prediction.bristol),
      bristolLabel: prediction.bristolLabel,
      color: prediction.color,
      colorLabel: prediction.colorLabel,
      smell: String(prediction.smell),
      volume: prediction.volume,
      volumeLabel: prediction.volumeLabel,
      greasy: prediction.greasy ? "1" : "0",
      floats: prediction.floats ? "1" : "0",
      roast: roast.slice(0, 100),
      ...(achievement && achievement.rarity !== "common"
        ? { rarity: achievement.rarity, rarityTitle: achievement.title }
        : {}),
    });
    return `/api/share-card?${params.toString()}`;
  };

  const handleShare = async () => {
    const node = cardRef.current;
    if (!node || sharing) return;
    setSharing(true);

    // 1) 优先 Web Share API（iOS Safari / 支持的 Android Chrome）
    //    这是手机端最佳路径：原生分享面板里"保存图像"一步到位
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function";

    if (canShareFiles) {
      const restoreImages = await inlineImages(node);
      const restoreTransform = freezeTransform(node);
      try {
        const blob = await domToBlob(node, { scale: 2, backgroundColor: "transparent" });
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
        console.warn("[share] webshare failed, fallback to server download", err);
      } finally {
        restoreTransform();
        restoreImages();
      }
    }

    // 2) 阉割版手机浏览器（夸克 / UC / 微信）：导航到服务端 PNG 端点
    //    Content-Disposition: attachment 强制下载，绕开所有客户端 hack
    const downloadUrl = buildServerDownloadUrl();
    if (isMobileUA()) {
      onToast("正在下载…");
      // 用隐藏 a 触发，比 location.href 更稳；download 属性给文件命名
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `lasa-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSharing(false);
      return;
    }

    // 3) 桌面端：直接走服务端下载（同样最稳）
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `lasa-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast("已保存到本地 ✓");
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
    </div>
  );
}
