import React, { useEffect } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GLASS, glassTint } from "../../src/theme/glass";

type LiquidGlassVariant = "card" | "toolbar" | "chip";

type LiquidGlassSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: LiquidGlassVariant;
  interactive?: boolean;
  ambientMotion?: boolean;
  blurEnabled?: boolean;
  scrollY?: SharedValue<number>;
  tintColor?: string;
  sweepTrigger?: number | string;
  accessibilityLabel?: string;
  accessibilityRole?: "button";
  onPress?: () => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
};

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const IOS_BLUR_TINT = "systemThinMaterialDark" as React.ComponentProps<
  typeof BlurView
>["tint"];
const DEFAULT_LIGHT_X = 0.58;
const DEFAULT_LIGHT_Y = 0.18;

const getRadius = (variant: LiquidGlassVariant) => {
  if (variant === "toolbar") return GLASS.rPill;
  if (variant === "chip") return GLASS.rChip;
  return GLASS.rCard;
};

export function LiquidGlassSurface({
  children,
  style,
  contentStyle,
  variant = "card",
  interactive = false,
  ambientMotion = true,
  blurEnabled = true,
  scrollY,
  tintColor,
  sweepTrigger,
  accessibilityLabel,
  accessibilityRole,
  onPress,
  onPressIn,
  onPressOut,
}: LiquidGlassSurfaceProps) {
  const radius = getRadius(variant);
  const isPressable = interactive || !!onPress || !!onPressIn || !!onPressOut;

  const width = useSharedValue(1);
  const height = useSharedValue(1);
  const scale = useSharedValue(1);
  const pressProgress = useSharedValue(0);
  const lightX = useSharedValue(DEFAULT_LIGHT_X);
  const lightY = useSharedValue(DEFAULT_LIGHT_Y);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!ambientMotion) {
      cancelAnimation(drift);
      drift.value = 0.5;
      return;
    }

    drift.value = withRepeat(
      withTiming(1, {
        duration: 6200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(drift);
      drift.value = 0.5;
    };
  }, [ambientMotion, drift]);

  useEffect(() => {
    if (sweepTrigger === undefined) return;
    lightX.value = -0.18;
    lightY.value = 0.22;
    lightX.value = withTiming(1.18, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    lightY.value = withTiming(0.34, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [lightX, lightY, sweepTrigger]);

  const blurValue = useDerivedValue(() => {
    const scrollBoost = scrollY
      ? Math.min(Math.max(scrollY.value, 0), 120) / 120 * GLASS.blurScrollBoost
      : 0;

    return (
      GLASS.blurBase +
      scrollBoost +
      pressProgress.value * (GLASS.blurPressed - GLASS.blurBase)
    );
  });

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: Math.round(blurValue.value),
  }));

  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: GLASS.shadow.shadowOpacity + pressProgress.value * 0.04,
    borderColor: pressProgress.value > 0.5 ? GLASS.borderStrong : GLASS.border,
  }));

  const specularStyle = useAnimatedStyle(() => {
    const bandWidth = Math.max(width.value * 0.72, variant === "chip" ? 88 : 160);
    const bandHeight = Math.max(height.value * 1.45, variant === "chip" ? 110 : 220);
    const driftX = (drift.value - 0.5) * width.value * 0.28;
    const driftY = (0.5 - drift.value) * height.value * 0.16;

    return {
      width: bandWidth,
      height: bandHeight,
      opacity: 0.58 + pressProgress.value * 0.18,
      transform: [
        {
          translateX: lightX.value * width.value - bandWidth / 2 + driftX,
        },
        {
          translateY: lightY.value * height.value - bandHeight / 2 + driftY,
        },
        { rotate: "-18deg" },
      ],
    };
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
    height.value = event.nativeEvent.layout.height;
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (width.value > 0 && height.value > 0) {
      lightX.value = withSpring(event.nativeEvent.locationX / width.value, {
        damping: 18,
        stiffness: 210,
      });
      lightY.value = withSpring(event.nativeEvent.locationY / height.value, {
        damping: 18,
        stiffness: 210,
      });
    }

    scale.value = withSpring(0.98, {
      damping: 18,
      stiffness: 260,
    });
    pressProgress.value = withTiming(1, { duration: 180 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, {
      damping: 18,
      stiffness: 240,
    });
    pressProgress.value = withTiming(0, { duration: 260 });
    lightX.value = withTiming(DEFAULT_LIGHT_X, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
    lightY.value = withTiming(DEFAULT_LIGHT_Y, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
    onPressOut?.(event);
  };

  const overlayColor = tintColor
    ? glassTint(tintColor, variant === "toolbar" ? 0.14 : 0.18)
    : GLASS.surface;
  const fallbackColor =
    tintColor && Platform.OS !== "ios"
      ? glassTint(tintColor, 0.22)
      : GLASS.surfaceStrong;

  const surface = (
    <Animated.View
      onLayout={handleLayout}
      style={[
        styles.surface,
        GLASS.shadow,
        { borderRadius: radius },
        surfaceStyle,
        style,
      ]}
    >
      {Platform.OS === "ios" && blurEnabled ? (
        <AnimatedBlurView
          tint={IOS_BLUR_TINT}
          animatedProps={blurAnimatedProps}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor }]}
        />
      )}

      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.specular, specularStyle]}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.00)",
            "rgba(255,255,255,0.20)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        pointerEvents="none"
        style={[
          styles.topRim,
          {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
        ]}
      />

      <View style={contentStyle}>{children}</View>
    </Animated.View>
  );

  if (!isPressable) {
    return surface;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {surface}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS.border,
    backgroundColor: "transparent",
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  topRim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
});
