import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stori — AI 简历教练",
  description: "通过对话把真实经历转化为出色简历。AI 追问、故事卡沉淀、JD 定制生成，绝不编造。",
  applicationName: "Stori",
  keywords: ["简历", "AI", "求职", "简历生成", "简历教练", "JD匹配"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Stori",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Stori — 讲好你的故事，拿到心仪的 Offer",
    description: "AI 对话式简历教练：追问真实经历，沉淀故事卡，按 JD 定制生成简历。",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5B4CF5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
