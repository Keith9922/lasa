"use client";

/**
 * 食物选择 Modal —— 取代之前的折叠区
 *
 * 改动动机：折叠展开会让首页瞬间变得很长，体验差。改成"按钮触发 → modal 弹出"：
 *  - 主页只剩一个轻量按钮，不抢主入口（描述输入）的视觉权重
 *  - modal 内置搜索框 ("火锅"、"啤酒"快速过滤)
 *  - 我的常用置顶；下面是 主食 / 喝的 / 水果 / 零食 4 组
 *  - 点食物 = 加入摄入；modal 不关闭，可继续多选；右上 × 关闭
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  PRESET_FOODS,
  PORTION_MULTIPLIER,
  PORTION_LABEL,
  FOOD_CATEGORIES,
  type PortionLevel,
  type PresetFood,
} from "@/lib/foods";
import type { IntakeItem } from "@/lib/types";
import { Modal } from "./modal";

type Props = {
  open: boolean;
  onClose: () => void;
  intake: Record<string, IntakeItem>;
  onToggle: (food: PresetFood) => void;
  onCyclePortion: (foodId: string) => void;
  customFoods?: PresetFood[];
};

export function FoodPickerModal({
  open,
  onClose,
  intake,
  onToggle,
  onCyclePortion,
  customFoods = [],
}: Props) {
  const [query, setQuery] = useState("");

  /** 按当前查询过滤；空查询展示所有 */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (f: PresetFood) =>
      !q || f.name.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q));

    const out: { key: string; label: string; foods: PresetFood[] }[] = [];
    if (customFoods.length > 0) {
      const filtered = customFoods.filter(matches);
      if (filtered.length > 0) {
        out.push({ key: "custom", label: "我的常用", foods: filtered });
      }
    }
    for (const cat of FOOD_CATEGORIES) {
      const filtered = PRESET_FOODS.filter((f) => f.category === cat.key && matches(f));
      if (filtered.length > 0) {
        out.push({ key: cat.key, label: cat.label, foods: filtered });
      }
    }
    return out;
  }, [query, customFoods]);

  const selectedCount = Object.keys(intake).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="挑食物加入"
      emoji="📋"
      subtitle={selectedCount > 0 ? `已选 ${selectedCount} 项` : undefined}
    >
      <div className="food-picker-search">
        <Search size={14} aria-hidden />
        <input
          type="text"
          placeholder="搜：火锅 / 啤酒 / 沙拉 …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="搜索食物"
        />
        {query && (
          <button
            type="button"
            className="food-picker-search-clear"
            onClick={() => setQuery("")}
            aria-label="清空搜索"
          >
            ×
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="food-picker-empty">
          没找到「{query}」，换个词试试？或者去描述框里直接说。
        </p>
      ) : (
        groups.map((g) => (
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
                    onClick={() =>
                      selected ? onCyclePortion(food.id) : onToggle(food)
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (selected) onToggle(food);
                    }}
                    aria-pressed={selected}
                    aria-label={
                      selected && portion
                        ? `${food.name}，份量 ${PORTION_LABEL[portion]}，再点切换份量`
                        : food.name
                    }
                  >
                    <span className="food-card-emoji" aria-hidden>{food.emoji}</span>
                    <span className="food-card-name">{food.name}</span>
                    {selected && portion && (
                      <span className="food-card-portion">
                        ×{PORTION_MULTIPLIER[portion]} · {PORTION_LABEL[portion]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}
