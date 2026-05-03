/**
 * POST /api/generate-roast
 *
 * 接收预测结果 + 摄入摘要，让模型生成一句沙雕吐槽。
 * AI 失败时回退到本地模板池（保证产品可用）。
 */

import { NextResponse } from "next/server";
import { chat, extractJson } from "@/lib/ai";
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
  const fallback = pickRoast(prediction);

  const userPayload = JSON.stringify({
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
  });

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

    const validated = GenerateRoastResponseSchema.safeParse(extractJson(raw));
    if (validated.success) {
      return NextResponse.json({ roast: validated.data.roast, source: "ai" });
    }
  } catch {
    // fall through to fallback
  }
  return NextResponse.json({ roast: fallback, source: "template" });
}
