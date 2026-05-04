"use client";

import { useEffect } from "react";
import { Download, ExternalLink, X } from "lucide-react";

type Props = {
  dataUrl: string | null;
  onClose: () => void;
  /** 浏览器支持时尝试 a download */
  onDownload?: () => void;
};

/**
 * 截图保存兜底，三种保存路径：
 *  1. 长按图片 → 浏览器原生"保存到相册"（手机最通用）
 *  2. 在新标签打开 → 浏览器单独展示图片，用户在标签里再操作
 *  3. 下载到电脑 → a download（部分手机浏览器会被拦，PC 一般 OK）
 *
 * 移动端 Quark / UC / QQ / 微信 / Chrome：通常 1 必能用；
 * 老 iOS Safari：1 + 2 都行；
 * PC：1 + 3 双保险。
 */
export function ShareModal({ dataUrl, onClose, onDownload }: Props) {
  useEffect(() => {
    if (!dataUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dataUrl, onClose]);

  if (!dataUrl) return null;

  const openInNewTab = () => {
    window.open(dataUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="share-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="保存分享卡片"
    >
      <div className="share-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button
          className="share-modal-close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} />
        </button>

        <p className="share-modal-tip">
          📱 <strong>长按图片</strong> → 选「保存到相册」
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="share-modal-img" src={dataUrl} alt="分享卡片" />

        <div className="share-modal-actions">
          <button
            type="button"
            className="share-modal-action"
            onClick={openInNewTab}
          >
            <ExternalLink size={14} aria-hidden /> 新标签打开
          </button>
          {onDownload && (
            <button
              type="button"
              className="share-modal-action"
              onClick={onDownload}
            >
              <Download size={14} aria-hidden /> 下载
            </button>
          )}
        </div>

        <p className="share-modal-fineprint">
          长按不行？试试上面两个按钮，或直接截屏。
        </p>
      </div>
    </div>
  );
}
