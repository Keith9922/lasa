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
  /** 吐槽来源：ai = 真 AI 写、template = 本地模板兜底、error = AI 失败且 strict 模式 */
  roastSource: "ai" | "template" | "error";
  achievement: Achievement | null;
  onReset: () => void;
  onToast: (msg: string) => void;
};

export function ResultView({ prediction, roast, roastSource, achievement, onReset, onToast }: Props) {
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

  /**
   * 分享按钮点击处理（在真实 <a> 上拦截）
   * - iOS Safari / 现代 Android Chrome：用 Web Share API 调系统分享面板（最佳 UX）
   * - 其他场景：不阻止默认，让 <a href="/api/share-card?..." download> 走原生导航
   *   浏览器收到 Content-Disposition: attachment 自动触发下载（夸克 / UC / 微信都认）
   */
  const handleShareClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (sharing) {
      e.preventDefault();
      return;
    }

    const node = cardRef.current;
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function";

    // 没有 Web Share API → 让 <a> 默认行为发生（原生 download / Content-Disposition）
    if (!canShareFiles || !node) {
      // 不 preventDefault；浏览器会自己处理 anchor 跳转 + download header
      onToast(isMobileUA() ? "正在下载…" : "已开始下载");
      return;
    }

    // 有 Web Share API → 拦截，跑客户端截图分享流程（更优雅，原生分享面板）
    e.preventDefault();
    setSharing(true);

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
      console.warn("[share] webshare failed, falling back to server download", err);
    } finally {
      restoreTransform();
      restoreImages();
    }

    // Web Share API 报错（非取消）→ 手动跳转 download URL
    setSharing(false);
    window.location.href = buildServerDownloadUrl();
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

      <PoopCard ref={cardRef} prediction={prediction} roast={roast} roastSource={roastSource} achievement={achievement} />

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
        {/* 用真 <a> 而不是 <button>：没有 Web Share API 的浏览器（夸克/UC/微信）
            走原生 anchor 导航，服务端 Content-Disposition: attachment 强制下载，
            绕开所有 JS 合成 click 被拦的问题 */}
        <a
          className="btn-primary"
          href={buildServerDownloadUrl()}
          download={`lasa-${Date.now()}.png`}
          onClick={handleShareClick}
          aria-disabled={sharing}
        >
          <Share2 size={15} aria-hidden /> {sharing ? "处理中…" : "下载卡片"}
        </a>
        <button className="btn-secondary" type="button" onClick={onReset}>
          <RotateCcw size={15} aria-hidden /> 再来一顿
        </button>
      </div>

      <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
    </div>
  );
}
