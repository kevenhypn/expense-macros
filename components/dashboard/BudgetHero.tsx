import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { clamp, getBudgetTheme } from "../../src/utils/budgetTheme";
import { formatMoney0 } from "../../src/utils/money";
import {
  BATTERY_TOTAL_HEIGHT,
  BATTERY_WIDTH,
  BatteryMeter,
} from "./BatteryMeter";

interface BudgetHeroProps {
  budgetTotal: number;
  monthLeft: number;
  discretionarySpent: number;
  daysLeftInMonth: number;
  resetLabel: string;
}

const PAD = 18;
const R = 28;
const GAP = 12;
const INNER_RADIUS = 18;
const RIGHT_COLUMN_WIDTH = BATTERY_WIDTH + 34;
const MUTED_TEXT = "#9ca3af";

export const BudgetHero: React.FC<BudgetHeroProps> = ({
  budgetTotal,
  monthLeft,
  discretionarySpent,
  daysLeftInMonth,
  resetLabel,
}) => {
  const isOverBudget = monthLeft < 0;
  const overAmount = Math.max(-monthLeft, 0);
  const suggestedDailyAmount =
    daysLeftInMonth > 0 ? monthLeft / daysLeftInMonth : monthLeft;
  const remainingRatio =
    budgetTotal > 0 && !isOverBudget
      ? clamp(monthLeft / budgetTotal, 0, 1)
      : 0;
  const budgetTheme = getBudgetTheme(remainingRatio);
  const meterLabel = `${Math.round(remainingRatio * 100)}%`;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.heroGlowPrimary,
          { backgroundColor: budgetTheme.accentGlowStrong },
        ]}
      />
      <View
        style={[
          styles.heroGlowSecondary,
          { backgroundColor: budgetTheme.accentGlowSoft },
        ]}
      />

      <View style={styles.topRow}>
        <View style={styles.leftColumn}>
          <Text style={styles.eyebrow}>Left this month</Text>
          <Text
            style={[
              styles.amount,
              isOverBudget ? { color: budgetTheme.accentText } : undefined,
            ]}
          >
            {isOverBudget
              ? `Over by ${formatMoney0(overAmount)}`
              : formatMoney0(monthLeft)}
          </Text>
          <Text style={styles.spentLine}>
            Spent {formatMoney0(discretionarySpent)} of {formatMoney0(budgetTotal)}
          </Text>

          <View
            style={[
              styles.paceCard,
              {
                borderColor: budgetTheme.accentBorder,
                backgroundColor: budgetTheme.accentSurface,
              },
            ]}
          >
            <Text style={styles.paceLabel}>Suggested pace</Text>
            <Text
              style={[
                styles.paceText,
                isOverBudget ? { color: budgetTheme.accentText } : undefined,
              ]}
            >
              {isOverBudget
                ? `You are behind by about ${formatMoney0(
                    Math.abs(suggestedDailyAmount)
                  )} a day for the rest of the month.`
                : `That leaves about ${formatMoney0(
                    suggestedDailyAmount
                  )} a day for the rest of the month.`}
            </Text>
          </View>
        </View>

        <View style={styles.rightColumn}>
          <BatteryMeter budgetTotal={budgetTotal} monthLeft={monthLeft} />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.footerText}>
          {daysLeftInMonth} days left • {resetLabel}
        </Text>
        <Text style={[styles.percentText, { color: budgetTheme.accentText }]}>
          {meterLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    padding: PAD,
    borderRadius: R,
    borderWidth: 1,
    borderColor: "#2b382f",
    backgroundColor: "#151d18",
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -68,
    right: -54,
    width: 144,
    height: 144,
    borderRadius: 999,
  },
  heroGlowSecondary: {
    position: "absolute",
    left: -24,
    bottom: -32,
    width: 112,
    height: 112,
    borderRadius: 999,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: BATTERY_TOTAL_HEIGHT,
  },
  leftColumn: {
    flex: 1,
    paddingRight: GAP,
  },
  rightColumn: {
    width: RIGHT_COLUMN_WIDTH,
    alignItems: "center",
  },
  eyebrow: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  amount: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "700",
  },
  spentLine: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  paceCard: {
    width: "100%",
    marginTop: GAP,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: INNER_RADIUS,
    borderWidth: 1,
  },
  paceLabel: {
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  paceText: {
    marginTop: 6,
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  bottomRow: {
    marginTop: GAP,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  footerText: {
    flex: 1,
    color: MUTED_TEXT,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: GAP,
  },
  percentText: {
    width: RIGHT_COLUMN_WIDTH,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
