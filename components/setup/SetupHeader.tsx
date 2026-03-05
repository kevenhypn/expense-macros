import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { StepDots } from "./StepDots";

type SetupHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
};

export function SetupHeader({
  currentStep,
  totalSteps,
  title,
  onBack,
}: SetupHeaderProps) {
  const isFirstStep = currentStep <= 1;

  return (
    <View className="gap-3 pb-4 border-b border-border">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          disabled={isFirstStep}
          className={`w-10 h-10 rounded-xl items-center justify-center border border-border ${
            isFirstStep ? "opacity-40" : "opacity-100"
          }`}
        >
          <ChevronLeft size={18} color="#ffffff" />
        </Pressable>

        <View className="items-end">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">
            Step {currentStep} of {totalSteps}
          </Text>
          <Text className="text-base text-white font-semibold">{title}</Text>
        </View>
      </View>

      <StepDots currentStep={currentStep} totalSteps={totalSteps} />
    </View>
  );
}
