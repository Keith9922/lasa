"use client";

import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Gauge,
  Layers3,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { createInitialState } from "@/lib/initial-state";
import { createId, nowIso } from "@/lib/ids";
import {
  calculateReadiness,
  createDemoState,
  getCoverageCounts,
  updateCoverage,
} from "@/lib/resume-engine";
import { clearState, loadState, saveState } from "@/lib/storage";
import type {
  AppState,
  ChatMessage,
  CoachRequest,
  CoachResponse,
  JobAnalysis,
  ResumeData,
  StoryCard,
  StoryStatus,
} from "@/lib/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type WorkspaceTab = "chat" | "stories" | "resume";

// ─────────────────────────────────────────────
// Sample data
// ─────────────────────────────────────────────

const SAMPLE_STORY =
  "我做过一个校园二手交易小程序，负责产品和增长。我们发现新用户发布商品很少，我访谈了 12 个同学，发现流程太长、分类不清。后来我把发布流程从 5 步改到 3 步，加了默认分类和价格建议。上线两周后，发布转化率从 18% 到 31%，日均商品数从 80 到 140，也协调了 2 名前端、1 名后端和 1 名设计。";

const SAMPLE_JD =
  "公司：晨河科技。岗位：产品经理实习生。职责包括用户增长、需求分析、用户访谈、数据分析、A/B 实验、跨团队推进。要求能够把模糊问题拆解成产品方案，推动设计和研发落地，并用指标评估效果。有 B2B SaaS、工具产品或校园项目经验加分。";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeMsg(content: string, role: ChatMessage["role"] = "assistant"): ChatMessage {
  return { id: createId("msg"), role, content, createdAt: nowIso() };
}

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return `请求失败：${err.message}。可以稍后重试，或继续使用本地规则引擎。`;
  return "请求失败，未知错误。可以稍后重试。";
}

// ─────────────────────────────────────────────
// Web Speech API minimal types (not in all TS lib versions)
// ─────────────────────────────────────────────

type AnySR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: AnySREvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type AnySREvent = {
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
};

// ─────────────────────────────────────────────
// Voice input hook (Web Speech API)
// ─────────────────────────────────────────────

function useVoiceInput(onText: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const recRef = useRef<AnySR | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggle = useCallback(() => {
    if (!supported) return;

    if (isRecording) {
      recRef.current?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) as new () => AnySR;
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: AnySREvent) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i])
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join("");
      if (text) onText(text);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
  }, [isRecording, onText, supported]);

  return { supported, isRecording, toggle };
}

// ─────────────────────────────────────────────
// Main workspace component
// ─────────────────────────────────────────────

