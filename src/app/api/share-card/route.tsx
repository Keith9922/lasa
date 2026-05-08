/**
 * GET /api/share-card?bristol=...&color=...
 *
 * 服务端用 next/og 把分享卡渲染成 PNG，Content-Disposition: attachment 强制下载，
 * 绕开手机浏览器的所有客户端 hack（夸克 / UC / 微信内嵌都会按 attachment 下载）。
 *
 * 布局严格匹配 DOM 上的拍立得卡：白外框 + 渐变 photo + 稀有徽章 + 大数字 + 大💩
 * + 颜色/臭味/排量三联 + 油亮/漂浮徽章 + AI 吐槽块 + 底部水印。
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// edge runtime 不能 import lib/stats（拉太多依赖）；保持手动同步
const COLOR_HEX: Record<string, string> = {
  normal: "#7E5A3F",
  dark: "#2A1610",
  yellow: "#B8954A",
  pale: "#DDC7A0",
  green: "#6B7D3A",
  red: "#74281C",
  black: "#14080A",
};

const COLOR_FILTER: Record<string, string> = {
  normal: "none",
  dark: "brightness(0.6) contrast(1.12)",
  yellow: "brightness(1.18) hue-rotate(10deg) saturate(0.85)",
  pale: "brightness(1.45) saturate(0.4)",
  green: "hue-rotate(55deg) saturate(0.55) brightness(0.92)",
  red: "hue-rotate(-15deg) brightness(0.88) saturate(1.1)",
  black: "brightness(0.32) contrast(1.18)",
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

const RARITY_TIER_BG: Record<string, string> = {
  rare: "#5BB0E0",
  epic: "#C9882F",
  legendary: "#E76F51",
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bristol = clamp(parseInt(sp.get("bristol") ?? "4", 10), 1, 7);
  const bristolLabel = sp.get("bristolLabel") ?? "光滑成形";
  const color = sp.get("color") ?? "normal";
  const colorLabel = sp.get("colorLabel") ?? "正常棕";
  const smell = clamp(parseInt(sp.get("smell") ?? "3", 10), 1, 5);
  const volume = sp.get("volume") ?? "medium";
  const volumeLabel = sp.get("volumeLabel") ?? "适中";
  const greasy = sp.get("greasy") === "1";
  const floats = sp.get("floats") === "1";
  const roast = sp.get("roast") ?? "";
  const rarity = sp.get("rarity") ?? "";
  const rarityTitle = sp.get("rarityTitle") ?? "";
  const date = formatDate();

  const origin = req.nextUrl.origin;
  const poopUrl = `${origin}/poo/type-${bristol}.png`;
  const dotColor = COLOR_HEX[color] ?? COLOR_HEX.normal;
  const filter = COLOR_FILTER[color] ?? "none";
  const volumeRank = ["small", "medium", "large", "huge"].indexOf(volume);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#FBF4E0",
          padding: "32px 36px",
          fontFamily: "sans-serif",
          color: "#2D1B0E",
        }}
      >
        {/* 顶部 eyebrow + 大标题（拍立得外）*/}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#E76F51",
              textTransform: "uppercase",
            }}
          >
            Tomorrow&apos;s Forecast
          </span>
          <span
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 8,
              color: "#2D1B0E",
            }}
          >
            你 明 天 大 概 会 拉 出
          </span>
        </div>

        {/* 拍立得外框 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "16px 16px 32px",
            marginTop: 24,
            boxShadow: "0 30px 60px -20px rgba(45, 27, 14, 0.35)",
          }}
        >
          {/* 内层 photo（渐变背景）*/}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 22px 22px",
              borderRadius: 6,
              background: "linear-gradient(165deg, #FFF8E7 0%, #FCE9A8 60%, #F5C842 100%)",
              gap: 16,
            }}
          >
            {/* 稀有徽章 */}
            {rarity && rarityTitle && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  alignSelf: "flex-start",
                  padding: "6px 16px 6px 6px",
                  borderRadius: 999,
                  background: RARITY_BG[rarity] ?? RARITY_BG.rare,
                  border: "1.5px solid rgba(45, 27, 14, 0.25)",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 4,
                    padding: "3px 12px",
                    borderRadius: 999,
                    background: RARITY_TIER_BG[rarity] ?? "#5BB0E0",
                    color: "#fff",
                  }}
                >
                  {RARITY_LABEL[rarity]}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{rarityTitle}</span>
              </div>
            )}

            {/* eyebrow 行：BRISTOL TYPE + date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "#5C3A1D" }}>
                BRISTOL TYPE
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "#9A7C5C",
                  letterSpacing: 1,
                  fontFamily: "monospace",
                }}
              >
                {date}
              </span>
            </div>

            {/* Hero：大数字 + label + 大💩 */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 4 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 140,
                    fontWeight: 900,
                    lineHeight: 0.85,
                    color: "#E76F51",
                  }}
                >
                  {bristol}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    padding: "4px 14px",
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
                width={300}
                height={300}
                style={{ marginLeft: "auto", objectFit: "contain", filter }}
              />
            </div>

            {/* 三联：颜色 / 臭味 / 排量 */}
            <div style={{ display: "flex", gap: 10 }}>
              <Cell
                label="颜色"
                value={colorLabel}
                content={
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: dotColor,
                      boxShadow:
                        "0 2px 4px rgba(0,0,0,0.15), inset 0 -3px 6px rgba(0,0,0,0.18)",
                    }}
                  />
                }
              />
              <Cell
                label="臭味"
                value={`${smell} / 5`}
                content={
                  <div style={{ display: "flex", gap: 5, alignItems: "center", height: 32 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: i <= smell ? "#E76F51" : "#C0A684",
                        }}
                      />
                    ))}
                  </div>
                }
              />
              <Cell
                label="排量"
                value={volumeLabel}
                content={
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32 }}>
                    {[10, 16, 22, 28].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          width: 7,
                          height: h,
                          borderRadius: 2,
                          background: i <= volumeRank ? "#8B5A2B" : "#C0A684",
                        }}
                      />
                    ))}
                  </div>
                }
              />
            </div>

            {/* 状态徽章 */}
            {(greasy || floats) && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {greasy && (
                  <Badge label="✨ 油亮" bg="rgba(255, 220, 110, 0.6)" border="rgba(45, 27, 14, 0.3)" />
                )}
                {floats && (
                  <Badge label="💧 漂浮" bg="rgba(91, 176, 224, 0.4)" border="rgba(91, 176, 224, 0.5)" />
                )}
              </div>
            )}

            {/* AI 吐槽 */}
            {roast && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 16px",
                  background: "rgba(255, 255, 255, 0.85)",
                  borderRadius: 12,
                  borderLeft: "4px solid #E76F51",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 3,
                    color: "#E76F51",
                    textTransform: "uppercase",
                  }}
                >
                  AI 吐 槽
                </span>
                <span style={{ fontSize: 22, lineHeight: 1.5, marginTop: 4, fontWeight: 500 }}>
                  {roast}
                </span>
              </div>
            )}
          </div>

          {/* 拍立得底部水印 */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <span
              style={{
                fontSize: 13,
                color: "#9A7C5C",
                letterSpacing: 6,
                fontFamily: "monospace",
              }}
            >
              — LASA · 拉啥 —
            </span>
          </div>
        </div>

        {/* 底部网址 + disclaimer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "#9A7C5C", letterSpacing: 2 }}>
            lasa-gilt.vercel.app · 仅供娱乐 · 不构成医学建议
          </span>
        </div>
      </div>
    ),
    {
      width: 720,
      height: 1280,
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
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function Cell({
  label,
  value,
  content,
}: {
  label: string;
  value: string;
  content: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "10px 8px 12px",
        background: "rgba(255, 255, 255, 0.85)",
        borderRadius: 10,
        border: "1px solid rgba(45, 27, 14, 0.1)",
        flex: 1,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: "#5C3A1D" }}>
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 34,
        }}
      >
        {content}
      </div>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function Badge({
  label,
  bg,
  border,
}: {
  label: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        padding: "5px 14px",
        borderRadius: 999,
        background: bg,
        border: `1px dashed ${border}`,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}
