"use client";

import { Utensils, X } from "lucide-react";
import { PORTION_MULTIPLIER } from "@/lib/foods";
import type { IntakeItem } from "@/lib/types";

type Props = {
  items: IntakeItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function IntakeList({ items, onRemove, onClear }: Props) {
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
          {items.map((item) => (
            <li key={item.id}>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
