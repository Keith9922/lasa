"use client";

/**
 * 拉啥 · 主页面（v0.2）
 *
 * 状态机：input → animating → result，单页内切换。
 * 详细见 docs/interaction.md / docs/animation.md
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { CircleHelp, ListChecks, Pencil } from "lucide-react";

import { PORTION_LABEL, getFoodById, type PortionLevel, type PresetFood } from "@/lib/foods";
import { intakeFromPreset, intakeFromAi } from "@/lib/intake";
import { predict, type Prediction } from "@/lib/predict";
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

type TabKey = "quick" | "describe";

type Phase =
  | { kind: "input" }
  | { kind: "animating"; prediction: Prediction; roastPromise: Promise<string> }
  | { kind: "result"; prediction: Prediction; roast: string };

const PORTION_CYCLE: PortionLevel[] = ["normal", "large", "huge", "small"];

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("quick");
  const [intake, setIntake] = useState<Record<string, IntakeItem>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const toastTimer = useRef<number | null>(null);

  const intakeList = useMemo(() => Object.values(intake), [intake]);

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

  const addParsed = (foods: ParsedFood[]) => {
    setIntake((prev) => {
      const next = { ...prev };
      foods.forEach((f, i) => {
        const item = intakeFromAi(f, Object.keys(next).length + i);
        next[item.id] = item;
      });
      return next;
    });
    showToast(`已加入 ${foods.length} 项`);
    setTab("quick"); // 切回首屏看摄入
  };

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  }, []);

  const handleStart = () => {
    if (intakeList.length === 0) return;
    const prediction = predict({ items: intakeList });
    const roastPromise = fetchRoast(prediction, intakeList);
    setPhase({ kind: "animating", prediction, roastPromise });
  };

  const handleAnimationComplete = useCallback(async () => {
    if (phase.kind !== "animating") return;
    const roast = await phase.roastPromise;
    setPhase({ kind: "result", prediction: phase.prediction, roast });
  }, [phase]);

  const handleReset = () => {
    setIntake({});
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
              <button className="icon-btn" type="button" onClick={() => setHelpOpen(true)} aria-label="怎么玩">
                <CircleHelp size={14} aria-hidden />
                <span>怎么玩</span>
              </button>
            </header>

            <section className="hero">
              <p className="hero-eyebrow">Today In · Tomorrow Out</p>
              <h1 className="hero-title">今天吃了啥？</h1>
              <p className="hero-sub">告诉我，我猜你明天拉啥。基于一个不太正经但有点道理的伪科学理论。</p>
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
              <QuickPickPane intake={intake} onToggle={togglePreset} onCyclePortion={cyclePortion} />
            ) : (
              <DescribePane onAddParsed={addParsed} />
            )}

            <IntakeList items={intakeList} onRemove={removeIntake} onClear={clearIntake} />

            <div className="cta-wrap">
              <button
                className="cta"
                type="button"
                onClick={handleStart}
                disabled={intakeList.length === 0}
              >
                {intakeList.length === 0 ? "先选点吃的" : "开 拉"}
              </button>
              <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
            </div>
          </>
        ) : (
          <ResultView
            prediction={phase.prediction}
            roast={phase.roast}
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

async function fetchRoast(prediction: Prediction, intake: IntakeItem[]): Promise<string> {
  const summary = intake.map((i) => `${i.name}${i.portion ? `(${PORTION_LABEL[i.portion]})` : `(${i.grams}g)`}`);
  try {
    const res = await fetch("/api/generate-roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prediction: {
          bristol: prediction.bristol,
          bristolLabel: prediction.bristolLabel,
          color: prediction.color,
          colorLabel: prediction.colorLabel,
          greasy: prediction.greasy,
          floats: prediction.floats,
          smell: prediction.smell,
          volume: prediction.volume,
          volumeLabel: prediction.volumeLabel,
          macroRatio: prediction.macroRatio,
          totalMacros: prediction.totalMacros,
          reasons: prediction.reasons,
        },
        intakeSummary: summary,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { roast?: string };
      if (data.roast) return data.roast;
    }
  } catch {
    // 网络问题 → 兜底
  }
  return pickRoast(prediction);
}
