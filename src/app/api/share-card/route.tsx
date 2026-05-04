/**
 * GET /api/share-card?bristol=...&color=...&...
 *
 * 服务端用 next/og 把分享卡渲染成 PNG，并以 Content-Disposition: attachment
 * 返回——浏览器（包括夸克 / UC / 微信内嵌等阉割版 Chromium）都会触发**下载**
 * 而非展示，绕开手机端各种"长按无菜单 / a download 被拦"问题。
 *
 * 不依赖原 polaroid DOM；由 query 重新构造一份 Satori 兼容的简洁卡。
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const COLOR_HEX: Record<string, string> = {
  normal: "#6F4E37",
  dark: "#3E2723",
  yellow: "#A0834C",
  pale: "#C4B089",
  green: "#5A5E2E",
  red: "#5C3025",
  black: "#1F1410",
};

const RARITY_LABEL: Record<string, string> = {
  rare: "稀 有",
  epic: "史 诗",
  legendary: "传 说",
};

const RARITY_BG: Record<string, string> = {
  rare: "linear-gradient(110deg, #B8E0FF, #DCEAFF)",
  epic: "linear-gradient(110deg, #FFE38A, #FFB766)",
  legendary: "linear-gradient(110deg, #FFD06A, #FF8FA3)",
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bristol = clamp(parseInt(sp.get("bristol") ?? "4", 10), 1, 7);
  const bristolLabel = sp.get("bristolLabel") ?? "光滑成形";
  const color = sp.get("color") ?? "normal";
  const colorLabel = sp.get("colorLabel") ?? "正常棕";
  const smell = clamp(parseInt(sp.get("smell") ?? "3", 10), 1, 5);
  const volumeLabel = sp.get("volumeLabel") ?? "适中";
  const greasy = sp.get("greasy") === "1";
  const floats = sp.get("floats") === "1";
  const roast = sp.get("roast") ?? "";
  const rarity = (sp.get("rarity") ?? "") as keyof typeof RARITY_LABEL | "";
  const rarityTitle = sp.get("rarityTitle") ?? "";
  const date = formatDate();

  // poop image as absolute URL（Satori 需要从可访问的 URL 拉）
  const origin = req.nextUrl.origin;
  const poopUrl = `${origin}/poo/type-${bristol}.png`;
  const dotColor = COLOR_HEX[color] ?? COLOR_HEX.normal;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(165deg, #FFF8E7 0%, #FCE9A8 60%, #F5C842 100%)",
          padding: "40px 36px",
          fontFamily: "sans-serif",
          color: "#2D1B0E",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 36, lineHeight: 1 }}>💩</span>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>拉啥</span>
          </div>
          <span style={{ fontSize: 16, color: "#9A7C5C", letterSpacing: 1 }}>{date}</span>
        </div>

        {/* Tomorrow's forecast eyebrow */}
        <div style={{ display: "flex", marginTop: 28 }}>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 6, color: "#E76F51", textTransform: "uppercase" }}>
            Tomorrow&apos;s Forecast
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 900, letterSpacing: 8 }}>你 明 天 大 概 会 拉 出</span>
        </div>

        {/* Rarity badge */}
        {rarity && rarityTitle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              alignSelf: "flex-start",
              marginTop: 24,
              padding: "8px 18px 8px 8px",
              borderRadius: 999,
              background: RARITY_BG[rarity] ?? RARITY_BG.rare,
              border: "1.5px solid rgba(45, 27, 14, 0.25)",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 4,
                padding: "4px 14px",
                borderRadius: 999,
                background: rarity === "rare" ? "#5BB0E0" : rarity === "epic" ? "#C9882F" : "#E76F51",
                color: "#fff",
              }}
            >
              {RARITY_LABEL[rarity]}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{rarityTitle}</span>
          </div>
        )}

        {/* Hero: number + image */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 6, color: "#5C3A1D" }}>
              BRISTOL TYPE
            </span>
            <span style={{ fontSize: 180, fontWeight: 900, lineHeight: 0.85, color: "#E76F51", marginTop: 4 }}>
              {bristol}
            </span>
            <span
              style={{
                marginTop: 12,
                fontSize: 22,
                fontWeight: 800,
                padding: "6px 18px",
                background: "rgba(255, 255, 255, 0.7)",
                borderRadius: 999,
              }}
            >
              {bristolLabel}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poopUrl}
            alt=""
            width={360}
            height={360}
            style={{ marginLeft: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Trinity */}
        <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
          <Cell label="颜色" value={colorLabel} swatch={<span style={{ width: 36, height: 36, borderRadius: 999, background: dotColor }} />} />
          <Cell label="臭味" value={`${smell} / 5`} swatch={
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: i <= smell ? "#E76F51" : "#C0A684" }} />
              ))}
            </div>
          } />
          <Cell label="排量" value={volumeLabel} swatch={
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              {[10, 16, 24, 32].map((h, i) => {
                const rank = ["small", "medium", "large", "huge"].indexOf(sp.get("volume") ?? "medium");
                return (
                  <span key={i} style={{ width: 9, height: h, borderRadius: 2, background: i <= rank ? "#8B5A2B" : "#C0A684" }} />
                );
              })}
            </div>
          } />
        </div>

        {/* State badges */}
        {(greasy || floats) && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {greasy && <Badge label="✨ 油亮" bg="rgba(255, 220, 110, 0.6)" />}
            {floats && <Badge label="💧 漂浮" bg="rgba(91, 176, 224, 0.4)" />}
          </div>
        )}

        {/* AI roast */}
        {roast && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 24,
              padding: "18px 22px",
              background: "rgba(255, 255, 255, 0.85)",
              borderRadius: 16,
              borderLeft: "4px solid #E76F51",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, color: "#E76F51" }}>AI 吐 槽</span>
            <span style={{ fontSize: 24, lineHeight: 1.5, marginTop: 6, fontWeight: 500 }}>{roast}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: 24 }}>
          <span style={{ fontSize: 16, color: "#9A7C5C", letterSpacing: 4 }}>— LASA · 拉啥 · lasa-gilt.vercel.app —</span>
        </div>
      </div>
    ),
    {
      width: 720,
      height: 1080,
      headers: {
        "Content-Disposition": `attachment; filename="lasa-${Date.now()}.png"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

// ---- helpers ----

function clamp(n: number, lo: number, hi: number): number {
  return isNaN(n) ? lo : Math.max(lo, Math.min(hi, n));
}

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Cell({ label, value, swatch }: { label: string; value: string; swatch: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "16px 12px",
        background: "rgba(255, 255, 255, 0.85)",
        borderRadius: 14,
        border: "1px solid rgba(45, 27, 14, 0.1)",
        flex: 1,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "#5C3A1D" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 36 }}>{swatch}</div>
      <span style={{ fontSize: 18, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function Badge({ label, bg }: { label: string; bg: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "6px 16px",
        borderRadius: 999,
        background: bg,
        border: "1px dashed rgba(45, 27, 14, 0.3)",
        fontSize: 16,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}
