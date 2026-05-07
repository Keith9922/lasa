"use client";

/**
 * 路由级 Error Boundary —— 任何 page / loading / layout 抛出未捕获错误都掉到这里
 */

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lasa:error-boundary]", error);
  }, [error]);

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回首页">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>💥</span>
            <span className="brand-zh">出错了</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="hero empty-state">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/mascot.svg"
            alt=""
            width={160}
            height={160}
            className="empty-illustration"
          />
          <p className="hero-eyebrow">Something broke</p>
          <h1 className="hero-title">这页崩了</h1>
          <p className="hero-sub">
            不是你的错。再试一下，多半就好了。
            {error.digest && (
              <>
                <br />
                <code style={{ fontSize: 11, opacity: 0.6 }}>{error.digest}</code>
              </>
            )}
          </p>
          <div className="result-actions" style={{ marginTop: 16, justifyContent: "center" }}>
            <button className="btn-primary" type="button" onClick={reset}>
              <RefreshCw size={14} aria-hidden /> 重试
            </button>
            <Link className="btn-secondary" href="/" style={{ textDecoration: "none" }}>
              回到首页
            </Link>
          </div>
        </section>
        <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
      </div>
    </main>
  );
}
