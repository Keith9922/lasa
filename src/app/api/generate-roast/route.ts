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

# 输出契约

只输出一个 JSON 对象：
{
  "roast": "30-50 字的吐槽（中文，一句话，不换行）"
}

# 风格要求

- 网络梗、口语化、有节奏
- 沙雕但不下三路、不粗俗
- 适度自嘲调侃，可以来个小建议或调侃式安慰
- **必须紧扣本次输入**：引用具体食物（如"披萨炸鸡"）+ 具体预测属性（如"油亮"、"糊状"、"暴食"）
- 不要套用千篇一律的模板句式

# 性能要求

- 思考过程 ≤30 字。不要长篇分析。
- 读完输入立刻产出 JSON。
- 不要解释、不要换行、不要 markdown 代码块。`;

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
      // M2.7 是 reasoning 模型：<think> 块占 ~2-2.5k token，
      // 200 太小被 finish_reason=length 截断，所以之前 100% 走模板。
      // 实测 3000 够 M2.7 思考完 + 输出 30-50 字 JSON
      maxTokens: 3000,
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
