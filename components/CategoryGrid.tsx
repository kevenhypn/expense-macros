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
}

export const CategoryGrid: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <View className="flex-row flex-wrap gap-2 mb-6">
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat;
        const styles = CATEGORY_STYLES[cat];
        const textStyle = isSelected
          ? CATEGORY_TEXT_COLORS[cat].selected
          : CATEGORY_TEXT_COLORS[cat].unselected;

        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            style={{
              width: "23%",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: isSelected
                ? styles.selectedBg
                : styles.unselectedBg,
            }}
          >
            <Text className={`text-xs font-medium ${textStyle}`}>{cat}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};
