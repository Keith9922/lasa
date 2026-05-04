"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";

type Props = {
  dataUrl: string | null;
  onClose: () => void;
  /** 提供下载按钮兜底（PC 浏览器仍点这个走 a download）*/
  onDownload?: () => void;
};

/**
 * 截图保存兜底：把截图嵌在页内大图，让用户**长按保存到相册**。
 * 适用于：
 * - 手机浏览器 a download 被拦
 * - Web Share API 不可用 / 用户取消
 * - 夸克 / UC / QQ 浏览器等国内 Chromium 系
 *
 * 桌面端用户也可以右键另存或点"下载"按钮兜底。
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
          📱 <strong>长按图片</strong> → 保存到相册
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="share-modal-img" src={dataUrl} alt="分享卡片" />

        {onDownload && (
          <button
            className="share-modal-download"
            type="button"
            onClick={onDownload}
          >
            <Download size={14} aria-hidden /> 下载到电脑
          </button>
        )}
      </div>
    </div>
  );
}
