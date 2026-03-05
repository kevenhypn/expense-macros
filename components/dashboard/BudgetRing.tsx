import React, { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { formatMoney0 } from "../../src/utils/money";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface BudgetRingProps {
  size?: number;
  strokeWidth?: number;
  budgetTotal: number;
  monthLeft: number;
  labelTop?: string;
  labelBottom?: string;
  centerValue: string;
  centerSubValue?: string;
  isOverBudget?: boolean;
}

export const BudgetRing: React.FC<BudgetRingProps> = ({
  size = 220,
  strokeWidth = 16,
  budgetTotal,
  monthLeft,
  labelTop,
  labelBottom,
  centerValue,
  centerSubValue,
  isOverBudget = false,
}) => {
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  const fillRatio = useMemo(() => {
    if (isOverBudget) return 0;
    if (budgetTotal <= 0) return 0;
    return clamp(monthLeft / budgetTotal, 0, 1);
  }, [budgetTotal, monthLeft, isOverBudget]);

  const progress = useSharedValue(fillRatio);

  useEffect(() => {
    progress.value = withTiming(fillRatio, { duration: 500 });
  }, [fillRatio, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const overAmount = Math.max(-monthLeft, 0);

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#202020"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isOverBudget ? "#ef4444" : "#34d399"}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={animatedProps}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>
        </Svg>
        <View className="absolute inset-0 items-center justify-center px-6">
          {labelTop ? (
            <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              {labelTop}
            </Text>
          ) : null}
          <Text className="text-4xl font-bold text-white mt-2">
            {centerValue}
          </Text>
          {isOverBudget ? (
            <Text className="text-xs text-red-400 mt-1">
              Over by {formatMoney0(overAmount)}
            </Text>
          ) : centerSubValue ? (
            <Text className="text-xs text-gray-400 mt-1 text-center">
              {centerSubValue}
            </Text>
          ) : null}
          {labelBottom ? (
            <Text className="text-xs text-gray-500 mt-3 text-center">
              {labelBottom}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};
