import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { SharedValue } from "react-native-reanimated";
import { GLASS } from "../../src/theme/glass";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

type LiquidGlassChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  tintColor?: string;
  scrollY?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function LiquidGlassChip({
  label,
  onPress,
  selected = false,
  tintColor,
  scrollY,
  style,
  textStyle,
}: LiquidGlassChipProps) {
  return (
    <LiquidGlassSurface
      variant="chip"
      interactive
      onPress={onPress}
      tintColor={tintColor}
      scrollY={scrollY}
      style={[
        styles.chip,
        selected ? styles.selectedChip : styles.unselectedChip,
        style,
      ]}
      contentStyle={styles.content}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : null, textStyle]}>
        {label}
      </Text>
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 42,
  },
  selectedChip: {
    borderColor: GLASS.borderStrong,
  },
  unselectedChip: {
    borderColor: GLASS.border,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: "#ffffff",
  },
});
