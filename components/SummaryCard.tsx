import React from "react";
import { View, Text } from "react-native";

interface SummaryCardProps {
  title: string;
  mainValue: string;
  mainIsPositive: boolean;
  subValue: string;
  footerText: string;
  children?: React.ReactNode;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  mainValue,
  mainIsPositive,
  subValue,
  footerText,
  children,
}) => {
  return (
    <View className="bg-card border border-border rounded-3xl p-5 flex flex-col gap-2">
      <Text className="text-gray-400 text-sm uppercase tracking-wider font-semibold">
        {title}
      </Text>
      <View className="flex-row justify-between items-baseline">
        <Text
          className={`text-3xl font-bold ${
            mainIsPositive ? "text-green-500" : "text-red-500"
          }`}
        >
          {mainValue}
        </Text>
        <Text className="text-gray-500 text-sm font-medium">{subValue}</Text>
      </View>
      <Text className="text-xs text-gray-500 mt-1">{footerText}</Text>
      {children ? (
        <View className="mt-4 pt-4 border-t border-border gap-3">
          {children}
        </View>
      ) : null}
    </View>
  );
};
