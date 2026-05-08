"use client";

/**
 * 「问问肠子」Modal —— 基于本地 history 让 AI 回答健康问题
 *
 *  - 单轮问答：用户问一句、AI 流式答一句，再问就清空重来
 *  - context 在前端组装好（stats + 最近 5 张卡），随请求体送给 server
 *  - 流式消费 SSE，逐 chunk 累积进 answer state，呈现打字机效果
 *  - 几个常见问题做成快捷气泡，零打字直接点
 */

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Send, RotateCcw } from "lucide-react";
import { Modal } from "./modal";
import { getHistory, getSettings, logAICall } from "@/lib/storage";
import { computeStats, COLOR_LABELS } from "@/lib/stats";

type Props = {
  open: boolean;
  onClose: () => void;
};

const QUICK_QUESTIONS = [
  "我最近这几张卡怎么样？",
  "我应该多吃点什么改善便便？",
  "我蛋白和纤维够吗？",
  "我的肠道状态在变好还是变差？",
];

type Phase =
  | { kind: "idle" }
  | { kind: "asking"; question: string }
  | {
      kind: "answered";
      question: string;
      answer: string;
      source: "ai" | "template" | "error";
      latencyMs: number;
      error?: string;
    };

export function AskGutModal({ open, onClose }: Props) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [contextSummary, setContextSummary] = useState<string>("");

  /** 每次打开时重读 history（关闭后再开能拿到最新数据） */
  useEffect(() => {
    if (!open) return;
    const list = getHistory();
    if (list.length === 0) {
      setContextSummary("");
      return;
    }
    const stats = computeStats(list);
    const top = Object.entries(stats.bristol)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])[0];
    setContextSummary(
      `${stats.total} 张卡 · 近 7 天 ${stats.last7Days} 张${
        top ? ` · 最常 Type ${top[0]}（${top[1]} 次）` : ""
      }${stats.streak > 0 ? ` · 连续 ${stats.streak} 天` : ""}`,
    );
  }, [open]);

  /** 把"问"这件事抽出来 —— quick question 和手动提交都走这里 */
  const ask = async (question: string) => {
    const list = getHistory();
    if (list.length === 0) {
      setPhase({
        kind: "answered",
        question,
        answer: "你还没记过任何一张卡，肠子还没看到你呢。先回首页开几张卡，再来问。",
        source: "template",
        latencyMs: 0,
      });
      return;
    }
    const stats = computeStats(list);
    const settings = getSettings();
    const context = {
      total: stats.total,
      last7Days: stats.last7Days,
      streak: stats.streak,
      accuracy: stats.accuracy,
      bristol: stats.bristol as Record<string, number>,
      topColors: stats.topColors.map((c) => ({ color: COLOR_LABELS[c.color], count: c.count })),
      avgKcalPerDay: stats.avgKcalPerDay,
      observations: stats.observations,
      recentMeals: list.slice(0, 5).map((e) => ({
        date: e.date,
        bristol: e.bristol,
        color: COLOR_LABELS[e.color],
        intake: e.intake.slice(0, 6).map((i) => `${i.name}${i.grams}g`),
        totalKcal: e.totalKcal,
        verdict: e.verdict,
      })),
    };

    setPhase({ kind: "asking", question });
    const t0 = performance.now();
    const url = `/api/ask${settings.preferRealAi ? "?strict=1" : ""}`;
    let answer = "";
    let source: "ai" | "template" | "error" = "ai";
    let errorMsg: string | undefined;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, tone: settings.tone }),
        signal: AbortSignal.timeout(65_000),
      });
      if (!res.ok || !res.body) {
        const status = res.status;
        setPhase({
          kind: "answered",
          question,
          answer: "",
          source: "error",
          latencyMs: Math.round(performance.now() - t0),
          error: `HTTP ${status}`,
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const obj = JSON.parse(payload) as
              | { type: "delta"; text: string }
              | {
                  type: "done";
                  text: string;
                  source: "ai" | "template" | "error";
                  latencyMs?: number;
                  error?: string;
                }
              | { type: "error"; message: string; code: number };
            if (obj.type === "delta") {
              answer = obj.text;
              setPhase({ kind: "asking", question });
              // 流式过程中实时更新 answer：复用 phase=answered 的 UI，但保持 question
              setPhase((prev) =>
                prev.kind === "asking" || prev.kind === "answered"
                  ? { kind: "answered", question, answer, source: "ai", latencyMs: 0 }
                  : prev,
              );
            } else if (obj.type === "done") {
              answer = obj.text;
              source = obj.source;
              errorMsg = obj.error;
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      source = "error";
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const latencyMs = Math.round(performance.now() - t0);
    setPhase({ kind: "answered", question, answer, source, latencyMs, error: errorMsg });
    try {
      logAICall({
        endpoint: "generate-roast", // ask 路由复用 generate-roast 类别
        source,
        latencyMs,
        at: Date.now(),
        errorMsg,
      });
    } catch { /* swallow */ }
  };

  const handleSubmit = () => {
    const q = input.trim();
    if (q.length < 2) return;
    void ask(q);
  };

  const handleReset = () => {
    setInput("");
    setPhase({ kind: "idle" });
  };

  const showQuickQuestions = useMemo(
    () => phase.kind === "idle" && contextSummary !== "",
    [phase.kind, contextSummary],
  );

  return (
    <Modal open={open} onClose={onClose} title="问问肠子" emoji="💬" subtitle={contextSummary || undefined}>
      {phase.kind !== "idle" && (
        <div className="ask-gut-thread">
          <div className="ask-gut-q">
            <span className="ask-gut-q-eyebrow">你问的</span>
            <p>{phase.question}</p>
          </div>
          <div className="ask-gut-a" data-source={phase.kind === "answered" ? phase.source : "loading"}>
            <span className="ask-gut-a-eyebrow">
              <Sparkles size={11} aria-hidden /> 肠子说
            </span>
            <p>
              {phase.kind === "asking" || (phase.kind === "answered" && !phase.answer && !phase.error) ? (
                <span className="ask-gut-typing">
                  正在想…
                  <span className="ask-gut-dots" aria-hidden>…</span>
                </span>
              ) : phase.kind === "answered" ? (
                phase.answer || phase.error || "（空回复）"
              ) : null}
            </p>
            {phase.kind === "answered" && phase.source === "error" && phase.error && (
              <p className="ask-gut-err">{phase.error}</p>
            )}
          </div>
        </div>
      )}

      {showQuickQuestions && (
        <div className="ask-gut-quick">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} type="button" className="ask-gut-quick-pill" onClick={() => void ask(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {phase.kind === "answered" && (
        <button type="button" className="btn-ghost ask-gut-reset" onClick={handleReset}>
          <RotateCcw size={13} aria-hidden /> 再问一题
        </button>
      )}

      {(phase.kind === "idle" || phase.kind === "answered") && (
        <form
          className="ask-gut-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            className="ask-gut-input"
            placeholder={
              contextSummary
                ? "或者自己问一句，比如：我最近便秘吗？"
                : "（先去首页开几张卡，肠子才有数据可看）"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={!contextSummary}
            rows={2}
            maxLength={500}
            aria-label="问问肠子"
          />
          <button
            type="submit"
            className="ask-gut-send"
            disabled={input.trim().length < 2 || !contextSummary}
            aria-label="发送"
          >
            <Send size={14} aria-hidden />
          </button>
        </form>
      )}
    </Modal>
  );
}
