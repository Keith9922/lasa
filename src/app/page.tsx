"use client";

/**
 * 拉啥 · 主页面（v2.1）
 *
 * 信息架构：
 *  - **主入口是描述输入**：用户进来就看到大 textarea，让 AI 解析自然语言
 *  - 想偷懒挑预设的话，下方折叠区可展开 23 个预设 +「我的常用」
 *  - 删掉旧的 Tab 切换 + 「随便来一顿」入口（用户吃啥是确定事实，随机违反产品逻辑）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Heart,
  History as HistoryIcon,
  ListChecks,
  MessageCircle,
  Settings as SettingsIcon,
} from "lucide-react";

import { PORTION_LABEL, getFoodById, type PortionLevel, type PresetFood } from "@/lib/foods";
import { intakeFromPreset, intakeFromAi } from "@/lib/intake";
import { predict, type Prediction } from "@/lib/predict";
import { pickAchievement, type Achievement } from "@/lib/achievements";
import type { IntakeItem } from "@/lib/types";
import type { ParsedFood } from "@/lib/schemas";
import { pickRoast } from "@/lib/roasts";

import dynamic from "next/dynamic";

import { DescribePane } from "@/components/describe-pane";
import { IntakeList } from "@/components/intake-list";
import { Toast } from "@/components/toast";
import { YesterdayPrompt } from "@/components/yesterday-prompt";
import { UserBadge } from "@/components/user-badge";
import { FoodPickerModal } from "@/components/food-picker-modal";
import { AskGutModal } from "@/components/ask-gut-modal";

/**
 * 重组件按需加载：
 *  - ToiletAnimation 只在出卡瞬间用
 *  - ResultView 拉了 modern-screenshot，是大头
 *  - HelpModal 只在用户点"怎么玩"时才弹
 * ssr:false：这些都强 client-only（音频、DOM 截图、Web Audio），SSR 也无意义
 */
const ToiletAnimation = dynamic(
  () => import("@/components/toilet-animation").then((m) => m.ToiletAnimation),
  { ssr: false },
);
const ResultView = dynamic(
  () => import("@/components/result-view").then((m) => m.ResultView),
  { ssr: false },
);
const HelpModal = dynamic(
  () => import("@/components/help-modal").then((m) => m.HelpModal),
  { ssr: false },
);
import {
  recordCard,
  findPendingVerdict,
  getHistory,
  getAchievements,
  getSettings,
  getCustomFoods,
  saveCustomFood,
  customFoodToPresetShape,
  unlockAchievement,
  onStorageMutation,
  logAICall,
  type HistoryEntry,
} from "@/lib/storage";
import { computeHealthScore } from "@/lib/stats";
import { detectHealthAchievements } from "@/lib/health-track";

export type RoastSource = "ai" | "template" | "error";

type Phase =
  | { kind: "input" }
  | { kind: "animating"; prediction: Prediction; achievement: Achievement | null }
  | {
      kind: "result";
      prediction: Prediction;
      roast: string;
      achievement: Achievement | null;
      /** AI / template / error，用于在卡片上显示 source 标识 */
      roastSource: RoastSource;
    };

const PORTION_CYCLE: PortionLevel[] = ["normal", "large", "huge", "small"];

