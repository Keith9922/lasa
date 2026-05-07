"use client";

import { Star, Utensils, X } from "lucide-react";
import { PORTION_MULTIPLIER } from "@/lib/foods";
import type { IntakeItem } from "@/lib/types";

type Props = {
  items: IntakeItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  /** 已保存为"常用"的食物名集合 —— 用于隐藏星标按钮 */
  savedFoodNames?: Set<string>;
  /** 把 AI 解析的某项保存为常用；不传则不显示星标 */
  onSaveAsCustom?: (item: IntakeItem) => void;
};

export function IntakeList({ items, onRemove, onClear, savedFoodNames, onSaveAsCustom }: Props) {
  return (
    <section className="intake" aria-label="今日摄入">
      <div className="intake-head">
        <span className="intake-title">
          <Utensils size={14} aria-hidden />
          <span>今日摄入</span>
          {items.length > 0 && (
            <span className="intake-count tabular">{items.length}</span>
          )}
        </span>
        {items.length > 0 && (
          <button className="intake-clear" type="button" onClick={onClear}>
            清空
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="intake-empty">还没加东西，挑几个开始吧。</p>
      ) : (
        <ul className="intake-items">
          {items.map((item) => {
            const canSave =
              !!onSaveAsCustom &&
              item.source === "ai" &&
              !(savedFoodNames?.has(item.name));
            return (
              <li key={item.id} className="intake-item">
                <button
                  className="intake-chip"
                  onClick={() => onRemove(item.id)}
                  title="点击移除"
                  type="button"
                  aria-label={`移除 ${item.name}`}
                >
                  <span aria-hidden>{item.emoji}</span>
                  <span>{item.name}</span>
                  <span className="intake-chip-grams tabular">
                    {item.portion ? `×${PORTION_MULTIPLIER[item.portion]}` : `${item.grams}g`}
                  </span>
                  <X size={12} aria-hidden />
                </button>
                {canSave && (
                  <button
                    className="intake-save"
                    type="button"
                    onClick={() => onSaveAsCustom!(item)}
                    aria-label={`保存「${item.name}」为常用`}
                    title="保存为常用"
                  >
                    <Star size={11} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
