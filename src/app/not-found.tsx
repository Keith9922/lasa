/**
 * 自定义 404 —— 比 Next.js 默认那个友好一点
 */

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回首页">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>🚽</span>
            <span className="brand-zh">404</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="hero empty-state">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/mascot.svg"
            alt=""
            width={180}
            height={180}
            className="empty-illustration"
          />
          <p className="hero-eyebrow">Page not found</p>
          <h1 className="hero-title">没找到这一页</h1>
          <p className="hero-sub">这条路链不通，回首页再选一次吧。</p>
          <Link href="/" className="cta" style={{ marginTop: 16, textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Home size={14} aria-hidden /> 回到首页
          </Link>
        </section>
        <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
      </div>
    </main>
  );
}