export default function HomePage() {
  const [intake, setIntake] = useState<Record<string, IntakeItem>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const [pending, setPending] = useState<HistoryEntry | null>(null);
  /** 当前健康分（0-100，null = 没有任何 history）—— 显示在头部 */
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [customFoods, setCustomFoods] = useState<PresetFood[]>([]);
  /** 食物选择 Modal 开关 */
  const [pickerOpen, setPickerOpen] = useState(false);
  /** 「问问肠子」Modal 开关 */
  const [askOpen, setAskOpen] = useState(false);
  /** AI 解析时 server 估算的整餐水分（毫升）；用于预测引擎水合维度 */
  const [extraWaterMl, setExtraWaterMl] = useState(0);
  const toastTimer = useRef<number | null>(null);
  /**
   * 当前活跃的吐槽流上下文。流式吐字时持续更新 latest，
   * 动画切到 result 时就用 latest 当初始值，之后每个 delta 同步进 phase。
   * source 在 done 事件到来时回填，未到来前默认 "ai"（流式生效中）。
   */
  const roastRef = useRef<{
    prediction: Prediction;
    abort: AbortController;
    latest: string;
    source: RoastSource;
  } | null>(null);

  const intakeList = useMemo(() => Object.values(intake), [intake]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    roastRef.current?.abort.abort();
  }, []);

  /**
   * 入站时拉一次 + 订阅本地变更：出卡后自动刷健康分徽章 + 常用食物 + 待反馈条。
   */
  useEffect(() => {
    const refresh = () => {
      setPending(findPendingVerdict());
      const score = computeHealthScore(getHistory());
      setHealthScore(score?.total ?? null);
      setCustomFoods(getCustomFoods().map(customFoodToPresetShape));
    };
    refresh();
    const unsub = onStorageMutation(refresh);
    return unsub;
  }, []);

  const savedFoodNames = useMemo(
    () => new Set(customFoods.map((f) => f.name)),
    [customFoods],
  );

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  }, []);

  const handleSaveAsCustom = useCallback((item: IntakeItem) => {
    if (item.source !== "ai") return;
    if (savedFoodNames.has(item.name)) return;
    const saved = saveCustomFood({
      emoji: item.emoji,
      name: item.name,
      base: {
        grams: item.grams,
        kcal: item.macros.kcal,
        carbs: item.macros.carbs,
        fiber: item.macros.fiber,
        protein: item.macros.protein,
        fat: item.macros.fat,
      },
      tags: item.tags,
    });
    setCustomFoods((prev) => [
      customFoodToPresetShape({ ...saved, savedAt: saved.savedAt }),
      ...prev.filter((f) => f.name !== saved.name),
    ]);
    showToast(`已保存「${saved.name}」到常用`);
  }, [savedFoodNames, showToast]);

  // ---- handlers ----

  const togglePreset = (food: PresetFood) => {
    setIntake((prev) => {
      const next = { ...prev };
      if (next[food.id]) delete next[food.id];
      else next[food.id] = intakeFromPreset(food, "normal");
      return next;
    });
  };

  const cyclePortion = (foodId: string) => {
    setIntake((prev) => {
      const item = prev[foodId];
      if (!item?.portion) return prev;
      // 自定义食物：从 customFoods 里找；预设：getFoodById 找
      const food =
        getFoodById(foodId) ??
        customFoods.find((f) => f.id === foodId);
      if (!food) return prev;
      const idx = PORTION_CYCLE.indexOf(item.portion);
      const nextLevel = PORTION_CYCLE[(idx + 1) % PORTION_CYCLE.length];
      return { ...prev, [foodId]: intakeFromPreset(food, nextLevel) };
    });
  };

  const removeIntake = (id: string) => {
    setIntake((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearIntake = () => {
    if (intakeList.length === 0) return;
    setIntake({});
    setExtraWaterMl(0);
  };

  const addParsed = (foods: ParsedFood[], totalWaterMl?: number) => {
    setIntake((prev) => {
      const next = { ...prev };
      foods.forEach((f, i) => {
        const item = intakeFromAi(f, Object.keys(next).length + i);
        next[item.id] = item;
      });
      return next;
    });
    if (typeof totalWaterMl === "number") {
      setExtraWaterMl((prev) => prev + totalWaterMl);
    }
    showToast(`已加入 ${foods.length} 项`);
  };

  const startRoastStream = (prediction: Prediction, items: IntakeItem[], tone: "savage" | "gentle", strict: boolean) => {
    const abort = new AbortController();
    const ctx: NonNullable<typeof roastRef.current> = {
      prediction,
      abort,
      latest: "",
      source: "ai",
    };
    roastRef.current = ctx;
    streamRoast(prediction, items, abort.signal, tone, strict, (text) => {
      ctx.latest = text;
      setPhase((prev) =>
        prev.kind === "result" && prev.prediction === prediction
          ? { ...prev, roast: text }
          : prev,
      );
    })
      .then((final) => {
        ctx.latest = final.text;
        ctx.source = final.source;
        // 写入 AI 状态日志（settings 页"AI 状态"会读这个）
        try {
          logAICall({
            endpoint: "generate-roast",
            source: final.source,
            latencyMs: final.latencyMs,
            at: Date.now(),
            errorMsg: final.error,
          });
        } catch { /* swallow */ }
        setPhase((prev) =>
          prev.kind === "result" && prev.prediction === prediction
            ? { ...prev, roast: final.text, roastSource: final.source }
            : prev,
        );
      })
      .catch(() => {/* abort / 网络错误已在 streamRoast 内部兜底 */});
  };

  const handleStart = () => {
    if (intakeList.length === 0) return;
    const settings = getSettings();
    const prediction = predict({
      items: intakeList,
      bristolBias: settings.calibration.bristolBias,
      volumeBias: settings.calibration.volumeBias,
      extraWaterMl,
    });
    const achievement = pickAchievement(prediction, intakeList);
    startRoastStream(prediction, intakeList, settings.tone, settings.preferRealAi);
    setPhase({ kind: "animating", prediction, achievement });
  };

  const handleAnimationComplete = useCallback(() => {
    if (phase.kind !== "animating") return;
    const { prediction, achievement } = phase;
    try {
      recordCard({
        prediction,
        intake: intakeList,
        achievement:
          achievement && achievement.rarity !== "common"
            ? {
                id: achievement.id,
                rarity: achievement.rarity,
                title: achievement.title,
                blurb: achievement.blurb,
              }
            : undefined,
      });
    } catch (err) {
      console.warn("[storage] recordCard failed", err);
    }
    // 这一张卡可能让用户跨过健康指标阈值 → 检测健康成就并塞进成就墙
    // （取代旧 BINGO 集卡机制 —— 那个隐式鼓励吃出异常状态，跟健康相反）
    try {
      const history = getHistory();
      const ach = getAchievements();
      const unlockedIds = new Set(ach.map((a) => a.id));
      const matched = detectHealthAchievements(history);
      for (const rule of matched) {
        if (unlockedIds.has(rule.id)) continue;
        unlockAchievement({
          id: rule.id,
          rarity: rule.rarity,
          title: rule.title,
          blurb: rule.blurb,
        });
        showToast(rule.title);
      }
    } catch { /* swallow */ }
    const initialRoast = roastRef.current?.latest ?? "";
    const initialSource: RoastSource = roastRef.current?.source ?? "ai";
    setPhase({
      kind: "result",
      prediction,
      roast: initialRoast,
      achievement,
      roastSource: initialSource,
    });
  }, [phase, intakeList, showToast]);

  const handleReset = () => {
    roastRef.current?.abort.abort();
    roastRef.current = null;
    setIntake({});
    setExtraWaterMl(0);
    setPhase({ kind: "input" });
  };

  // ---- render ----

  return (
    <main className="page">
      <div className="shell">
        {phase.kind === "input" || phase.kind === "animating" ? (
          <>
            <header className="brand">
              <span className="brand-logo">
                <span className="brand-emoji" aria-hidden>💩</span>
                <span className="brand-zh">拉啥</span>
              </span>
              <div className="brand-actions">
                <span
                  className="icon-btn icon-btn--score"
                  aria-label={
                    healthScore === null ? "健康分（暂无）" : `健康分 ${healthScore}`
                  }
                  title="健康分：综合最近 7 天 Bristol 集中度、颜色稳定性、纤维水分、记录频次和反馈准确率"
                >
                  <Heart size={14} aria-hidden />
                  <span className="icon-btn-label">
                    健康{healthScore === null ? " —" : ` ${healthScore}`}
                  </span>
                </span>
                <Link className="icon-btn" href="/dex" aria-label="病例档案">
                  <BookOpen size={14} aria-hidden />
                  <span className="icon-btn-label">档案</span>
                </Link>
                <Link className="icon-btn" href="/history" aria-label="日记">
                  <HistoryIcon size={14} aria-hidden />
                  <span className="icon-btn-label">日记</span>
                </Link>
                <Link className="icon-btn" href="/insights" aria-label="趋势">
                  <BarChart3 size={14} aria-hidden />
                  <span className="icon-btn-label">趋势</span>
                </Link>
                <button
                  className="icon-btn icon-btn--icon-only-mobile"
                  type="button"
                  onClick={() => setAskOpen(true)}
                  aria-label="问问肠子"
                  title="问问肠子"
                >
                  <MessageCircle size={14} aria-hidden />
                  <span className="icon-btn-label">问问肠子</span>
                </button>
                <Link className="icon-btn icon-btn--icon-only" href="/settings" aria-label="设置">
                  <SettingsIcon size={14} aria-hidden />
                </Link>
                <button
                  className="icon-btn icon-btn--icon-only-mobile"
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  aria-label="怎么玩"
                  title="怎么玩"
                >
                  <CircleHelp size={14} aria-hidden />
                  <span className="icon-btn-label">怎么玩</span>
                </button>
                <UserBadge />
              </div>
            </header>

            {pending && (
              <YesterdayPrompt
                entry={pending}
                onDone={() => setPending(null)}
              />
            )}

            <section className="hero">
              <p className="hero-eyebrow">Today In · Tomorrow Out</p>
              <h1 className="hero-title">今天吃了啥？</h1>
              <p className="hero-sub">直接说就行——AI 会帮你拆解、估算热量、预测明天的便便。</p>
            </section>

            <DescribePane onAddParsed={addParsed} />

            <IntakeList
              items={intakeList}
              onRemove={removeIntake}
              onClear={clearIntake}
              savedFoodNames={savedFoodNames}
              onSaveAsCustom={handleSaveAsCustom}
            />

            <button
              type="button"
              className="picker-trigger"
              onClick={() => setPickerOpen(true)}
            >
              <ListChecks size={14} aria-hidden />
              <span>不想打字？挑几个常吃的</span>
              {customFoods.length > 0 && (
                <span className="picker-trigger-chip">{customFoods.length} 项常用</span>
              )}
            </button>

            <div className="cta-wrap">
              <button
                className="cta"
                type="button"
                onClick={handleStart}
                disabled={intakeList.length === 0}
                aria-disabled={intakeList.length === 0}
              >
                {intakeList.length === 0 ? "先告诉我今天吃了啥" : "开 拉"}
              </button>
              <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
            </div>
          </>
        ) : (
          <ResultView
            prediction={phase.prediction}
            roast={phase.roast}
            roastSource={phase.roastSource}
            achievement={phase.achievement}
            onReset={handleReset}
            onToast={showToast}
          />
        )}
      </div>

      <ToiletAnimation
        active={phase.kind === "animating"}
        prediction={phase.kind === "animating" ? phase.prediction : null}
        onComplete={handleAnimationComplete}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <FoodPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        intake={intake}
        onToggle={togglePreset}
        onCyclePortion={cyclePortion}
        customFoods={customFoods}
      />
      <AskGutModal open={askOpen} onClose={() => setAskOpen(false)} />
      <Toast message={toast.msg} show={toast.show} />
    </main>
  );
}

// ---- helpers ----

type RoastResult = {
  text: string;
  source: RoastSource;
  latencyMs: number;
  error?: string;
};

/**
 * 流式调用 generate-roast。
 *
 *  - 服务端走 SSE：data: {type:"delta"|"done"|"error", ...}
 *  - 每个 delta 调用 onProgress 推增量；done 后 resolve final
 *  - 默认 AI 失败回退到本地模板池；strict=true 时不兜底，返回 source="error"
 */
async function streamRoast(
  prediction: Prediction,
  intake: IntakeItem[],
  signal: AbortSignal,
  tone: "savage" | "gentle",
  strict: boolean,
  onProgress: (text: string) => void,
): Promise<RoastResult> {
  const t0 = performance.now();
  const summary = intake.map((i) =>
    `${i.name}${i.portion ? `(${PORTION_LABEL[i.portion]})` : `(${i.grams}g)`}`,
  );
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(65_000)]);
  const { warnings: _w, _debug: _d, ...payload } = prediction;
  const url = `/api/generate-roast?stream=1${strict ? "&strict=1" : ""}`;
  const fallback = (err?: string): RoastResult => ({
    text: strict ? "" : pickRoast(prediction),
    source: strict ? "error" : "template",
    latencyMs: Math.round(performance.now() - t0),
    error: err,
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction: payload, intakeSummary: summary, tone }),
      signal: timeout,
    });
    if (!res.ok || !res.body) return fallback(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let finalEvent: { text: string; source: RoastSource; latencyMs?: number; error?: string } | null = null;
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
            | { type: "done"; text: string; source: RoastSource; latencyMs?: number; error?: string }
            | { type: "error"; message: string; code: number };
          if (obj.type === "delta" && obj.text) {
            onProgress(obj.text);
          } else if (obj.type === "done") {
            finalEvent = obj;
          }
        } catch {
          // skip malformed
        }
      }
    }
    if (finalEvent) {
      return {
        text: finalEvent.text,
        source: finalEvent.source,
        latencyMs: finalEvent.latencyMs ?? Math.round(performance.now() - t0),
        error: finalEvent.error,
      };
    }
    return fallback("流意外结束");
  } catch (err) {
    return fallback(err instanceof Error ? err.message : String(err));
  }
}
