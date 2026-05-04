"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className="modal-backdrop"
      data-open={open}
      onClick={onClose}
      role={open ? "dialog" : undefined}
      aria-modal={open}
      aria-labelledby="help-title"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title" id="help-title">怎么玩？</h3>
        <div className="modal-body">
          <p>本工具基于一个伪科学理论：</p>
          <ol>
            <li><strong>碳水（纤维）</strong>决定便便的<strong>量</strong></li>
            <li><strong>蛋白质</strong>决定便便的<strong>形态</strong></li>
            <li><strong>脂肪</strong>决定便便的<strong>油亮 / 颜色 / 漂浮</strong></li>
          </ol>
          <p>你只需要：</p>
          <ol>
            <li>「快捷选择」点食物 或 「描述一下」让 AI 解析</li>
            <li>看着今日摄入累加</li>
            <li>点「开拉」看预测结果</li>
            <li>分享给朋友看你今天吃得多惨烈</li>
          </ol>
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
            * 仅供娱乐，不构成医学建议。如有持续异常请就医。
          </p>
        </div>
        <button className="btn-accent modal-close" type="button" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}
