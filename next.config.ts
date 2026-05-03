import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 锁定 workspace root，避免父目录意外的 lockfile 干扰
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
