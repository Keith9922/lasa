"use client";

/**
 * 拉啥 · 首屏（v0.1）
 *
 * 实现 docs/interaction.md 屏 1：双 Tab 输入 + 今日摄入 + 开拉 CTA
 * 当前未接 AI 解析与出卡动效（下一步），点击"开拉"会弹一个临时提示
 */

import { useMemo, useState } from "react";
import {
  PRESET_FOODS,
  PORTION_LABEL,
  PORTION_MULTIPLIER,
  type PortionLevel,
  type PresetFood,
} from "@/lib/foods";
import type { IntakeItem } from "@/lib/types";

type TabKey = "quick" | "describe";

const PORTION_CYCLE: PortionLevel[] = ["normal", "large", "huge", "small"];

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("quick");
  const [intake, setIntake] = useState<Record<string, IntakeItem>>({});
  const [describeText, setDescribeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<IntakeItem[] | null>(null);

  const intakeList = useMemo(() => Object.values(intake), [intake]);
  const intakeCount = intakeList.length;

  const togglePresetFood = (food: PresetFood) => {
    setIntake((prev) => {
      const next = { ...prev };
      if (next[food.id]) {
        delete next[food.id];
      } else {
        next[food.id] = makeIntakeFromPreset(food, "normal");
      }
      return next;
    });
  };

  const cyclePortion = (foodId: string) => {
    setIntake((prev) => {
      const item = prev[foodId];
      if (!item || item.source !== "preset" || !item.portion) return prev;
      const food = PRESET_FOODS.find((f) => f.id === foodId);
      if (!food) return prev;
      const idx = PORTION_CYCLE.indexOf(item.portion);
      const nextLevel = PORTION_CYCLE[(idx + 1) % PORTION_CYCLE.length];
      return { ...prev, [foodId]: makeIntakeFromPreset(food, nextLevel) };
    });
  };

  const clearIntake = () => {
    if (intakeCount === 0) return;
    if (confirm("清空今日摄入吗？")) setIntake({});
  };

  const removeIntake = (id: string) => {
    setIntake((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 临时假解析（等下一步接 AI）
  const fakeParse = () => {
    if (!describeText.trim()) return;
    setIsParsing(true);
    setParsedItems(null);
    setTimeout(() => {
      // 假数据示例
      const fake: IntakeItem[] = [
        makeIntakeFromAi("ai-1", "🥩", "肥牛", 400),
        makeIntakeFromAi("ai-2", "🐑", "羊肉", 200),
        makeIntakeFromAi("ai-3", "🥬", "青菜", 150),
        makeIntakeFromAi("ai-4", "🥤", "可乐", 330),
      ];
      setParsedItems(fake);
      setIsParsing(false);
    }, 800);
  };

  const acceptParsed = () => {
    if (!parsedItems) return;
    setIntake((prev) => {
      const next = { ...prev };
      for (const item of parsedItems) next[item.id] = item;
      return next;
    });
    setParsedItems(null);
    setDescribeText("");
  };

  const handleStart = () => {
    if (intakeCount === 0) return;
    alert(`📋 已摄入 ${intakeCount} 项\n\n（下一步：接 AI + 出卡动效）`);
  };

  return (
    <main className="app-container">
      <header className="brand-bar">
        <div className="brand-logo">
          <span className="brand-logo-emoji">💩</span>
          <span>拉啥</span>
        </div>
        <button className="help-btn" type="button">？怎么玩</button>
      </header>

      <div className="hero">
        <h1>今天吃了啥？</h1>
        <p>告诉我，我猜你明天拉啥 🔮</p>
      </div>

      {/* Tabs */}
      <div className="tab-pill" role="tablist">
        <button
          className="tab-pill-btn"
          data-active={tab === "quick"}
          onClick={() => setTab("quick")}
          role="tab"
          aria-selected={tab === "quick"}
          type="button"
        >
          🍱 快捷选择
        </button>
        <button
          className="tab-pill-btn"
          data-active={tab === "describe"}
          onClick={() => setTab("describe")}
          role="tab"
          aria-selected={tab === "describe"}
          type="button"
        >
          ✍️ 描述一下
        </button>
      </div>

      {/* Tab: 快捷选择 */}
      {tab === "quick" && (
        <section className="pane">
          <p className="pane-hint">点一下加进今日摄入；选中后再点切换份量</p>
          <div className="food-grid">
            {PRESET_FOODS.map((food) => {
              const item = intake[food.id];
              const selected = !!item;
              return (
                <button
                  key={food.id}
                  className="food-card"
                  data-selected={selected}
                  type="button"
                  onClick={() => (selected ? cyclePortion(food.id) : togglePresetFood(food))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (selected) togglePresetFood(food); // 长按等右键 = 移除
                  }}
                >
                  <span className="food-emoji">{food.emoji}</span>
                  <span className="food-name">{food.name}</span>
                  {selected && item.portion && (
                    <span className="food-portion">×{PORTION_MULTIPLIER[item.portion]} {PORTION_LABEL[item.portion]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab: 描述一下 */}
      {tab === "describe" && (
        <section className="pane">
          <p className="pane-hint">越详细越准。可以写菜名、份量、做法</p>
          <textarea
            className="describe-textarea"
            placeholder="例如：中午吃火锅吃了两盘羊肉、一盘青菜，是清汤锅，喝了两杯啤酒……"
            value={describeText}
            onChange={(e) => setDescribeText(e.target.value)}
            rows={6}
          />
          <button
            className="btn-accent"
            type="button"
            onClick={fakeParse}
            disabled={!describeText.trim() || isParsing}
          >
            {isParsing ? "✨ AI 解析中…" : "✨ AI 解析"}
          </button>

          {parsedItems && (
            <div className="parsed-card">
              <div className="parsed-card-header">
                <span>解析结果（点击确认加入）</span>
                <span className="ai-badge">AI 估算</span>
              </div>
              <ul className="parsed-list">
                {parsedItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.emoji} {item.name}</span>
                    <span>{item.grams}g</span>
                  </li>
                ))}
              </ul>
              <div className="parsed-actions">
                <button className="btn-ghost" type="button" onClick={() => setParsedItems(null)}>
                  取消
                </button>
                <button className="btn-primary-sm" type="button" onClick={acceptParsed}>
                  全部加入
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 今日摄入（共享，跨 Tab 常驻） */}
      <section className="intake-list" aria-label="今日摄入">
        <div className="intake-list-header">
          <span className="intake-list-title">
            🍴 今日摄入 · 已加 {intakeCount} 项
          </span>
          {intakeCount > 0 && (
            <button className="intake-list-clear" type="button" onClick={clearIntake}>
              清空
            </button>
          )}
        </div>
        {intakeCount === 0 ? (
          <p className="intake-list-empty">还没加东西～挑几个开始吧</p>
        ) : (
          <ul className="intake-list-items">
            {intakeList.map((item) => (
              <li key={item.id}>
                <button
                  className="intake-chip"
                  onClick={() => removeIntake(item.id)}
                  title="点击移除"
                  type="button"
                >
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                  <span className="intake-chip-grams">
                    {item.portion ? `×${PORTION_MULTIPLIER[item.portion]}` : `${item.grams}g`}
                  </span>
                  <span className="intake-chip-x">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 主 CTA */}
      <button
        className="cta-start"
        type="button"
        onClick={handleStart}
        disabled={intakeCount === 0}
      >
        💩 开 拉 ！
      </button>

      <p className="disclaimer">仅供娱乐 · 不构成医学建议</p>
    </main>
  );
}

// ---- helpers ----

function makeIntakeFromPreset(food: PresetFood, portion: PortionLevel): IntakeItem {
  const m = PORTION_MULTIPLIER[portion];
  return {
    id: food.id,
    emoji: food.emoji,
    name: food.name,
    grams: Math.round(food.base.grams * m),
    source: "preset",
    portion,
    macros: {
      kcal: Math.round(food.base.kcal * m),
      carbs: Math.round(food.base.carbs * m),
      fiber: Math.round(food.base.fiber * m),
      protein: Math.round(food.base.protein * m),
      fat: Math.round(food.base.fat * m),
    },
  };
}

function makeIntakeFromAi(id: string, emoji: string, name: string, grams: number): IntakeItem {
  // 临时占位，等下一步真的接 AI 时由 server 给出真实 macros
  return {
    id,
    emoji,
    name,
    grams,
    source: "ai",
    macros: { kcal: 0, carbs: 0, fiber: 0, protein: 0, fat: 0 },
  };
}
