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
    <View className="overflow-hidden rounded-[32px] border border-border bg-card px-6 py-6">
      <View className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/10" />
      <View className="absolute bottom-0 left-8 h-16 w-16 rounded-full bg-white/5" />
      <Text className="text-sm font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </Text>
      <View className="mt-4 gap-2">
        <Text
          className={`text-4xl font-bold leading-tight ${
            mainIsPositive ? "text-emerald-200" : "text-orange-200"
          }`}
        >
          {mainValue}
        </Text>
        <Text className="text-sm leading-6 text-gray-300">{subValue}</Text>
      </View>
      <Text className="mt-4 text-sm text-gray-500">{footerText}</Text>
      {children ? (
        <View className="mt-5 gap-3 border-t border-white/8 pt-5">
          {children}
        </View>
      ) : null}
    </View>
  );
};
