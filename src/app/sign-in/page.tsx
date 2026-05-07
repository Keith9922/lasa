"use client";

/**
 * /sign-in —— 极简登录页
 *
 * 渲染什么 provider 取决于 server 暴露的 flags（layout 注入）。
 * 默认有 demo provider（任何邮箱+昵称都能进），用于试用。
 * 配置了 AUTH_GITHUB_ID + AUTH_GITHUB_SECRET 之后会出现 GitHub 按钮。
 */

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Sparkles } from "lucide-react";

/** lucide-react@1.14 stripped the Github mark for brand-policy reasons; inline our own */
const GithubGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDemoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await signIn("demo", {
        email,
        name,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setErrorMsg("邮箱格式不对，再检查一下？");
      } else if (res?.ok) {
        window.location.href = callbackUrl;
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>🔑</span>
            <span className="brand-zh">登录</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="hero" style={{ textAlign: "center" }}>
          <p className="hero-eyebrow">Sign in to sync</p>
          <h1 className="hero-title">登录后跨设备同步</h1>
          <p className="hero-sub">不登录也能用，所有数据存在你这台设备上。</p>
        </section>

        <form className="auth-form" onSubmit={onDemoSubmit} aria-label="本地登录">
          <label className="auth-field">
            <span className="auth-label">邮箱</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">昵称</span>
            <input
              className="auth-input"
              type="text"
              autoComplete="nickname"
              placeholder="留空就用邮箱前缀"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              disabled={submitting}
            />
          </label>
          {errorMsg && <p className="auth-error" role="alert">{errorMsg}</p>}
          <button className="cta" type="submit" disabled={submitting}>
            <Sparkles size={14} aria-hidden /> {submitting ? "正在进入…" : "用邮箱登录 / 注册"}
          </button>
        </form>

        <div className="auth-divider"><span>或</span></div>

        <button
          className="btn-secondary auth-oauth"
          type="button"
          onClick={() => signIn("github", { callbackUrl })}
        >
          <GithubGlyph /> 用 GitHub 继续
        </button>
        <p className="auth-note">
          GitHub 登录在站点配置 <code>AUTH_GITHUB_ID</code> / <code>AUTH_GITHUB_SECRET</code> 之后可用。
          没配的话点了会提示「未配置」。
        </p>

        <p className="disclaimer">仅用于跨设备同步。我们只保留你的邮箱和昵称。</p>
      </div>
    </main>
  );
}
