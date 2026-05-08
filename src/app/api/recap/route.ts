/**
 * POST /api/recap
 *
 * 「肠道月报」：基于本月（默认）/ 指定时间段的 history 摘要，
 * AI 写一段 ≤200 字的肠道叙事，亮点 + 槽点 + 一个建议。
 *
 * 流式 SSE 输出纯文本（不包 JSON）；和 /api/ask 一样可以 ?strict=1。
 */

import { z } from "zod";
import { chatStream, AIError } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  /** 时间段标签，比如 "2026-05" */
  period: z.string().min(4).max(20),
  context: z.object({
    total: z.number().int(),
    days: z.number().int(),
    bristol: z.record(z.string(), z.number()),
    topColors: z.array(z.object({ color: z.string(), count: z.number() })),
    avgKcalPerDay: z.number().nullable(),
    accuracy: z.number().nullable(),
    streak: z.number().int(),
    observations: z.array(z.string()),
    /** 本月最常吃的食物 Top 5 */
    topFoods: z.array(z.object({ name: z.string(), count: z.number() })),
    /** 本月触发的成就 id 列表 */
    achievements: z.array(z.string()),
  }),
  tone: z.enum(["savage", "gentle"]).optional().default("gentle"),
});

const SYSTEM_PROMPT = (tone: "savage" | "gentle") => `你是「肠道剧本作家」，根据用户某个月的肠道+饮食数据，写一篇短小精悍的"本月剧本"。

# 硬性规则

- **180-220 字**之间，一段写完，不分段不列点。
- 必须**引用 2-3 个具体数字**（Type X 出现 N 次、命中率 X%、近 7 天 / 共 N 天等）。
- 给一个"下月小目标"作为收尾（一句话即可）。
- 拒绝建议就医。如有红色警告（持续灰白便/黑便等）只能说"留意一下身体信号"。
- 不要寒暄、不要"很高兴帮你"，直接开始叙事。

# 风格

${tone === "gentle" ? "温柔关心、像营养师写报告，可以分享给爸妈看。" : "嘴贱沙雕但善意，带网感，像月度脱口秀。可适度用网梗但不下三路。"}

# 范式（仅参考结构，不要照抄字句）

「五月你一共开了 24 张卡，最常驻的是 Type 4（10 张），算是肠道演员表里的「老演员」。火锅出场 4 次都让命中率掉了一档（83%→ 67%），啤酒和你结伴 6 次贡献了大量"其他"热量。整月只有 3 天连续记录，剩下时间断片。下月小目标：连续打卡 7 天，让肠子有戏可演。」`;

const FALLBACK = "肠子说她还在思考你这个月演了什么。再等一会儿或换个时间问吧。";

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

  const { period, context, tone } = parsed.data;
  const url = new URL(req.url);
  const strict = url.searchParams.get("strict") === "1";
  const t0 = Date.now();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT(tone) },
    {
      role: "user" as const,
      content: `# 时间段\n${period}\n\n# 数据快照\n${JSON.stringify(context, null, 2)}\n\n请按上面的规则写本期剧本。`,
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
          temperature: tone === "gentle" ? 0.6 : 0.95,
          maxTokens: 2000,
          responseJson: false,
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
            send({ type: "done", text: FALLBACK, source: "template", latencyMs });
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
          send({ type: "done", text: FALLBACK, source: "template", latencyMs });
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
