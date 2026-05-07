/**
 * POST /api/generate-roast
 *
 * 接收预测结果 + 摄入摘要，让模型生成一句沙雕吐槽。
 * AI 失败时回退到本地模板池（保证产品可用）。
 */

import { NextResponse } from "next/server";
import { chat, chatStream, extractJson, extractPartialString, AIError } from "@/lib/ai";
import { pickRoast } from "@/lib/roasts";
import { z } from "zod";
import {
  GenerateRoastRequestSchema,
  GenerateRoastResponseSchema,
} from "@/lib/schemas";

const RequestWithToneSchema = GenerateRoastRequestSchema.extend({
  tone: z.enum(["savage", "gentle"]).optional().default("savage"),
});

export const runtime = "nodejs";
// Vercel 函数超时上限：Hobby 10s 不够 reasoning 模型，给 60s 安全垫
export const maxDuration = 60;

const SYSTEM_PROMPT_SAVAGE = `你是一个网感十足、嘴贱但善意的"💩预言家"。根据用户今天的食物和预测的便便属性，生成一句吐槽。

# 输出契约

只输出一个 JSON 对象：
{
  "roast": "20-32 字一句话吐槽（中文，**严格不超过 32 字**，不换行）"
}

# 风格要求

- 短促有力、一句梗，不啰嗦
- 网络梗、口语化、有节奏
- 沙雕但不下三路、不粗俗
- **必须紧扣本次输入**：1 个食物关键词 + 1 个预测属性即可（如"火锅+油亮"）
- 不要套用千篇一律的模板句式
- 字数超 32 必须重写到 32 内

# 性能要求

- 思考过程 ≤30 字。不要长篇分析。
- 读完输入立刻产出 JSON。
- 不要解释、不要换行、不要 markdown 代码块。`;

const SYSTEM_PROMPT_GENTLE = `你是一位贴心的营养师，根据用户今天的食物和预测的便便属性，给出一句温暖的健康提醒 + 微小幽默。

# 输出契约

只输出一个 JSON 对象：
{
  "roast": "20-32 字一句温暖建议（中文，**严格不超过 32 字**，不换行）"
}

# 风格要求

- 像朋友轻声提醒，不说教、不批评
- 一个营养反馈 + 一个具体小建议
- 可以分享给爸妈/同事看不尴尬
- 紧扣输入：1 个食物 + 1 个预测属性
- **不要使用粗俗、贬损、网梗词**

# 性能要求

- 思考过程 ≤30 字。
- 不要解释、不要换行、不要 markdown。`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = RequestWithToneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入格式不对" }, { status: 400 });
  }

  const { prediction, intakeSummary, tone } = parsed.data;
  const fallback = pickRoast(prediction);
  const systemPrompt = tone === "gentle" ? SYSTEM_PROMPT_GENTLE : SYSTEM_PROMPT_SAVAGE;

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

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPayload },
  ];
  const temperature = tone === "gentle" ? 0.6 : 1.0;
  // M2.7 是 reasoning 模型：<think> 块占 ~2-2.5k token，
  // 200 太小被 finish_reason=length 截断，3000 够思考完 + 输出 30-50 字 JSON。
  const maxTokens = 3000;

  // 是否走流式：默认走（性能体感好），可通过 ?stream=0 关闭（兜底用）。
  const wantStream = new URL(req.url).searchParams.get("stream") !== "0";

  if (!wantStream) {
    try {
      const raw = await chat({ messages, temperature, maxTokens, responseJson: true });
      const validated = GenerateRoastResponseSchema.safeParse(extractJson(raw));
      if (validated.success) {
        return NextResponse.json({ roast: validated.data.roast, source: "ai" });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json({ roast: fallback, source: "template" });
  }

  // ===== 流式分支 =====
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: object) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      let buf = "";
      let lastEmitted = "";
      try {
        for await (const delta of chatStream({
          messages,
          temperature,
          maxTokens,
          responseJson: true,
          signal: req.signal,
        })) {
          buf += delta;
          const partial = extractPartialString(buf, "roast");
          if (partial && partial !== lastEmitted) {
            lastEmitted = partial;
            send({ type: "delta", text: partial });
          }
        }
        // 流结束：用最终 buf 校验，校验失败则吐 fallback
        const validated = GenerateRoastResponseSchema.safeParse(extractJson(buf));
        if (validated.success) {
          send({ type: "done", text: validated.data.roast, source: "ai" });
        } else {
          send({ type: "done", text: fallback, source: "template" });
        }
      } catch (err) {
        const code = err instanceof AIError ? (err.status ?? 500) : 500;
        send({ type: "error", message: String(err), code });
        send({ type: "done", text: fallback, source: "template" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // 防止反代缓冲（Nginx / Vercel Edge）
      "X-Accel-Buffering": "no",
    },
  });
}
