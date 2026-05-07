"use client";

import {
  PRESET_FOODS,
  PORTION_MULTIPLIER,
  PORTION_LABEL,
  FOOD_CATEGORIES,
  type PortionLevel,
  type PresetFood,
} from "@/lib/foods";
import type { IntakeItem } from "@/lib/types";

type Props = {
  intake: Record<string, IntakeItem>;
  onToggle: (food: PresetFood) => void;
  onCyclePortion: (foodId: string) => void;
  /** 用户保存的常用食物（同 PresetFood 形状，category="custom"），渲染在最前 */
  customFoods?: PresetFood[];
};

export function QuickPickPane({ intake, onToggle, onCyclePortion, customFoods = [] }: Props) {
  const groups: { key: string; label: string; foods: PresetFood[] }[] = [];
  if (customFoods.length > 0) {
    groups.push({ key: "custom", label: "我的常用", foods: customFoods });
  }
  for (const cat of FOOD_CATEGORIES) {
    const foods = PRESET_FOODS.filter((f) => f.category === cat.key);
    if (foods.length > 0) groups.push({ key: cat.key, label: cat.label, foods });
  }

  return (
    <section className="pane" aria-label="快捷选择">
      <p className="pane-hint">
        点一下加入摄入，再次点击切换份量。
        {customFoods.length === 0 && "用 AI 解析过的食物可以星标存为「常用」，下次直接点。"}
      </p>
      {groups.map((g) => (
        <div key={g.key} className="food-category">
          <h4 className="food-category-title">{g.label}</h4>
          <div className="food-grid">
            {g.foods.map((food) => {
              const item = intake[food.id];
              const selected = !!item;
              const portion: PortionLevel | undefined = item?.portion;
              return (
                <button
                  key={food.id}
                  type="button"
                  className="food-card"
                  data-selected={selected}
                  data-custom={food.category === "custom" ? "true" : undefined}
                  onClick={() => (selected ? onCyclePortion(food.id) : onToggle(food))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (selected) onToggle(food);
                  }}
                  aria-pressed={selected}
                  aria-label={
                    selected && portion ? `${food.name}，份量 ${PORTION_LABEL[portion]}` : food.name
                  }
                >
                  <span className="food-card-emoji" aria-hidden>{food.emoji}</span>
                  <span className="food-card-name">{food.name}</span>
                  {selected && portion && (
                    <span className="food-card-portion">×{PORTION_MULTIPLIER[portion]} · {PORTION_LABEL[portion]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
