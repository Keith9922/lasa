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
};

export function QuickPickPane({ intake, onToggle, onCyclePortion }: Props) {
  return (
    <section className="pane" aria-label="快捷选择">
      <p className="pane-hint">点一下加入摄入，再次点击切换份量。「喝的」会影响形态预测。</p>
      {FOOD_CATEGORIES.map((cat) => {
        const foods = PRESET_FOODS.filter((f) => f.category === cat.key);
        if (foods.length === 0) return null;
        return (
          <div key={cat.key} className="food-category">
            <h4 className="food-category-title">{cat.label}</h4>
            <div className="food-grid">
              {foods.map((food) => {
                const item = intake[food.id];
                const selected = !!item;
                const portion: PortionLevel | undefined = item?.portion;
                return (
                  <button
                    key={food.id}
                    type="button"
                    className="food-card"
                    data-selected={selected}
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
        );
      })}
    </section>
  );
}
