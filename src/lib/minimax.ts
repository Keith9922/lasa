import type { CoachRequest, CoachResponse } from "@/lib/types";

type MiniMaxMessage = { role: "system" | "user" | "assistant"; content: string };
type MiniMaxResponse = { choices?: { message?: { content?: string } }[] };

export function hasMiniMaxConfig(): boolean {
  return Boolean(process.env.MINIMAX_API_KEY?.trim());
}

function getConfig() {
  return {
    apiKey: process.env.MINIMAX_API_KEY?.trim() ?? "",
    baseUrl: (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, ""),
    model: process.env.MINIMAX_MODEL?.trim() || "MiniMax-M1",
  };
}

// ── Chat completions ──────────────────────────────────────────────────────

export async function runMiniMaxCoach(request: CoachRequest, fallback: CoachResponse): Promise<CoachResponse> {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) return fallback;

  const messages = buildMessages(request, fallback);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 2048 }),
    });
  } catch (err) {
    console.error("MiniMax network error:", err);
    return fallback;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("MiniMax request failed:", response.status, redactSecrets(detail));
    return fallback;
  }

  const payload = (await response.json()) as MiniMaxResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return fallback;

  try {
    const parsed = parseJsonObject(content) as CoachResponse;
    return { ...parsed, usedAI: true } as CoachResponse;
  } catch (error) {
    console.error("MiniMax JSON parse failed:", error);
    return fallback;
  }
}

// ── Speech to text ────────────────────────────────────────────────────────

/**
 * Transcribe an audio blob using MiniMax's speech-to-text API.
 * Falls back gracefully if not configured or the API is unavailable.
 */
export async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string | null> {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) return null;

  // Determine file extension from mime type
  const ext = mimeType.includes("webm") ? "webm"
    : mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("wav") ? "wav"
    : "webm";

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, `recording.${ext}`);
  formData.append("model", "speech-01");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
  } catch (err) {
    console.error("MiniMax ASR network error:", err);
    return null;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("MiniMax ASR failed:", response.status, redactSecrets(detail));
    return null;
  }

  try {
    const result = (await response.json()) as { text?: string };
    return result.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是 Stori 的 AI 简历教练，专注于帮助中国求职者把真实经历变成出色简历。

## 核心原则
- 只输出纯 JSON，不输出 Markdown、代码块标记（如 \`\`\`json）或任何解释文字
- 绝对不编造经历、数字、公司名、学历、奖项——用户没说过的一律追问或标为"待补充"
- 追问要具体：追问背景是什么、你负责什么（不是"参与"）、做了哪几个具体动作、结果是什么、有没有数字证明
- 拒绝"负责过""参与过""协助过"这类模糊表达，追问到具体行动和结果
- 输出 JSON 结构必须与参考 JSON 完全同形，只替换内容，不增删字段

## 对于不同任务的要求

**analyze-jd（分析 JD）**
- 从 JD 中识别硬技能、软技能、领域经验、职责描述
- 将隐含要求也提取出来（比如"推动落地"暗示跨团队协作能力）
- message 要具体说识别了哪些关键能力，哪些可能是高优先项

**extract-story（提取故事卡）**
- 从用户描述中提取 STAR 结构：背景(Situation)、角色(Task)、行动(Action)、结果(Result)
- 证据要找数字、用户反馈、上线结果、排名、对比数据
- followUps 要针对性追问最缺失的信息，优先追问结果和数字
- nextQuestion 要让用户感觉被真正倾听，不是机械问卷

**generate-resume（生成简历）**
- summary 要面向目标岗位，突出与 JD 最匹配的 2-3 个核心能力
- bullets 每条要有"动作+结果"结构，能量化的必须量化
- 没有足够确认素材的字段用"待补充"或省略，绝不凭空生成`;

function buildMessages(request: CoachRequest, fallback: CoachResponse): MiniMaxMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({ task: request.action, input: request, referenceOutputShape: fallback }, null, 2),
    },
  ];
}

function parseJsonObject(value: string): unknown {
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) throw new Error("No JSON object found");
  return JSON.parse(value.slice(first, last + 1));
}

function redactSecrets(value: string): string {
  return value.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***").replace(/sk-[A-Za-z0-9._-]+/g, "sk-***");
}
