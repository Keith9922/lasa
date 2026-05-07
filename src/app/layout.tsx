import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/session-provider";

const display = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://lasa-gilt.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "拉啥 — 告诉我今天吃了啥，我猜你明天拉啥",
    template: "%s — 拉啥",
  },
  description: "基于「碳水→量、蛋白质→形、脂肪→质」伪科学理论的沙雕预测。仅供娱乐。",
  applicationName: "拉啥",
  keywords: ["拉啥", "便便预测", "饮食", "Bristol", "沙雕", "AI"],
  authors: [{ name: "LASA Team" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "拉啥",
    title: "拉啥 — 我猜你明天拉啥",
    description: "把今天吃的丢进来，AI 帮你预测明天的便便。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "拉啥 — 沙雕便便预测",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "拉啥 — 我猜你明天拉啥",
    description: "把今天吃的丢进来，AI 帮你预测明天的便便。",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "拉啥",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 不锁缩放：照顾视障用户与老年用户
  viewportFit: "cover",
  themeColor: "#FBF4E0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={display.variable}>
      <body>
        <a href="#main" className="skip-link">跳到主内容</a>
        <AuthSessionProvider>
          <div id="main" tabIndex={-1}>{children}</div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
