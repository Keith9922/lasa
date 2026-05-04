import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "拉啥 — 告诉我今天吃了啥，我猜你明天拉啥",
  description: "基于「碳水→量、蛋白质→形、脂肪→质」伪科学理论的沙雕预测。仅供娱乐。",
  openGraph: {
    title: "拉啥 — 我猜你明天拉啥",
    description: "把今天吃的丢进来，AI 帮你预测明天的便便。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF4E0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
