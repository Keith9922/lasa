"use client";

/**
 * /sign-in 表单（client）
 *
 * UX 决策：
 *  - 顶层主 CTA：GitHub OAuth（云端同步、跨设备）
 *  - 次级：「继续以游客身份」—— 直接回首页，本机 localStorage 即用
 *  - Demo 邮箱表单：仅 dev / 显式配置 AUTH_DEMO=on 时显示，折叠在「其他登录方式」下
 *
 * 三种 flags 组合：
 *  - github=true,  demo=true  → GitHub 主 CTA + Demo 折叠
 *  - github=true,  demo=false → 只有 GitHub（生产推荐）
 *  - github=false, demo=true  → 只有 Demo（本地开发）
 *  - github=false, demo=false → 不可用，提示去站点配置 OAuth
 */

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Sparkles, UserCircle } from "lucide-react";

const GithubGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

interface Props {
  flags: { readonly github: boolean; readonly demo: boolean };
}

export function SignInForm({ flags }: Props) {
  return (
    <Suspense fallback={null}>
      <SignInInner flags={flags} />
    </Suspense>
  );
}

function SignInInner({ flags }: Props) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/mascot.svg"
            alt=""
            width={160}
            height={160}
            style={{ display: "block", margin: "0 auto var(--sp-3)" }}
          />
          <p className="hero-eyebrow">Sign in to sync</p>
          <h1 className="hero-title">登录后跨设备同步</h1>
          <p className="hero-sub">
            不登录也能用，所有数据存在你这台设备上。<br />
            登录后会上传一份云端备份，换设备能拉回来。
          </p>
        </section>

        {/* GitHub OAuth：唯一主 CTA */}
        {flags.github && (
          <button
            className="cta auth-oauth-primary"
            type="button"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <GithubGlyph /> 用 GitHub 登录
          </button>
        )}

        {/* 游客模式：直接回首页 */}
        <Link className="btn-secondary auth-guest" href="/">
          <UserCircle size={16} aria-hidden /> 继续以游客身份使用（不同步）
        </Link>

        {/* Demo provider：仅 AUTH_DEMO=on 时显示，折在 details 里降权 */}
        {flags.demo && (
          <details className="auth-demo-details" open={showDemo} onToggle={(e) => setShowDemo((e.target as HTMLDetailsElement).open)}>
            <summary className="auth-demo-summary">
              其他登录方式（试用 / 开发用）
            </summary>
            <form className="auth-form" onSubmit={onDemoSubmit} aria-label="试用登录">
              <p className="auth-demo-note">
                试用模式：填邮箱 + 昵称就能进，不验证密码。**仅供本地开发或没 GitHub 时凑合用**。
              </p>
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
              <button className="btn-secondary" type="submit" disabled={submitting}>
                <Sparkles size={14} aria-hidden /> {submitting ? "正在进入…" : "用邮箱试用"}
              </button>
            </form>
          </details>
        )}

        {!flags.github && !flags.demo && (
          <p className="auth-error" role="alert">
            站点未配置任何登录方式。需要管理员设置 <code>AUTH_GITHUB_ID</code> / <code>AUTH_GITHUB_SECRET</code>，或开启 <code>AUTH_DEMO=on</code>。
          </p>
        )}

        <p className="disclaimer">登录信息仅用于云端备份你的拉啥记录。我们只保留你的邮箱和昵称。</p>
      </div>
    </main>
  );
}
