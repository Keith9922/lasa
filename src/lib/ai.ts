/**
 * 模型调用封装（OpenAI 兼容接口，server-side only）
 * 对外 UI 文案不暴露服务商名 — 见 CLAUDE.md
 */

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1";
const MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M2.7";

export class AIError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AIError";
  }
}

type Message = { role: "system" | "user"; content: string };

type ChatOptions = {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  responseJson?: boolean;
};

/**
 * 从 reasoning 模型响应里剥离 `<think>...</think>` 推理块。
 *
 * 流式中段策略：
 *  - 还没看到 `</think>` 但开头是 `<think>` → 返回空串，调用方应当判 null
 *  - 看到 `</think>` → 返回最后一个 `</think>` 之后的内容（保险起见取 lastIndexOf，应对极端嵌套）
 *  - 没有 think 标签 → 原样返回
 */
function stripThink(raw: string): string {
  const closeIdx = raw.lastIndexOf("</think>");
  if (closeIdx !== -1) {
    return raw.slice(closeIdx + "</think>".length);
  }
  if (/^\s*<think>/.test(raw)) return "";
  return raw;
}

/**
 * AI 响应可能：
 *  - 裸 JSON
 *  - 用 ```json ... ``` 代码块包起来
 *  - 前面带 `<think>...</think>` 推理块（M2 这种 reasoning 模型）
 *
 * 统一策略：先剥 think 块，再 greedy 抓 `{...}` 大括号。
 */
export function extractJson(raw: string): unknown {
  const body = stripThink(raw);
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    const match = body.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function callUpstream(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  if (!API_KEY) throw new AIError("AI 未配置（缺少 API key）", 500);
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AIError(`AI 上游错误: ${res.status} ${text.slice(0, 200)}`, res.status);
  }
  return res;
}

export async function chat({
  messages,
  temperature = 0.3,
  maxTokens = 800,
  responseJson = false,
}: ChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseJson) body.response_format = { type: "json_object" };
  // 35s 上限：M2.7 是 reasoning 模型，思考一段后再输出，常见 10-20s
  const res = await callUpstream(body, AbortSignal.timeout(35_000));
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIError("AI 响应无内容", 500);
  return content;
}

/**
 * 流式版：在 reasoning 模型思考完毕后开始 token 级 yield。
 *
 * - 用 SSE（`data: {...}\n\n`），与 OpenAI 兼容接口一致
 * - 每个 chunk 是 `choices[0].delta.content`；`[DONE]` 终止
 * - 调用方通常只需要 `for await (const t of chatStream(...))` 拿增量
 *
 * timeout 默认 60s；调用方可传 AbortSignal 提前中断（用户离开页面）。
 */
export async function* chatStream({
  messages,
  temperature = 0.3,
  maxTokens = 800,
  responseJson = false,
  signal,
}: ChatOptions & { signal?: AbortSignal }): AsyncGenerator<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };
  if (responseJson) body.response_format = { type: "json_object" };
  // 60s 流式上限：reasoning 模型 + token 节流，给宽点
  const composite = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
    : AbortSignal.timeout(60_000);
  const res = await callUpstream(body, composite);
  if (!res.body) throw new AIError("AI 流式响应没有 body", 500);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          if (payload === "[DONE]") return;
          continue;
        }
        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // 上游偶尔吐心跳/keepalive 行，忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 在累加的原始字符串里抠出 `"roast": "..."` 的值，
 * 哪怕字符串还没闭合（即流式中段）。
 *
 * 关键：reasoning 模型先吐 `<think>` 推理段，再吐答案。
 * 推理段里可能字面出现 `"roast"`，会污染 regex。所以先剥 think 再 match。
 *
 * 用于在 generate-roast 流式吐 JSON 时，逐 token 给前端推进度。
 */
export function extractPartialString(buf: string, key: string): string | null {
  const body = stripThink(buf);
  if (!body) return null;
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`);
  const m = body.match(re);
  if (!m) return null;
  let s = m[1];
  // 把可能截断的尾部 `\` 抹掉，避免把单独的反斜杠当成 escape 头
  if (s.endsWith("\\")) s = s.slice(0, -1);
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
