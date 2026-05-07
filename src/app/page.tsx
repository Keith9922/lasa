"use client";

/**
 * 拉啥 · 主页面（v0.2）
 *
 * 状态机：input → animating → result，单页内切换。
 * 详细见 docs/interaction.md / docs/animation.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, CircleHelp, History as HistoryIcon, ListChecks, Pencil, Settings as SettingsIcon } from "lucide-react";

import { PORTION_LABEL, PRESET_FOODS, getFoodById, type PortionLevel, type PresetFood } from "@/lib/foods";
import { intakeFromPreset, intakeFromAi } from "@/lib/intake";
import { predict, type Prediction } from "@/lib/predict";
import { pickAchievement, type Achievement } from "@/lib/achievements";
import type { IntakeItem } from "@/lib/types";
import type { ParsedFood } from "@/lib/schemas";
import { pickRoast } from "@/lib/roasts";

import { QuickPickPane } from "@/components/quick-pick-pane";
import { DescribePane } from "@/components/describe-pane";
import { IntakeList } from "@/components/intake-list";
import { ToiletAnimation } from "@/components/toilet-animation";
import { ResultView } from "@/components/result-view";
import { HelpModal } from "@/components/help-modal";
import { Toast } from "@/components/toast";
import { YesterdayPrompt } from "@/components/yesterday-prompt";
import { UserBadge } from "@/components/user-badge";
import {
  recordCard,
  findPendingVerdict,
  getDex,
  getSettings,
  getCustomFoods,
  saveCustomFood,
  customFoodToPresetShape,
  type HistoryEntry,
} from "@/lib/storage";

type TabKey = "quick" | "describe";

type Phase =
  | { kind: "input" }
  | { kind: "animating"; prediction: Prediction; achievement: Achievement | null }
  | { kind: "result"; prediction: Prediction; roast: string; achievement: Achievement | null };

const PORTION_CYCLE: PortionLevel[] = ["normal", "large", "huge", "small"];

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("quick");
  const [intake, setIntake] = useState<Record<string, IntakeItem>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const [pending, setPending] = useState<HistoryEntry | null>(null);
  const [dexCount, setDexCount] = useState(0);
  const [customFoods, setCustomFoods] = useState<PresetFood[]>([]);
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

  // 入站时拉一次：待反馈条 / 图鉴解锁数 / 用户常用食物
  useEffect(() => {
    setPending(findPendingVerdict());
    setDexCount(getDex().length);
    setCustomFoods(getCustomFoods().map(customFoodToPresetShape));
  }, []);

  const savedFoodNames = useMemo(
    () => new Set(customFoods.map((f) => f.name)),
    [customFoods],
  );

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
  // showToast 是 useCallback；savedFoodNames / saved.name 不需要进 deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedFoodNames]);

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
      const food = getFoodById(foodId);
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
    // 留在描述 Tab，让用户能继续追加 — describe-pane 自身会显示"已识别"提示
  };

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  }, []);

  const startRoastStream = (prediction: Prediction, items: IntakeItem[], tone: "savage" | "gentle") => {
    const abort = new AbortController();
    const ctx = { prediction, abort, latest: "" };
    roastRef.current = ctx;
    // 同步流到 UI：只有当前 phase.prediction === ctx.prediction 时推进，
    // 用户中途 reset 后引用变化，setState 自动忽略。
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
    // 写入历史 / 图鉴 / 成就（同步本地，纯加法不阻塞 UI）
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
      // localStorage 满 / 隐私模式禁用 → 不影响主流程
      console.warn("[storage] recordCard failed", err);
    }
    // 用流式当前累积值当初始 roast；后续 delta 会通过 setPhase 持续推进
    const initialRoast = roastRef.current?.latest ?? "";
    setPhase({ kind: "result", prediction, roast: initialRoast, achievement });
  }, [phase, intakeList]);

  /** 「随便给我来一份」—— 随机抽 2-3 项预设走完流程，零门槛体验首次出卡 */
  const handleSurprise = () => {
    // 从 main 类挑 1 个，其它类各挑 0-1 个，确保有反差
    const byCategory = (cat: PresetFood["category"]) =>
      PRESET_FOODS.filter((f) => f.category === cat);
    const sample = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
    const picks: PresetFood[] = [
      sample(byCategory("main")),
      sample(byCategory("drink")),
    ];
    if (Math.random() < 0.5) picks.push(sample(byCategory("fruit")));
    const next: Record<string, IntakeItem> = {};
    picks.forEach((f) => {
      const portion = (Math.random() < 0.4 ? "large" : "normal") as PortionLevel;
      next[f.id] = intakeFromPreset(f, portion);
    });
    setIntake(next);
    showToast("已随机来一顿，自动开拉…");
    // 给一帧让 setIntake 落地，再 start
    setTimeout(() => {
      const items = Object.values(next);
      if (items.length === 0) return;
      const settings = getSettings();
      const prediction = predict({
        items,
        bristolBias: settings.calibration.bristolBias,
        volumeBias: settings.calibration.volumeBias,
      });
      const achievement = pickAchievement(prediction, items);
      startRoastStream(prediction, items, settings.tone);
      setPhase({ kind: "animating", prediction, achievement });
    }, 50);
  };

  const handleReset = () => {
    roastRef.current?.abort.abort();
    roastRef.current = null;
    setIntake({});
    setExtraWaterMl(0);
    setTab("quick");
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
                  <span>图鉴 {dexCount > 0 ? `${dexCount}/49` : ""}</span>
                </Link>
                <Link className="icon-btn" href="/history" aria-label="日记">
                  <HistoryIcon size={14} aria-hidden />
                  <span>日记</span>
                </Link>
                <Link className="icon-btn" href="/insights" aria-label="趋势">
                  <BarChart3 size={14} aria-hidden />
                  <span>趋势</span>
                </Link>
                <Link className="icon-btn" href="/settings" aria-label="设置">
                  <SettingsIcon size={14} aria-hidden />
                </Link>
                <button className="icon-btn" type="button" onClick={() => setHelpOpen(true)} aria-label="怎么玩">
                  <CircleHelp size={14} aria-hidden />
                  <span>怎么玩</span>
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
              <p className="hero-sub">输入今日饮食，伪科学算法预测明日拉啥。仅供娱乐。</p>
            </section>

            <div className="tabs" role="tablist" aria-label="输入方式">
              <button
                className="tab"
                data-active={tab === "quick"}
                onClick={() => setTab("quick")}
                role="tab"
                aria-selected={tab === "quick"}
                type="button"
              >
                <ListChecks size={14} aria-hidden /> 快捷选择
              </button>
              <button
                className="tab"
                data-active={tab === "describe"}
                onClick={() => setTab("describe")}
                role="tab"
                aria-selected={tab === "describe"}
                type="button"
              >
                <Pencil size={14} aria-hidden /> 描述一下
              </button>
            </div>

            {tab === "quick" ? (
              <QuickPickPane
                intake={intake}
                onToggle={togglePreset}
                onCyclePortion={cyclePortion}
                customFoods={customFoods}
              />
            ) : (
              <DescribePane onAddParsed={addParsed} />
            )}

            <IntakeList
              items={intakeList}
              onRemove={removeIntake}
              onClear={clearIntake}
              savedFoodNames={savedFoodNames}
              onSaveAsCustom={handleSaveAsCustom}
            />

            <div className="cta-wrap">
              <button
                className="cta"
                type="button"
                onClick={handleStart}
                disabled={intakeList.length === 0}
              >
                {intakeList.length === 0 ? "先选点吃的" : "开 拉"}
              </button>
              {intakeList.length === 0 && (
                <button
                  className="cta-secondary"
                  type="button"
                  onClick={handleSurprise}
                >
                  🎲 随便来一顿，看会拉啥
                </button>
              )}
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
  // 流式给 65s（server 上限 60s，再加 5s 网络余量）
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(65_000)]);
  // warnings & _debug 仅前端用，不送给模型
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
      // SSE 事件以 \n\n 分隔
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
    // abort / network → 兜底（不调 onProgress，让 UI 走"AI 思考中"占位再瞬切到模板）
    return pickRoast(prediction);
  }
}
