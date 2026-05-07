/**
 * Auth.js v5 配置 —— 登录 / 注册 / 会话
 *
 * 凭据策略：
 *  - **GitHub OAuth**：当 AUTH_GITHUB_ID + AUTH_GITHUB_SECRET 都设置时启用
 *  - **Demo Credentials**：始终启用，作为本地体验和"还没注册 OAuth"的回退；
 *    accept 任何邮箱+昵称组合直接发 session。**仅供试用**，
 *    若部署到公网建议把 demo provider 关掉（设 AUTH_DEMO=off）
 *
 * Session 走 JWT（无 DB）；用户 ID = `${provider}:${email | sub}`，
 * 这个 ID 会用作 cloud-sync 的命名空间（见 round 8）。
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

const githubEnabled = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const demoEnabled = process.env.AUTH_DEMO !== "off";

/**
 * AUTH_SECRET 处理：
 *  - 生产环境必须显式配置，否则 cookie 解密 / JWT 签名都跑不起来
 *  - dev 没配的话给一个固定弱密钥，并打 warning。重启后 session 仍然有效（密钥稳定）
 */
const fallbackSecret = "dev-fallback-secret-please-set-AUTH_SECRET-in-prod-32+chars";
const authSecret = process.env.AUTH_SECRET || (
  process.env.NODE_ENV !== "production"
    ? (() => {
        if (process.env._LASA_AUTH_WARNED !== "1") {
          console.warn("[lasa:auth] AUTH_SECRET 未设置，使用 dev fallback。生产环境请务必配置。");
          process.env._LASA_AUTH_WARNED = "1";
        }
        return fallbackSecret;
      })()
    : undefined
);

const providers: NextAuthConfig["providers"] = [];

if (githubEnabled) providers.push(GitHub);

if (demoEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo（本地体验）",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "you@example.com" },
        name: { label: "昵称", type: "text", placeholder: "你想叫什么都行" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        const name = String(creds?.name ?? email.split("@")[0]).trim() || email.split("@")[0];
        return {
          id: `demo:${email}`,
          email,
          name,
        };
      },
    }),
  );
}

const config: NextAuthConfig = {
  providers,
  secret: authSecret,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 天
  pages: { signIn: "/sign-in" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
      }
      return session;
    },
  },
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);

export const AUTH_PROVIDER_FLAGS = {
  github: githubEnabled,
  demo: demoEnabled,
} as const;
