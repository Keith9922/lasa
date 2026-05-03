/**
 * 模型调用封装（OpenAI 兼容接口，server-side only）
 * 对外 UI 文案不暴露服务商名 — 见 CLAUDE.md
 */

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1";
const MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-Text-01";

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

/** AI 响应有时会包一层 ```json 代码块；这里同时处理裸 JSON 和被包裹的情况。 */
export function extractJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function chat({
  messages,
  temperature = 0.3,
  maxTokens = 800,
  responseJson = false,
}: ChatOptions): Promise<string> {
  if (!API_KEY) {
    throw new AIError("AI 未配置（缺少 API key）", 500);
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseJson) body.response_format = { type: "json_object" };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    // 12s 上限：超时就走兜底，避免移动端用户干等
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AIError(`AI 上游错误: ${res.status} ${text.slice(0, 200)}`, res.status);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIError("AI 响应无内容", 500);
  return content;
}
