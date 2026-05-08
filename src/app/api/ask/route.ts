/**
 * POST /api/ask
 *
 * 「问问肠子」AI 答疑：基于用户本地的 history 摘要，回答"为什么这周便秘"、
 * "我该多吃啥"等具体问题。流式 SSE 回纯文本（不包 JSON）。
 *
 * 隐私：context 由前端打包发送（来自 localStorage），服务端不持久化。
 * 失败时和 generate-roast 一样有兜底（回一句模板提醒）；strict=1 不兜底。
 */

import { z } from "zod";
import { chatStream, AIError } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  question: z.string().min(2).max(500),
  /** 用户本地历史摘要 —— stats.computeStats() 输出 + 最近几餐 */
  context: z.object({
    total: z.number().int(),
    last7Days: z.number().int(),
    streak: z.number().int(),
    accuracy: z.number().nullable(),
    bristol: z.record(z.string(), z.number()),
    topColors: z.array(z.object({ color: z.string(), count: z.number() })),
    avgKcalPerDay: z.number().nullable(),
    observations: z.array(z.string()),
    recentMeals: z
      .array(
        z.object({
          date: z.string(),
          bristol: z.number(),
          color: z.string(),
          intake: z.array(z.string()),
          totalKcal: z.number(),
          verdict: z.string().optional(),
        }),
      )
      .max(7),
  }),
  /** savage / gentle，跟着用户的全局调性走 */
  tone: z.enum(["savage", "gentle"]).optional().default("gentle"),
});

const SYSTEM_PROMPT = (tone: "savage" | "gentle") => `你是一位「肠道顾问」，根据用户的便便+饮食历史摘要，针对其问题给出**具体、可执行**的建议。

# 硬性规则

- **不要诊断疾病、不要开药、不要替代医生**。如有红色警告（持续灰白便、黑便、便血等）必须建议就医。
- 必须**结合提供的 context 数据**回答（引用 1-2 个具体数字 / 趋势），不要泛泛而谈。
- 给 1-2 个**具体可执行**的建议（"多喝 500ml 水"、"早餐加一份燕麦"），不要"注意饮食"这种空话。
- **字数 ≤ 150 字**，一段话写完，不分多段、不列 markdown。
- 不要寒暄、不要问候、不要"很高兴帮你"，直接开始。

# 风格

${tone === "gentle" ? "像朋友/温柔营养师轻声提醒，不批评不说教。" : "嘴贱但善意，沙雕兼有道理，可以适度网梗但不下三路。"}

# 反面例子（不要这样）

- "建议保持均衡饮食。"（空话）
- "你最近便秘了，要多喝水。"（没用 context 数据）
- "我建议你去看医生。"（除非真的红色警告）

# 正确范式

参考：「你近 7 天里 5 天 Type 1-2，纤维平均才 8g/天，**不到推荐量一半**。明天先在午餐加一份杂菜（30g 纤维），再补 800ml 温水，应该就能松动了。」`;

const FALLBACK_GENTLE = "你的肠道现在的样本还不够多，再记几天我就能给具体建议啦。期间可以保持充足饮水和蔬菜摄入。";
const FALLBACK_SAVAGE = "样本太少，肠子说她还没看明白你呢。再吃几天我们再聊。";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "输入格式不对" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { question, context, tone } = parsed.data;
  const fallback = tone === "gentle" ? FALLBACK_GENTLE : FALLBACK_SAVAGE;

  const url = new URL(req.url);
  const strict = url.searchParams.get("strict") === "1";
  const t0 = Date.now();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT(tone) },
    {
      role: "user" as const,
      content: `# 我的肠道历史摘要\n${JSON.stringify(context, null, 2)}\n\n# 我的问题\n${question}`,
    },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: object) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        let acc = "";
        for await (const delta of chatStream({
          messages,
          temperature: tone === "gentle" ? 0.5 : 0.85,
          maxTokens: 1500,
          responseJson: false, // 自由文本回复，不包 JSON
          signal: req.signal,
        })) {
          acc += delta;
          send({ type: "delta", text: acc });
        }
        const latencyMs = Date.now() - t0;
        if (acc.trim().length === 0) {
          if (strict) {
            send({ type: "done", text: "", source: "error", error: "AI 没说话", latencyMs });
          } else {
            send({ type: "done", text: fallback, source: "template", latencyMs });
          }
        } else {
          send({ type: "done", text: acc, source: "ai", latencyMs });
        }
      } catch (err) {
        const latencyMs = Date.now() - t0;
        const code = err instanceof AIError ? err.status ?? 500 : 500;
        send({ type: "error", message: String(err), code });
        if (strict) {
          send({ type: "done", text: "", source: "error", error: String(err), latencyMs });
        } else {
          send({ type: "done", text: fallback, source: "template", latencyMs });
        }
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
      "X-Accel-Buffering": "no",
    },
  });
}
