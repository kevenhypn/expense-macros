import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { StepDots } from "./StepDots";
import { DEFAULT_BUDGET_THEME } from "../../src/utils/budgetTheme";

type SetupHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
  accentGlowColor?: string;
  activeStepColor?: string;
};

export function SetupHeader({
  currentStep,
  totalSteps,
  title,
  onBack,
  accentGlowColor = DEFAULT_BUDGET_THEME.accentGlowStrong,
  activeStepColor = DEFAULT_BUDGET_THEME.accent,
}: SetupHeaderProps) {
  const isFirstStep = currentStep <= 1;

  return (
    <View className="overflow-hidden rounded-[30px] border border-border bg-card px-5 py-5">
      <View
        className="absolute -right-10 -top-12 h-32 w-32 rounded-full"
        style={{ backgroundColor: accentGlowColor }}
      />
      <View className="absolute bottom-0 left-10 h-20 w-20 rounded-full bg-white/5" />
      <View className="flex-row items-center justify-between gap-4">
        <Pressable
          onPress={onBack}
          disabled={isFirstStep}
          className={`h-11 w-11 rounded-2xl items-center justify-center border border-white/10 bg-white/5 ${
            isFirstStep ? "opacity-40" : "opacity-100"
          }`}
        >
          <ChevronLeft size={18} color="#ffffff" />
        </Pressable>

        <View className="min-w-0 flex-1 items-end gap-2">
          <Text className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-300">
            Step {currentStep} of {totalSteps}
          </Text>
          <Text className="text-right text-2xl font-bold text-white">
            {title}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-sm leading-6 text-gray-400">
        Build a cleaner monthly plan with a few quick decisions.
      </Text>

      <View className="mt-5">
        <StepDots
          currentStep={currentStep}
          totalSteps={totalSteps}
          activeColor={activeStepColor}
        />
      </View>
    </View>
  );
}
