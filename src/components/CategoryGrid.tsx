import React from "react";
import { TransactionCategory } from "../types";
import { CATEGORY_STYLES } from "../lib/categoryStyles";

const CATEGORIES: TransactionCategory[] = [
  "Food",
  "Bills",
  "Savings",
  "Shopping",
  "Transport",
  "Entertainment",
  "Income",
  "Other",
];

interface Props {
  selected: TransactionCategory;
  onSelect: (c: TransactionCategory) => void;
}

export const CategoryGrid: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {CATEGORIES.map((cat) => {
        const style = CATEGORY_STYLES[cat];
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`py-3 rounded-xl text-xs font-medium transition-all ${
              selected === cat ? style.selected : style.unselected
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
