import React from "react";
import { View } from "react-native";

type StepDotsProps = {
  currentStep: number;
  totalSteps: number;
};

export function StepDots({ currentStep, totalSteps }: StepDotsProps) {
  return (
    <View className="flex-row gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber <= currentStep;

        return (
          <View
            key={stepNumber}
            className={`h-2 flex-1 rounded-full ${
              isActive ? "bg-green-600" : "bg-borderAlt"
            }`}
          />
        );
      })}
    </View>
  );
}
