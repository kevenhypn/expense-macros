import React from "react";
import { View } from "react-native";
import { DEFAULT_BUDGET_THEME } from "../../src/utils/budgetTheme";

type StepDotsProps = {
  currentStep: number;
  totalSteps: number;
  activeColor?: string;
};

export function StepDots({
  currentStep,
  totalSteps,
  activeColor = DEFAULT_BUDGET_THEME.accent,
}: StepDotsProps) {
  return (
    <View className="flex-row gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber <= currentStep;

        return (
          <View
            key={stepNumber}
            className={`h-2.5 rounded-full ${
              isActive ? "flex-[1.4]" : "flex-1 bg-white/8"
            }`}
            style={isActive ? { backgroundColor: activeColor } : undefined}
          />
        );
      })}
    </View>
  );
}
