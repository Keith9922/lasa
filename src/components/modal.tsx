"use client";

/**
 * 通用 Modal 组件
 *
 * 设计取舍：
 *  - 桌面：居中弹窗，背景蒙黑，最大宽 560px
 *  - 移动 (≤480)：底部 sheet，从下面 slide up，更符合手机习惯
 *  - 关闭：ESC、背景点击、右上 ×
 *  - 焦点管理：打开时焦点跳到 modal 容器；关闭后自动还回触发元素
 *  - 滚动：内容超长在 modal 内部滚，底层 body 锁定不滚
 */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 可选：右上角的辅助文字（"X 个常用"等） */
  subtitle?: string;
  /** 可选：标题上方的 emoji 装饰 */
  emoji?: string;
  /** 是否在背景点击时关闭，默认 true */
  closeOnBackdrop?: boolean;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  emoji,
  closeOnBackdrop = true,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // 记录打开时的焦点元素，关闭后还回去
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // 锁定 body 滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 焦点跳到 modal 容器
    containerRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal2-backdrop"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        className="modal2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal2-title"
        tabIndex={-1}
      >
        <header className="modal2-head">
          <div className="modal2-title-wrap">
            {emoji && <span className="modal2-emoji" aria-hidden>{emoji}</span>}
            <h2 className="modal2-title" id="modal2-title">{title}</h2>
            {subtitle && <span className="modal2-subtitle">{subtitle}</span>}
          </div>
          <button
            type="button"
            className="modal2-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="modal2-body">
          {children}
        </div>
      </div>
    </div>
  );
}
