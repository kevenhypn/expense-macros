import React from "react";
import { Text, View } from "react-native";
import { calculateFinancials, daysInMonth } from "../../lib/storage";
import { Bill, BudgetConfig, SavingsGoal } from "../../types";
import { formatCurrency } from "../../src/utils/format";

type BudgetPreviewCardProps = {
  monthlyIncome: number;
  startDate: string;
  bills: Bill[];
  savingsGoal: SavingsGoal;
  spareMoneyMode: boolean;
};

export function BudgetPreviewCard({
  monthlyIncome,
  startDate,
  bills,
  savingsGoal,
  spareMoneyMode,
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
    <View className="bg-card border border-border rounded-2xl p-4 gap-3">
      <Text className="text-xs text-gray-400 uppercase tracking-wider">
        {spareMoneyMode ? "Spare budget preview" : "Budget preview"}
      </Text>

      <View className="flex-row justify-between">
        <Text className="text-gray-300">Monthly income</Text>
        <Text className="text-green-500 font-semibold">
          {formatCurrency(monthlyIncome)}
        </Text>
      </View>

      <View className="flex-row justify-between">
        <Text className="text-gray-300">Bills total</Text>
        <Text className="text-white font-semibold">{formatCurrency(billsTotal)}</Text>
      </View>

      <View className="flex-row justify-between">
        <Text className="text-gray-300">Savings</Text>
        <Text className="text-white font-semibold">
          {formatCurrency(savingsAmount)}
        </Text>
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row justify-between">
        <Text className="text-white">
          {spareMoneyMode ? "Spare budget" : "Available to spend"}
        </Text>
        <Text className="text-green-500 font-bold">
          {formatCurrency(availableToSpend)}
        </Text>
      </View>

      <View className="flex-row justify-between">
        <Text className="text-gray-300">
          {spareMoneyMode ? "Estimated daily allowance" : "Estimated daily budget"}
        </Text>
        <Text className="text-white font-semibold">{formatCurrency(dailyBudget)}</Text>
      </View>
    </View>
  );
}
