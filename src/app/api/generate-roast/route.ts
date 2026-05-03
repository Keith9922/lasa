/**
 * POST /api/generate-roast
 *
 * 接收预测结果 + 摄入摘要，让模型生成一句沙雕吐槽。
 * AI 失败时回退到本地模板池（保证产品可用）。
 */

import { NextResponse } from "next/server";
import { chat, AIError } from "@/lib/ai";
import { pickRoast } from "@/lib/roasts";
import {
  GenerateRoastRequestSchema,
  GenerateRoastResponseSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个网感十足、嘴贱但善意的"💩预言家"。根据用户今天的食物和预测的便便属性，生成一句吐槽。

输出 JSON：
{
  "roast": "30-60 字的吐槽（中文，一句话）"
}

风格：
- 网络梗、口语化、有节奏
- 沙雕但不下三路、不粗俗
- 适度自嘲调侃，可以来个小建议或调侃式安慰
- 末尾不要解释、不要换行、不要 markdown

只输出 JSON 对象，不要任何额外文字。`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = GenerateRoastRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入格式不对" }, { status: 400 });
  }

  const { prediction, intakeSummary } = parsed.data;

  // 兜底文案先准备好（AI 失败也能返回有效响应）
  const fallback = pickRoast({
    bristol: prediction.bristol as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    bristolLabel: prediction.bristolLabel,
    color: prediction.color as never, // schemas 已 validate
    colorLabel: prediction.colorLabel,
    greasy: prediction.greasy,
    floats: prediction.floats,
    smell: prediction.smell as 1 | 2 | 3 | 4 | 5,
    volume: prediction.volume as never,
    volumeLabel: prediction.volumeLabel,
    macroRatio: prediction.macroRatio,
    totalMacros: prediction.totalMacros,
    warnings: [],
    reasons: prediction.reasons,
  });

  const userPayload = JSON.stringify(
    {
      eaten: intakeSummary,
      bristol: `${prediction.bristol} (${prediction.bristolLabel})`,
      color: prediction.colorLabel,
      greasy: prediction.greasy,
      floats: prediction.floats,
      smell: `${prediction.smell}/5`,
      volume: prediction.volumeLabel,
      kcal: Math.round(prediction.totalMacros.kcal),
      ratio: prediction.macroRatio,
      key_reasons: prediction.reasons,
    },
    null,
    2,
  );

  try {
    const raw = await chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload },
      ],
      temperature: 1.0,
      maxTokens: 200,
      responseJson: true,
    });

    const obj = safeJsonParse(raw);
    const validated = obj ? GenerateRoastResponseSchema.safeParse(obj) : null;
    if (!validated || !validated.success) {
      return NextResponse.json({ roast: fallback, source: "template" });
    }
    return NextResponse.json({ roast: validated.data.roast, source: "ai" });
  } catch (err) {
    // AI 错就走兜底，不影响产品
    if (err instanceof AIError) {
      return NextResponse.json({ roast: fallback, source: "template" });
    }
    return NextResponse.json({ roast: fallback, source: "template" });
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    const match = s.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
