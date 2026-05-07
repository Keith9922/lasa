"use client";

/**
 * 兜底 Error Boundary —— layout / 全局逻辑崩溃时启用。
 * 因为 layout 已挂，这里必须自己渲染 <html><body>。
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lasa:global-error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          fontFamily: "-apple-system, system-ui, sans-serif",
          background: "#FBF4E0",
          color: "#2D1B0E",
          margin: 0,
          padding: "8vh 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 48, margin: 0 }}>💥</p>
        <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>站点出问题了</h1>
        <p style={{ fontSize: 14, color: "#5C3A1D", margin: 0, lineHeight: 1.6 }}>
          不是你的错。重试一下，或回到首页再开一张卡。
          {error.digest && (
            <>
              <br />
              <code style={{ fontSize: 11, opacity: 0.5 }}>{error.digest}</code>
            </>
          )}
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: "#8B5A2B",
              color: "white",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            重试
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid #E8DBB8",
              background: "transparent",
              color: "#2D1B0E",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            回到首页
          </a>
        </div>
      </body>
    </html>
  );
}
