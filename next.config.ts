import type { NextConfig } from "next";
import path from "node:path";

/**
 * 安全头集中在这里。`/api/*` 也覆盖（可被路由自身 Override 替换）。
 *
 * 没加 strict CSP —— Next 自带 inline 脚本和 styled-jsx 跟严格 CSP 冲突。
 * 真要上严格 CSP 需要专门加 nonce 通道，这里先给安全基线。
 */
const securityHeaders = [
  // 防 clickjacking：禁止整页被 iframe 嵌入（share-card 有自己的需求时再 override）
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 关闭 MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer 只露 origin，不带 path/query
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 关掉一些潜在隐私 surface 的 Permissions-Policy
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // 让浏览器把 cross-origin 资源限制在严格规则下
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
