import React, { useEffect, useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { formatMoney0 } from "../../src/utils/money";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface BudgetFrameProps {
  width?: number;
  height?: number;
  budgetTotal: number;
  monthLeft: number;
  discretionarySpent: number;
  daysLeftInMonth: number;
  resetLabel: string;
  safeToSpendToday: number;
  remainingToday: number;
}

export const BudgetFrame: React.FC<BudgetFrameProps> = ({
  width,
  height = 160,
  budgetTotal,
  monthLeft,
  discretionarySpent,
  daysLeftInMonth,
  resetLabel,
  safeToSpendToday,
  remainingToday,
}) => {
  const screenWidth = Dimensions.get("window").width;
  const frameWidth = width ?? screenWidth - 48;
  const cornerRadius = 24;
  const horizontalPadding = 20;
  const barHeight = 20;
  const barRadius = 6;
  const barWidth = Math.max(0, frameWidth - horizontalPadding * 2);

  const progressRemaining = useMemo(() => {
    if (budgetTotal <= 0) return 0;
    if (monthLeft < 0) return 0;
    return clamp(monthLeft / budgetTotal, 0, 1);
  }, [budgetTotal, monthLeft]);

  const progress = useSharedValue(progressRemaining);

  useEffect(() => {
    progress.value = withTiming(progressRemaining, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressRemaining, progress]);

  const isOverBudget = monthLeft < 0;
  const overAmount = Math.max(-monthLeft, 0);
  const animatedBarStyle = useAnimatedStyle(() => ({
    width: barWidth * progress.value,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["#f43f5e", "#22c55e"]
    ),
  }));

  return (
    <View className="items-center">
      <View
        className="bg-card border border-border"
        style={{ width: frameWidth, height, borderRadius: cornerRadius }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {isOverBudget
              ? `Over by ${formatMoney0(overAmount)}`
              : "Left this month"}
          </Text>
          <Text
            className={`text-3xl font-bold mt-2 ${
              isOverBudget ? "text-red-400" : "text-white"
            }`}
          >
            {formatMoney0(monthLeft)}
          </Text>
          <Text className="text-xs text-gray-500 mt-1 text-center">
            Spent {formatMoney0(discretionarySpent)} of{" "}
            {formatMoney0(budgetTotal)}
          </Text>
          <Text className="text-xs text-gray-400 mt-2 text-center">
            Safe today: {formatMoney0(safeToSpendToday)} • Remaining today:{" "}
            {formatMoney0(remainingToday)}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-3 text-center">
            {daysLeftInMonth} days left • {resetLabel}
          </Text>
        </View>
        <View
          className="bg-[#151515] overflow-hidden"
          style={{
            height: barHeight,
            marginHorizontal: horizontalPadding,
            marginTop: 4,
            marginBottom: 11,
            borderRadius: barRadius,
          }}
        >
          <Animated.View
            style={[{ height: "100%", borderRadius: barRadius }, animatedBarStyle]}
          />
        </View>
      </View>
    </View>
  );
};
