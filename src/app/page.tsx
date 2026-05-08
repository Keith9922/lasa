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
  History as HistoryIcon,
  ListChecks,
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
  getDex,
  getSettings,
  getCustomFoods,
  saveCustomFood,
  customFoodToPresetShape,
  onStorageMutation,
  type HistoryEntry,
} from "@/lib/storage";

type Phase =
  | { kind: "input" }
  | { kind: "animating"; prediction: Prediction; achievement: Achievement | null }
  | { kind: "result"; prediction: Prediction; roast: string; achievement: Achievement | null };

const PORTION_CYCLE: PortionLevel[] = ["normal", "large", "huge", "small"];

export default function HomePage() {
  const [intake, setIntake] = useState<Record<string, IntakeItem>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const [pending, setPending] = useState<HistoryEntry | null>(null);
  const [dexCount, setDexCount] = useState(0);
  const [customFoods, setCustomFoods] = useState<PresetFood[]>([]);
  /** 食物选择 Modal 开关 */
  const [pickerOpen, setPickerOpen] = useState(false);
  /** AI 解析时 server 估算的整餐水分（毫升）；用于预测引擎水合维度 */
  const [extraWaterMl, setExtraWaterMl] = useState(0);
  const toastTimer = useRef<number | null>(null);
  /**
   * 当前活跃的吐槽流上下文。流式吐字时持续更新 latest，
   * 动画切到 result 时就用 latest 当初始值，之后每个 delta 同步进 phase。
   */
  const roastRef = useRef<{
    prediction: Prediction;
    abort: AbortController;
    latest: string;
  } | null>(null);

  const intakeList = useMemo(() => Object.values(intake), [intake]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    roastRef.current?.abort.abort();
  }, []);

  /**
   * 入站时拉一次 + 订阅本地变更：出卡后自动刷"图鉴 N/49"徽章 + 常用食物。
   * 之前只在 mount 跑一次，所以出卡解锁新格子但徽章不动 —— 是 UAT 提的中等问题。
   */
  useEffect(() => {
    const refresh = () => {
      setPending(findPendingVerdict());
      setDexCount(getDex().length);
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

  const startRoastStream = (prediction: Prediction, items: IntakeItem[], tone: "savage" | "gentle") => {
    const abort = new AbortController();
    const ctx = { prediction, abort, latest: "" };
    roastRef.current = ctx;
    streamRoast(prediction, items, abort.signal, tone, (text) => {
      ctx.latest = text;
      setPhase((prev) =>
        prev.kind === "result" && prev.prediction === prediction
          ? { ...prev, roast: text }
          : prev,
      );
    }).then((final) => {
      ctx.latest = final;
      setPhase((prev) =>
        prev.kind === "result" && prev.prediction === prediction
          ? { ...prev, roast: final }
          : prev,
      );
    }).catch(() => {/* abort / 网络错误已在 streamRoast 内部兜底 */});
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
    startRoastStream(prediction, intakeList, settings.tone);
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
    const initialRoast = roastRef.current?.latest ?? "";
    setPhase({ kind: "result", prediction, roast: initialRoast, achievement });
  }, [phase, intakeList]);

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
                <Link className="icon-btn" href="/dex" aria-label="图鉴">
                  <BookOpen size={14} aria-hidden />
                  <span className="icon-btn-label">
                    图鉴{dexCount > 0 ? ` ${dexCount}/49` : ""}
                  </span>
                </Link>
                <Link className="icon-btn" href="/history" aria-label="日记">
                  <HistoryIcon size={14} aria-hidden />
                  <span className="icon-btn-label">日记</span>
                </Link>
                <Link className="icon-btn" href="/insights" aria-label="趋势">
                  <BarChart3 size={14} aria-hidden />
                  <span className="icon-btn-label">趋势</span>
                </Link>
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
      <Toast message={toast.msg} show={toast.show} />
    </main>
  );
}

// ---- helpers ----

/**
 * 流式调用 generate-roast。
 *
 *  - 服务端走 SSE：data: {type:"delta"|"done"|"error", ...}
 *  - 每个 delta 调用 onProgress 推增量；done 后 resolve final
 *  - 任何阶段出错都回退到本地模板池，**始终返回一个非空字符串**
 */
async function streamRoast(
  prediction: Prediction,
  intake: IntakeItem[],
  signal: AbortSignal,
  tone: "savage" | "gentle",
  onProgress: (text: string) => void,
): Promise<string> {
  const summary = intake.map((i) =>
    `${i.name}${i.portion ? `(${PORTION_LABEL[i.portion]})` : `(${i.grams}g)`}`,
  );
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(65_000)]);
  const { warnings: _w, _debug: _d, ...payload } = prediction;
  try {
    const res = await fetch("/api/generate-roast?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction: payload, intakeSummary: summary, tone }),
      signal: timeout,
    });
    if (!res.ok || !res.body) return pickRoast(prediction);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let final: string | null = null;
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
            | { type: "done"; text: string; source: string }
            | { type: "error"; message: string; code: number };
          if (obj.type === "delta" && obj.text) {
            onProgress(obj.text);
          } else if (obj.type === "done") {
            final = obj.text;
          }
        } catch {
          // skip malformed
        }
      }
    }
    return final ?? pickRoast(prediction);
  } catch {
    return pickRoast(prediction);
  }
}
