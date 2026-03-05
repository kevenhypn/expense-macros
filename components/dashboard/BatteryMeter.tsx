import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { clamp, getBudgetTheme } from "../../src/utils/budgetTheme";

interface BatteryMeterProps {
  budgetTotal: number;
  monthLeft: number;
}

const CARD_BACKGROUND = "#151d18";
const OUTLINE_WIDTH = 2;
const INSET = 10;
const OUTER_RADIUS = 26;
const INNER_RADIUS = OUTER_RADIUS - INSET;
const CAP_HEIGHT = 10;
const CAP_GAP = 4;

export const BATTERY_WIDTH = 92;
export const BATTERY_BODY_HEIGHT = 156;
export const BATTERY_TOTAL_HEIGHT =
  BATTERY_BODY_HEIGHT + CAP_HEIGHT + CAP_GAP;

const CAP_WIDTH = Math.round(BATTERY_WIDTH * 0.38);
const INNER_TRACK_HEIGHT = BATTERY_BODY_HEIGHT - INSET * 2;

export const BatteryMeter: React.FC<BatteryMeterProps> = ({
  budgetTotal,
  monthLeft,
}) => {
  const isOverBudget = monthLeft < 0;
  const remainingRatio = useMemo(() => {
    if (budgetTotal <= 0 || isOverBudget) return 0;
    return clamp(monthLeft / budgetTotal, 0, 1);
  }, [budgetTotal, isOverBudget, monthLeft]);

  const budgetTheme = useMemo(
    () => getBudgetTheme(remainingRatio),
    [remainingRatio]
  );
  const targetFillHeight = useMemo(
    () => Math.round(remainingRatio * INNER_TRACK_HEIGHT),
    [remainingRatio]
  );
  const fillTopRadius =
    remainingRatio > 0.98
      ? INNER_RADIUS
      : Math.min(8, Math.max(0, targetFillHeight));

  const fillHeight = useSharedValue(targetFillHeight);

  useEffect(() => {
    fillHeight.value = withTiming(targetFillHeight, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [fillHeight, targetFillHeight]);

  const fillStyle = useAnimatedStyle(() => ({
    height: fillHeight.value,
    backgroundColor: budgetTheme.accent,
    borderTopLeftRadius: fillTopRadius,
    borderTopRightRadius: fillTopRadius,
    borderBottomLeftRadius: INNER_RADIUS,
    borderBottomRightRadius: INNER_RADIUS,
  }));

  const outlineColor = budgetTheme.accentBorderStrong;
  const bodyBackground = isOverBudget
    ? "rgba(42, 18, 18, 0.18)"
    : budgetTheme.accentSurface;
  const trackBackground = isOverBudget
    ? "rgba(248, 113, 113, 0.08)"
    : budgetTheme.accentGlowSoft;
  const trackStrokeColor = isOverBudget
    ? "rgba(248, 113, 113, 0.18)"
    : budgetTheme.accentBorder;
  const fillHighlightColor = isOverBudget
    ? "rgba(255, 255, 255, 0.06)"
    : budgetTheme.accentText;

  return (
    <View style={styles.container}>
      <View style={styles.capSlot}>
        <View
          style={[
            styles.cap,
            {
              borderColor: outlineColor,
              backgroundColor: CARD_BACKGROUND,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.body,
          {
            borderColor: outlineColor,
            backgroundColor: bodyBackground,
          },
        ]}
      >
        <View
          style={[
            styles.track,
            {
              backgroundColor: trackBackground,
              borderColor: trackStrokeColor,
            },
          ]}
        >
          <Animated.View style={[styles.fill, fillStyle]}>
            <View
              style={[
                styles.fillHighlight,
                { backgroundColor: fillHighlightColor },
              ]}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: BATTERY_WIDTH,
    height: BATTERY_TOTAL_HEIGHT,
  },
  capSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    height: CAP_HEIGHT,
  },
  cap: {
    width: CAP_WIDTH,
    height: CAP_HEIGHT,
    borderRadius: CAP_HEIGHT / 2,
    borderWidth: OUTLINE_WIDTH,
  },
  body: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BATTERY_BODY_HEIGHT,
    borderWidth: OUTLINE_WIDTH,
    borderRadius: OUTER_RADIUS,
    overflow: "hidden",
  },
  track: {
    position: "absolute",
    left: INSET,
    right: INSET,
    top: INSET,
    bottom: INSET,
    borderRadius: INNER_RADIUS,
    borderWidth: 1,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  fillHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "32%",
    opacity: 0.08,
  },
});
