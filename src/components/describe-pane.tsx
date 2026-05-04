"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { ParsedFood } from "@/lib/schemas";

type Props = {
  /** AI 解析成功后立即把识别结果加入摄入。父组件负责弹 toast 提示数量。 */
  onAddParsed: (foods: ParsedFood[]) => void;
};

type ParseState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function DescribePane({ onAddParsed }: Props) {
  const [text, setText] = useState("");
  const [state, setState] = useState<ParseState>({ kind: "idle" });

  const handleParse = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: AbortSignal.timeout(40_000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
        setState({ kind: "error", message: friendlyError(msg) });
        return;
      }
      const data = await res.json();
      const items: ParsedFood[] = data.items ?? [];
      if (items.length === 0) {
        setState({ kind: "error", message: "AI 没识别出食物，换个写法再试？" });
        return;
      }
      onAddParsed(items);
      setText("");
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error", message: "网络断了，待会儿再试。" });
    }
  };

  return (
    <section className="pane describe" aria-label="自然语言描述">
      <p className="pane-hint">越详细越准。识别完成会自动加入摄入清单。</p>
      <textarea
        className="describe-textarea"
        placeholder="例如：中午火锅吃了两盘肥牛、一盘青菜、清汤锅，喝了一瓶啤酒，最后一份红糖糍粑。"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={800}
        disabled={state.kind === "loading"}
      />
      <div className="describe-actions">
        <button
          className="btn-accent"
          type="button"
          onClick={handleParse}
          disabled={state.kind === "loading" || text.trim().length < 2}
          aria-busy={state.kind === "loading"}
        >
          {state.kind === "loading" ? (
            <>
              <span className="parsing-spinner" aria-hidden />
              <span>AI 解析中（约 15 秒）</span>
            </>
          ) : (
            <>
              <Sparkles size={14} aria-hidden />
              <span>AI 解析并加入</span>
            </>
          )}
        </button>
      </div>

      {state.kind === "error" && (
        <p className="parse-error" role="alert">{state.message}</p>
      )}
    </section>
  );
}

function friendlyError(raw: string): string {
  if (/AI 未配置/.test(raw)) return "AI 当前未配置，先用快捷选择吧。";
  if (/timeout|abort/i.test(raw)) return "AI 想得太久了，再试一次？";
  if (/JSON|结构/.test(raw)) return "AI 抽风了，换个说法再来一次。";
  return "AI 暂时不在状态，先用快捷选择吧。";
}