export function ResumeWorkspace() {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [draft, setDraft] = useState("");
  const [jdDraft, setJdDraft] = useState(SAMPLE_JD);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const [isReady, setIsReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [jdExpanded, setJdExpanded] = useState(true);

  // Hydrate from localStorage
  useEffect(() => {
    setState(loadState());
    setIsReady(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!isReady) return;
    saveState(state);
  }, [isReady, state]);

  const coverageCounts = useMemo(
    () => getCoverageCounts(state.jobAnalysis),
    [state.jobAnalysis],
  );
  const readiness = useMemo(
    () => calculateReadiness(state.stories, state.jobAnalysis),
    [state.stories, state.jobAnalysis],
  );

  // ── state helpers ──────────────────────────────────────────

  function updateApp(updater: (prev: AppState) => AppState) {
    setState((prev) => updater(prev));
  }

  function pushMsg(role: ChatMessage["role"], content: string) {
    updateApp((s) => ({ ...s, messages: [...s.messages, makeMsg(content, role)] }));
  }

  // ── API call ───────────────────────────────────────────────

  async function callCoach(req: CoachRequest): Promise<CoachResponse> {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as CoachResponse;
  }

  // ── handlers ──────────────────────────────────────────────

  function handleAnalyzeJd() {
    const jdText = jdDraft.trim();
    if (!jdText) {
      pushMsg("assistant", "请先粘贴一段 JD。系统会拆解能力项，再按缺口追问。");
      return;
    }
    startTransition(async () => {
      try {
        const res = await callCoach({ action: "analyze-jd", jdText, stories: state.stories });
        if (res.action !== "analyze-jd") return;
        updateApp((s) => ({
          ...s,
          jobAnalysis: updateCoverage(res.analysis, s.stories),
          messages: [...s.messages, makeMsg(res.message)],
        }));
      } catch (err) {
        pushMsg("assistant", getErrMsg(err));
      }
    });
  }

  function handleSend() {
    const answer = draft.trim();
    if (!answer) return;
    setDraft("");
    updateApp((s) => ({ ...s, messages: [...s.messages, makeMsg(answer, "user")] }));

    startTransition(async () => {
      try {
        const res = await callCoach({
          action: "extract-story",
          answer,
          stories: state.stories,
          jobAnalysis: state.jobAnalysis,
        });
        if (res.action !== "extract-story") return;
        updateApp((s) => {
          const stories = [...s.stories, ...res.stories];
          const jobAnalysis = s.jobAnalysis ? updateCoverage(s.jobAnalysis, stories) : null;
          return {
            ...s,
            stories,
            jobAnalysis,
            messages: [
              ...s.messages,
              makeMsg(res.message),
              ...(res.nextQuestion ? [makeMsg(res.nextQuestion)] : []),
            ],
          };
        });
      } catch (err) {
        pushMsg("assistant", getErrMsg(err));
      }
    });
  }

  function handleStatusChange(storyId: string, status: StoryStatus) {
    updateApp((s) => {
      const stories = s.stories.map((st) => (st.id === storyId ? { ...st, status } : st));
      const jobAnalysis = s.jobAnalysis ? updateCoverage(s.jobAnalysis, stories) : null;
      return { ...s, stories, jobAnalysis };
    });
  }

  function handleDeleteStory(storyId: string) {
    updateApp((s) => {
      const stories = s.stories.filter((st) => st.id !== storyId);
      const jobAnalysis = s.jobAnalysis ? updateCoverage(s.jobAnalysis, stories) : null;
      return { ...s, stories, jobAnalysis };
    });
  }

  function handleGenerateResume() {
    startTransition(async () => {
      try {
        const res = await callCoach({
          action: "generate-resume",
          stories: state.stories,
          jobAnalysis: state.jobAnalysis,
          baseResume: state.resume,
        });
        if (res.action !== "generate-resume") return;
        updateApp((s) => ({
          ...s,
          resume: res.resume,
          messages: [...s.messages, makeMsg(res.message)],
        }));
        setActiveTab("resume");
      } catch (err) {
        pushMsg("assistant", getErrMsg(err));
      }
    });
  }

  function handleDemo() {
    const demo = createDemoState();
    setState(demo);
    setJdDraft(demo.jobAnalysis?.rawText ?? SAMPLE_JD);
    setDraft("");
    setActiveTab("resume");
  }

  function handleReset() {
    clearState();
    setState(createInitialState());
    setDraft("");
    setJdDraft(SAMPLE_JD);
    setActiveTab("chat");
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stori-workspace.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── derived ───────────────────────────────────────────────

  const hasJd = Boolean(state.jobAnalysis);
  const confirmedCount = state.stories.filter((s) => s.status === "confirmed").length;
  const totalCoverable = (coverageCounts.covered + coverageCounts.weak + coverageCounts.missing) || 0;
  const coveredPct = totalCoverable > 0 ? Math.round(((coverageCounts.covered + coverageCounts.weak) / totalCoverable) * 100) : 0;

  // ── render ─────────────────────────────────────────────────

  return (
    <div className="app-shell">
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="brand-name">Stori</div>
            <div className="brand-tag">讲好你的故事，拿到心仪的 Offer</div>
          </div>
        </div>

        <div className="topbar-actions">
          <div className={`status-badge ${hasJd ? "" : "idle"}`}>
            <ShieldCheck size={13} />
            {hasJd ? `JD 已接入 · ${state.jobAnalysis!.title}` : "可先无 JD 采集经历"}
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={handleDemo}>
            <BookOpen size={14} />
            示例
          </button>
          <button className="btn btn-ghost btn-sm danger" type="button" onClick={handleReset}>
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </header>

      {/* ── JD strip ── */}
      <section className="jd-strip" aria-label="岗位 JD 分析">
        <div className="jd-header">
          <div className="jd-header-left">
            <div className="jd-icon"><BriefcaseBusiness size={16} /></div>
            <div>
              <div className="jd-title">岗位基地</div>
              <div className="jd-desc">粘贴 JD 后，AI 会拆解能力项并按缺口追问经历</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            type="button"
            onClick={() => setJdExpanded((v) => !v)}
            aria-label={jdExpanded ? "收起 JD" : "展开 JD"}
          >
            {jdExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {jdExpanded && (
          <>
            <div className="jd-body">
              <textarea
                className="jd-textarea"
                value={jdDraft}
                onChange={(e) => setJdDraft(e.target.value)}
                placeholder="粘贴岗位 JD、岗位职责、任职要求…"
                aria-label="岗位 JD 文本"
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleAnalyzeJd}
                disabled={isPending || !jdDraft.trim()}
              >
                <Layers3 size={15} />
                分析 JD
              </button>
            </div>

            {state.jobAnalysis && (
              <div className="jd-result">
                {state.jobAnalysis.requirements.slice(0, 10).map((req) => (
                  <span key={req.id} className={`jd-pill ${req.coverage}`}>
                    {req.coverage === "covered" ? <Check size={10} /> : req.coverage === "weak" ? <AlertTriangle size={10} /> : <X size={10} />}
                    {req.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Desktop tabs ── */}
      <nav className="desktop-tabs" aria-label="工作区切换">
        {(["chat", "stories", "resume"] as WorkspaceTab[]).map((tab) => {
          const labels: Record<WorkspaceTab, string> = { chat: "AI 对话", stories: "事实素材", resume: "简历预览" };
          const icons: Record<WorkspaceTab, React.ReactNode> = {
            chat: <MessageSquare size={15} />,
            stories: <Layers3 size={15} />,
            resume: <FileText size={15} />,
          };
          const badge = tab === "stories" && state.stories.length > 0 ? state.stories.length : null;
          return (
            <button
              key={tab}
              className={`desktop-tab ${activeTab === tab ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {icons[tab]}
              {labels[tab]}
              {badge !== null && <span className="desktop-tab-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* ── Workspace grid ── */}
      <div className="workspace-grid" role="main">
        {/* Chat */}
        <div className={`workspace-panel chat-column ${activeTab === "chat" ? "is-active" : ""}`}>
          <ChatPanel
            messages={state.messages}
            draft={draft}
            isPending={isPending}
            onDraftChange={setDraft}
            onSend={handleSend}
            onUseSample={() => setDraft(SAMPLE_STORY)}
            onGenerate={handleGenerateResume}
          />
        </div>

        {/* Stories */}
        <div className={`workspace-panel story-column ${activeTab === "stories" ? "is-active" : ""}`}>
          <StoryPanel
            stories={state.stories}
            jobAnalysis={state.jobAnalysis}
            coverageCounts={coverageCounts}
            coveredPct={coveredPct}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteStory}
          />
        </div>

        {/* Resume */}
        <div className={`workspace-panel resume-column ${activeTab === "resume" ? "is-active" : ""}`}>
          <ResumePanel
            resume={state.resume}
            readiness={readiness}
            coverageCounts={coverageCounts}
            confirmedCount={confirmedCount}
            isPending={isPending}
            onGenerate={handleGenerateResume}
            onPrint={handlePrint}
            onExportJson={handleExportJson}
          />
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-tabs" aria-label="移动端导航">
        <MobileTab
          icon={<MessageSquare size={20} />}
          label="对话"
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        />
        <MobileTab
          icon={<Layers3 size={20} />}
          label="素材"
          active={activeTab === "stories"}
          badge={state.stories.length > 0 ? state.stories.length : undefined}
          onClick={() => setActiveTab("stories")}
        />
        <MobileTab
          icon={<FileText size={20} />}
          label="简历"
          active={activeTab === "resume"}
          onClick={() => setActiveTab("resume")}
        />
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────
// ChatPanel
// ─────────────────────────────────────────────

function ChatPanel({
  messages,
  draft,
  isPending,
  onDraftChange,
  onSend,
  onUseSample,
  onGenerate,
}: {
  messages: ChatMessage[];
  draft: string;
  isPending: boolean;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onUseSample: () => void;
  onGenerate: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  const voice = useVoiceInput((text) => onDraftChange(draft + (draft ? " " : "") + text));

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <>
      <div className="panel-header">
        <div className="panel-icon"><MessageSquare size={16} /></div>
        <div>
          <div className="panel-title">AI 采访官</div>
          <div className="panel-subtitle">先讲经历，再生成简历</div>
        </div>
      </div>

      <div className="panel-body" ref={listRef}>
        <div className="message-list" aria-live="polite" aria-label="对话记录">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              {msg.role === "assistant" && (
                <div className="message-avatar" aria-hidden="true">AI</div>
              )}
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}

          {isPending && (
            <div className="message-row assistant">
              <div className="message-avatar" aria-hidden="true">AI</div>
              <div className="typing-bubble" aria-label="AI 正在思考">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel-footer composer">
        <div className="composer-chips">
          <button className="chip" type="button" onClick={onUseSample}>
            <Sparkles size={12} />
            填入示例经历
          </button>
          <button className="chip" type="button" onClick={onGenerate} disabled={isPending}>
            <FileText size={12} />
            生成简历
          </button>
        </div>

        <div className="composer-input-row">
          <label className="sr-only" htmlFor="chat-input">讲述你的经历</label>
          <textarea
            id="chat-input"
            className="composer-textarea"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="讲一段真实经历：背景是什么、你负责什么、做了什么、最后有什么结果…"
            rows={3}
          />
          <div className="composer-actions">
            {voice.supported && (
              <button
                className={`btn btn-outline btn-icon btn-sm ${voice.isRecording ? "recording-pulse" : ""}`}
                type="button"
                onClick={voice.toggle}
                aria-label={voice.isRecording ? "停止录音" : "开始语音输入"}
                title={voice.isRecording ? "停止录音" : "语音输入（仅支持 Chrome/Edge）"}
                style={voice.isRecording ? { color: "var(--danger)", borderColor: "var(--danger)" } : {}}
              >
                {voice.isRecording ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <button
              className="btn btn-primary btn-icon btn-sm"
              type="button"
              onClick={onSend}
              disabled={!draft.trim() || isPending}
              aria-label="发送"
              title="发送 (Ctrl+Enter)"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        <div className="mt-1" style={{ fontSize: ".72rem", color: "var(--muted-2)", textAlign: "right" }}>
          Ctrl+Enter 发送
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// StoryPanel
// ─────────────────────────────────────────────

function StoryPanel({
  stories,
  jobAnalysis,
  coverageCounts,
  coveredPct,
  onStatusChange,
  onDelete,
}: {
  stories: StoryCard[];
  jobAnalysis: JobAnalysis | null;
  coverageCounts: { covered: number; weak: number; missing: number };
  coveredPct: number;
  onStatusChange: (id: string, s: StoryStatus) => void;
  onDelete: (id: string) => void;
}) {
  const total = coverageCounts.covered + coverageCounts.weak + coverageCounts.missing;
  const coveredW = total > 0 ? Math.round((coverageCounts.covered / total) * 100) : 0;
  const weakW = total > 0 ? Math.round((coverageCounts.weak / total) * 100) : 0;

  return (
    <>
      <div className="panel-header">
        <div className="panel-icon"><Layers3 size={16} /></div>
        <div>
          <div className="panel-title">事实素材库</div>
          <div className="panel-subtitle">确认后才写入简历</div>
        </div>
        {stories.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: ".78rem", fontWeight: 700, color: "var(--muted)" }}>
            {stories.filter((s) => s.status === "confirmed").length}/{stories.length} 已确认
          </span>
        )}
      </div>

      {jobAnalysis && total > 0 && (
        <div className="coverage-bar-wrap">
          <div className="coverage-label-row">
            <span>JD 覆盖：{jobAnalysis.title}</span>
            <span>{coveredPct}% 有证据</span>
          </div>
          <div className="coverage-bar">
            <div className="coverage-bar-fill covered" style={{ width: `${coveredW}%` }} />
            <div className="coverage-bar-fill weak" style={{ width: `${weakW}%` }} />
          </div>
        </div>
      )}

      <div className="panel-body">
        <div className="story-list">
          {stories.length === 0 ? (
            <div className="story-empty">
              <Layers3 size={36} />
              <h3>还没有故事卡</h3>
              <p>在左侧对话框里讲一段经历，AI 会自动抽取结构化的故事卡。</p>
            </div>
          ) : (
            stories.map((story) => (
              <StoryCardItem
                key={story.id}
                story={story}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// StoryCardItem
// ─────────────────────────────────────────────

function StoryCardItem({
  story,
  onStatusChange,
  onDelete,
}: {
  story: StoryCard;
  onStatusChange: (id: string, s: StoryStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(story.status !== "confirmed");

  const statusLabel: Record<StoryStatus, string> = {
    confirmed: "已确认",
    "needs-info": "需补充",
    draft: "待确认",
  };

  return (
    <article className={`story-card ${story.status}`}>
      {/* Card header — clickable to expand */}
      <div
        className="story-card-header"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
          <span className={`story-status-dot ${story.status}`} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div className={`story-status-label ${story.status}`}>{statusLabel[story.status]}</div>
            <div className="story-title">{story.title}</div>
            {!expanded && story.skills.length > 0 && (
              <div className="tags-row" style={{ marginTop: 4 }}>
                {story.skills.slice(0, 3).map((sk) => (
                  <span key={sk} className="tag tag-skill">{sk}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-icon btn-xs danger"
            type="button"
            aria-label="删除故事卡"
            onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={14} style={{ color: "var(--muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="story-card-body">
          <dl className="story-fields">
            <div className="story-field">
              <dt>背景</dt>
              <dd>{story.context}</dd>
            </div>
            <div className="story-field">
              <dt>角色</dt>
              <dd>{story.role}</dd>
            </div>
            {story.actions.length > 0 && (
              <div className="story-field">
                <dt>行动</dt>
                <dd>
                  <ul style={{ paddingLeft: 14, listStyle: "disc" }}>
                    {story.actions.map((a, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{a}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            <div className="story-field">
              <dt>结果</dt>
              <dd>{story.result}</dd>
            </div>
          </dl>

          {/* Skills */}
          {story.skills.length > 0 && (
            <div className="tags-row">
              {story.skills.map((sk) => (
                <span key={sk} className="tag tag-skill">{sk}</span>
              ))}
            </div>
          )}

          {/* Evidence */}
          {story.evidence.length > 0 && (
            <div className="tags-row mt-2">
              {story.evidence.map((ev) => (
                <span key={ev.id} className="tag tag-evidence">{ev.value}</span>
              ))}
            </div>
          )}

          {/* Follow-up */}
          {story.followUps.length > 0 && (
            <div className="followup-box mt-2">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{story.followUps[0]}</span>
            </div>
          )}
        </div>
      )}

      {/* Card footer */}
      <div className="story-card-footer">
        <button
          className="btn btn-outline btn-sm"
          type="button"
          onClick={() => onStatusChange(story.id, "needs-info")}
        >
          <MoreHorizontal size={13} />
          需补充
        </button>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => onStatusChange(story.id, "confirmed")}
          style={{ marginLeft: "auto" }}
        >
          <Check size={13} />
          {story.status === "confirmed" ? "已确认 ✓" : "确认事实"}
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// ResumePanel
// ─────────────────────────────────────────────

function ResumePanel({
  resume,
  readiness,
  coverageCounts,
  confirmedCount,
  isPending,
  onGenerate,
  onPrint,
  onExportJson,
}: {
  resume: ResumeData;
  readiness: number;
  coverageCounts: { covered: number; weak: number; missing: number };
  confirmedCount: number;
  isPending: boolean;
  onGenerate: () => void;
  onPrint: () => void;
  onExportJson: () => void;
}) {
  return (
    <>
      <div className="panel-header">
        <div className="panel-icon"><FileText size={16} /></div>
        <div>
          <div className="panel-title">简历预览</div>
          <div className="panel-subtitle">基于已确认素材生成</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="resume-metrics">
        <div className="metric-card">
          <Gauge size={15} className="metric-icon" />
          <div className="metric-val">{readiness}%</div>
          <div className="metric-lbl">素材成熟度</div>
        </div>
        <div className="metric-card">
          <ShieldCheck size={15} className="metric-icon" />
          <div className="metric-val">{coverageCounts.covered + coverageCounts.weak}</div>
          <div className="metric-lbl">已覆盖能力</div>
        </div>
        <div className="metric-card">
          <AlertTriangle size={15} className="metric-icon" />
          <div className="metric-val">{coverageCounts.missing}</div>
          <div className="metric-lbl">待补充缺口</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="resume-toolbar">
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={onGenerate}
          disabled={isPending}
        >
          <Sparkles size={14} />
          {isPending ? "生成中…" : "生成 / 刷新简历"}
        </button>
        <button className="btn btn-outline btn-sm" type="button" onClick={onPrint}>
          <Printer size={14} />
          打印 / PDF
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onExportJson}>
          <Download size={14} />
          导出数据
        </button>
        <span className="readiness-label" style={{ marginLeft: "auto", fontSize: ".75rem", color: "var(--muted)", fontWeight: 700 }}>
          {confirmedCount > 0 ? `${confirmedCount} 段已确认` : "暂无确认素材"}
        </span>
      </div>

      {/* Resume paper */}
      <div className="panel-body">
        <ResumePreview resume={resume} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// ResumePreview
// ─────────────────────────────────────────────

function ResumePreview({ resume }: { resume: ResumeData }) {
  const hasContent =
    resume.experiences.length > 0 ||
    resume.skills.length > 0 ||
    resume.summary !== "当你确认足够素材后，这里会生成一段真实、克制、面向岗位的个人摘要。";

  if (!hasContent) {
    return (
      <div className="resume-empty">
        <FileText size={36} style={{ opacity: .3 }} />
        <p>先在「对话」区讲述经历并确认故事卡，然后点击「生成简历」。</p>
        <p style={{ fontSize: ".75rem", color: "var(--muted-2)" }}>所有内容仅基于已确认的事实生成，不会编造。</p>
      </div>
    );
  }

  const contacts = [resume.location, resume.email, resume.phone, ...resume.links].filter(Boolean);

  return (
    <div className="resume-paper">
      <div className="resume-paper-inner">
        {/* Header */}
        <h1 className="resume-name">{resume.name}</h1>
        {resume.headline && <div className="resume-headline">{resume.headline}</div>}
        {contacts.length > 0 && (
          <div className="resume-contact">
            {contacts.map((c) => <span key={c}>{c}</span>)}
          </div>
        )}

        <div className="resume-divider" />

        {/* Summary */}
        {resume.summary && !resume.summary.startsWith("当你确认") && (
          <div className="resume-section">
            <div className="resume-section-title">个人摘要</div>
            <p style={{ fontSize: ".875rem", lineHeight: 1.65, color: "#374151" }}>{resume.summary}</p>
          </div>
        )}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <div className="resume-section">
            <div className="resume-section-title">核心能力</div>
            <div className="resume-skills-wrap">
              {resume.skills.map((sk) => <span key={sk} className="resume-skill-chip">{sk}</span>)}
            </div>
          </div>
        )}

        {/* Experience */}
        {resume.experiences.length > 0 && (
          <div className="resume-section">
            <div className="resume-section-title">项目 / 经历</div>
            {resume.experiences.map((exp) => (
              <div key={exp.id} className="resume-experience-item">
                <div className="resume-exp-header">
                  <span className="resume-exp-title">{exp.title}</span>
                  <span className="resume-exp-period">{exp.period}</span>
                </div>
                <div className="resume-exp-org">{exp.organization}</div>
                {exp.bullets.length > 0 && (
                  <ul className="resume-exp-bullets">
                    {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <div className="resume-section">
            <div className="resume-section-title">教育经历</div>
            {resume.education.map((edu) => (
              <div key={edu} style={{ fontSize: ".875rem", color: "#374151", marginBottom: 4 }}>{edu}</div>
            ))}
          </div>
        )}

        {/* Notes */}
        {resume.notes.length > 0 && (
          <div className="resume-section">
            <div className="resume-section-title">待补充提示</div>
            <ul className="resume-notes-list">
              {resume.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MobileTab
// ─────────────────────────────────────────────

function MobileTab({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`mobile-tab ${active ? "is-active" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="mobile-tab-badge">{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}
