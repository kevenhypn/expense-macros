import React from "react";
import { Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { StepDots } from "./StepDots";
import { DEFAULT_BUDGET_THEME } from "../../src/utils/budgetTheme";
import { GLASS } from "../../src/theme/glass";
import { LiquidGlassSurface } from "../ui/LiquidGlassSurface";
import { LiquidGlassIconButton } from "../ui/LiquidGlassIconButton";

type SetupHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack: () => void;
  allowBackOnFirstStep?: boolean;
  accentGlowColor?: string;
  activeStepColor?: string;
};

export function SetupHeader({
  currentStep,
  totalSteps,
  title,
  onBack,
  allowBackOnFirstStep = false,
  accentGlowColor = DEFAULT_BUDGET_THEME.accentGlowStrong,
  activeStepColor = DEFAULT_BUDGET_THEME.accent,
}: SetupHeaderProps) {
  const isFirstStep = currentStep <= 1;
  const disableBack = isFirstStep && !allowBackOnFirstStep;

  return (
    <LiquidGlassSurface
      variant="card"
      contentStyle={{ paddingHorizontal: GLASS.pad, paddingVertical: GLASS.pad }}
    >
      <View
        className="absolute -right-10 -top-12 h-32 w-32 rounded-full"
        style={{ backgroundColor: accentGlowColor }}
      />
      <View className="absolute bottom-0 left-10 h-20 w-20 rounded-full bg-white/5" />
      <View className="flex-row items-center justify-between gap-4">
        <LiquidGlassIconButton
          icon={<ChevronLeft size={18} color="#ffffff" />}
          onPress={disableBack ? undefined : onBack}
          size={44}
          style={{ opacity: disableBack ? 0.4 : 1 }}
        />

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
    </LiquidGlassSurface>
  );
}
