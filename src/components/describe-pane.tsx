"use client";

import { useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import type { ParsedFood } from "@/lib/schemas";

type Props = {
  onAddParsed: (foods: ParsedFood[]) => void;
};

type ParseState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; items: ParsedFood[]; notes?: string }
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
        signal: AbortSignal.timeout(15_000),
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
      setState({ kind: "success", items, notes: data.notes });
    } catch {
      setState({ kind: "error", message: "网络断了，待会儿再试。" });
    }
  };

  const handleAccept = () => {
    if (state.kind !== "success") return;
    onAddParsed(state.items);
    setText("");
    setState({ kind: "idle" });
  };

  const handleAppend = () => {
    // 保留 text，关闭解析卡，让用户在原文上追加描述再次解析
    setState({ kind: "idle" });
  };

  return (
    <section className="pane describe" aria-label="自然语言描述">
      <p className="pane-hint">越详细越准。可以写菜名、份量、做法。</p>
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
              <span>AI 解析中…</span>
            </>
          ) : (
            <>
              <Sparkles size={14} aria-hidden />
              <span>AI 解析</span>
            </>
          )}
        </button>
      </div>

      {state.kind === "error" && (
        <p className="parse-error" role="alert">{state.message}</p>
      )}

      {state.kind === "success" && (
        <div className="parse-result">
          <div className="parse-result-head">
            <span className="parse-result-head-title">解析结果</span>
            <span className="ai-badge">AI 估算</span>
          </div>
          <ul className="parse-list">
            {state.items.map((it, i) => (
              <li key={`${it.name}-${i}`}>
                <span className="parse-list-name">
                  <span aria-hidden>{it.emoji}</span>
                  <span>{it.name}</span>
                </span>
                <span className="parse-list-grams tabular">{it.grams}g</span>
              </li>
            ))}
          </ul>
          {state.notes && (
            <p className="pane-hint" style={{ marginBottom: 12 }}>{state.notes}</p>
          )}
          <div className="parse-actions">
            <button className="btn-ghost" type="button" onClick={handleAppend}>
              <Plus size={13} aria-hidden /> 还吃了别的
            </button>
            <button className="btn-accent" type="button" onClick={handleAccept}>
              全部加入
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function friendlyError(raw: string): string {
  // 不暴露服务商名 & 内部错误细节
  if (/AI 未配置/.test(raw)) return "AI 当前未配置，先用快捷选择吧。";
  if (/timeout|abort/i.test(raw)) return "AI 想得太久了，再试一次？";
  if (/JSON|结构/.test(raw)) return "AI 抽风了，换个说法再来一次。";
  return "AI 暂时不在状态，先用快捷选择吧。";
}
