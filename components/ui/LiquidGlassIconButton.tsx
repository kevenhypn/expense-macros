import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { SharedValue } from "react-native-reanimated";
import { GLASS } from "../../src/theme/glass";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

type LiquidGlassIconButtonProps = {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  scrollY?: SharedValue<number>;
  accessibilityLabel?: string;
};

export function LiquidGlassIconButton({
  icon,
  onPress,
  size = 48,
  style,
  tintColor,
  scrollY,
  accessibilityLabel,
}: LiquidGlassIconButtonProps) {
  return (
    <LiquidGlassSurface
      variant="toolbar"
      interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      tintColor={tintColor}
      scrollY={scrollY}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      contentStyle={styles.content}
    >
      {icon}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: GLASS.gap,
  },
});
