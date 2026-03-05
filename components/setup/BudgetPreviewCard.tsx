import React from "react";
import { Text, View } from "react-native";
import { calculateFinancials, daysInMonth } from "../../lib/storage";
import { Bill, BudgetConfig, SavingsGoal } from "../../types";
import { formatCurrency } from "../../src/utils/format";
import { DEFAULT_BUDGET_THEME } from "../../src/utils/budgetTheme";

type BudgetPreviewCardProps = {
  monthlyIncome: number;
  startDate: string;
  bills: Bill[];
  savingsGoal: SavingsGoal;
  spareMoneyMode: boolean;
  accentGlowColor?: string;
  accentSurfaceColor?: string;
  accentBorderColor?: string;
  accentTextColor?: string;
};

export function BudgetPreviewCard({
  monthlyIncome,
  startDate,
  bills,
  savingsGoal,
  spareMoneyMode,
  accentGlowColor = DEFAULT_BUDGET_THEME.accentGlowStrong,
  accentSurfaceColor = DEFAULT_BUDGET_THEME.accentSurface,
  accentBorderColor = DEFAULT_BUDGET_THEME.accentBorder,
  accentTextColor = DEFAULT_BUDGET_THEME.accentText,
}: BudgetPreviewCardProps) {
  const previewConfig: BudgetConfig = {
    startDate,
    monthlyIncome,
    bills,
    savingsGoal,
    rolloverUnspent: false,
    spareMoneyMode,
  };

  const { billsTotal, savingsAmount, availableToSpend } =
    calculateFinancials(previewConfig);
  const monthDays = daysInMonth(startDate);
  const dailyBudget = monthDays > 0 ? availableToSpend / monthDays : 0;

  return (
    <View className="overflow-hidden rounded-[32px] border border-border bg-card px-5 py-5">
      <View
        className="absolute -right-6 top-0 h-24 w-24 rounded-full"
        style={{ backgroundColor: accentGlowColor }}
      />
      <View className="absolute -left-2 bottom-0 h-20 w-20 rounded-full bg-white/5" />
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {spareMoneyMode ? "Spare budget preview" : "Budget preview"}
      </Text>

      <View className="mt-4 gap-1">
        <Text className="text-sm text-gray-400">
          {spareMoneyMode ? "Projected spare budget" : "Projected available to spend"}
        </Text>
        <Text className="text-4xl font-bold text-white">
          {formatCurrency(availableToSpend)}
        </Text>
        <Text className="text-sm text-gray-400">
          Based on income, fixed bills, and your savings target.
        </Text>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-2">
        <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Income
          </Text>
          <Text
            className="mt-1 text-base font-semibold"
            style={{ color: accentTextColor }}
          >
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Bills
          </Text>
          <Text className="mt-1 text-base font-semibold text-white">
            {formatCurrency(billsTotal)}
          </Text>
        </View>
        <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Savings
          </Text>
          <Text className="mt-1 text-base font-semibold text-white">
            {formatCurrency(savingsAmount)}
          </Text>
        </View>
        <View
          className="rounded-full border px-4 py-3"
          style={{
            borderColor: accentBorderColor,
            backgroundColor: accentSurfaceColor,
          }}
        >
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Daily target
          </Text>
          <Text
            className="mt-1 text-base font-semibold"
            style={{ color: accentTextColor }}
          >
            {formatCurrency(dailyBudget)}
          </Text>
        </View>
      </View>

      <View className="mt-5 rounded-[24px] border border-white/8 bg-white/5 px-4 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-sm text-gray-300">
            {spareMoneyMode ? "Focus mode" : "Full budget mode"}
          </Text>
          <Text className="text-sm font-semibold text-white">
            {spareMoneyMode ? "Discretionary first" : "All flows visible"}
          </Text>
        </View>
      </View>
    </View>
  );
}
