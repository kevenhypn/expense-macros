import React from "react";
import { View, Text, Pressable } from "react-native";
import { TransactionCategory } from "../types";
import { CATEGORY_STYLES, CATEGORY_TEXT_COLORS } from "../lib/categoryStyles";

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
  allowedCategories?: TransactionCategory[];
}

export const CategoryGrid: React.FC<Props> = ({
  selected,
  onSelect,
  allowedCategories,
}) => {
  const categories = allowedCategories ?? CATEGORIES;

  return (
    <View className="mb-2 flex-row flex-wrap gap-3">
      {categories.map((cat) => {
        const isSelected = selected === cat;
        const styles = CATEGORY_STYLES[cat];
        const textStyle = isSelected
          ? CATEGORY_TEXT_COLORS[cat].selected
          : CATEGORY_TEXT_COLORS[cat].badge;

        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            className="rounded-[22px] border px-3 py-4"
            style={{
              width: "31%",
              alignItems: "center",
              backgroundColor: isSelected
                ? styles.selectedBg
                : styles.unselectedBg,
              borderColor: isSelected
                ? styles.selectedBg
                : "rgba(255,255,255,0.08)",
            }}
          >
            <Text className={`text-sm font-semibold ${textStyle}`}>{cat}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};
