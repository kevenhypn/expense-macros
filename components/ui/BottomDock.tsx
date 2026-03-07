import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GLASS, glassTint } from "../../src/theme/glass";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

type BottomDockItem = {
  key: string;
  label: string;
};

type BottomDockProps = {
  items: BottomDockItem[];
  value: string;
  onChange: (value: string) => void;
  onAddPress: () => void;
  tintColor?: string;
  scrollY?: SharedValue<number>;
  bottomOffset: number;
};

type DockPillButtonProps = {
  label: string;
  onPress: () => void;
  tintColor?: string;
  selected?: boolean;
};

const DOCK_HEIGHT = 56;
const DOCK_RADIUS = 28;
const DOCK_PAD = 6;
const DOCK_GAP = 8;
const BUTTON_HEIGHT = 44;
const BUTTON_RADIUS = BUTTON_HEIGHT / 2;
const BUTTON_WIDTH = 92;
const DOCK_WIDTH = BUTTON_WIDTH * 3 + DOCK_GAP * 2 + DOCK_PAD * 2;
const PRESS_IN_TIMING = { duration: 110 } as const;
const PRESS_OUT_TIMING = { duration: 140 } as const;

function DockPillButton({
  label,
  onPress,
  tintColor,
  selected = false,
}: DockPillButtonProps) {
  const pressScale = useSharedValue(1);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.96, PRESS_IN_TIMING);
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, PRESS_OUT_TIMING);
  };

  const backgroundColor = tintColor
    ? glassTint(tintColor, selected ? 0.16 : 0.11)
    : selected
      ? GLASS.surfaceStrong
      : GLASS.surface;
  const borderColor = selected ? GLASS.borderStrong : GLASS.border;
  const labelColor = selected ? "#f8fafc" : "rgba(226,232,240,0.72)";

  return (
    <Animated.View style={animatedPressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.fill}
      >
        <View
          style={[
            styles.pillButton,
            {
              backgroundColor,
              borderColor,
            },
          ]}
        >
          <View style={styles.pillInner}>
            <Text style={[styles.pillLabel, { color: labelColor }]}>{label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BottomDock({
  items,
  value,
  onChange,
  onAddPress,
  tintColor,
  scrollY,
  bottomOffset,
}: BottomDockProps) {
  const todayItem = items[0] ?? { key: "day", label: "Today" };
  const monthItem = items[1] ?? { key: "period", label: "Month" };
  const isDaySelected = value === todayItem.key;
  const isMonthSelected = value === monthItem.key;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <LiquidGlassSurface
        variant="card"
        tintColor={tintColor}
        ambientMotion={false}
        scrollY={scrollY}
        style={styles.dock}
        contentStyle={styles.dockContent}
      >
        <View style={styles.zone}>
          <DockPillButton
            label="Add"
            onPress={onAddPress}
            tintColor={tintColor}
          />
        </View>

        <View style={styles.zone}>
          <DockPillButton
            label={todayItem.label}
            onPress={() => onChange(todayItem.key)}
            tintColor={tintColor}
            selected={isDaySelected}
          />
        </View>

        <View style={styles.zone}>
          <DockPillButton
            label={monthItem.label}
            onPress={() => onChange(monthItem.key)}
            tintColor={tintColor}
            selected={isMonthSelected}
          />
        </View>
      </LiquidGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
  },
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  dock: {
    width: DOCK_WIDTH,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_RADIUS,
  },
  dockContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: DOCK_GAP,
    padding: DOCK_PAD,
  },
  zone: {
    width: BUTTON_WIDTH,
  },
  pillButton: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pillInner: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  pillLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    includeFontPadding: false,
  },
});
