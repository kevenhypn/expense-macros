import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  SharedValue,
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GLASS, glassTint } from "../../src/theme/glass";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

type SegmentedItem = {
  key: string;
  label: string;
};

type GlassSegmentedControlProps = {
  items: SegmentedItem[];
  value: string;
  onChange: (value: string) => void;
  tintColor?: string;
  selectedTextColor?: string;
  unselectedTextColor?: string;
  scrollY?: SharedValue<number>;
  size?: "default" | "compact";
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
};

type SegmentLayout = {
  width: number;
  x: number;
};

const AnimatedPressable = createAnimatedComponent(Pressable);

const SEGMENT_HIT_SLOP = {
  top: 6,
  bottom: 6,
  left: 8,
  right: 8,
} as const;
const SELECTION_TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
} as const;
const PRESS_IN_TIMING = { duration: 70 } as const;
const PRESS_OUT_TIMING = { duration: 120 } as const;
const PRESS_SCALE = 0.985;
const PRESS_OPACITY = 0.82;

const SIZE_PRESETS = {
  default: {
    controlHeight: 46,
    controlPad: 4,
    segmentPaddingX: 19,
    segmentMinWidth: 86,
    labelFontSize: 16,
    labelLineHeight: 18,
  },
  compact: {
    controlHeight: 44,
    controlPad: 4,
    segmentPaddingX: 16,
    segmentMinWidth: 76,
    labelFontSize: 15,
    labelLineHeight: 17,
  },
} as const;

type SegmentButtonProps = {
  item: SegmentedItem;
  isSelected: boolean;
  labelColor: string;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  height: number;
  minWidth: number;
  paddingHorizontal: number;
  borderRadius: number;
  labelFontSize: number;
  labelLineHeight: number;
};

function SegmentButton({
  item,
  isSelected,
  labelColor,
  onLayout,
  onPress,
  height,
  minWidth,
  paddingHorizontal,
  borderRadius,
  labelFontSize,
  labelLineHeight,
}: SegmentButtonProps) {
  const pressScale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    opacity: pressOpacity.value,
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(PRESS_SCALE, PRESS_IN_TIMING);
    pressOpacity.value = withTiming(PRESS_OPACITY, PRESS_IN_TIMING);
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, PRESS_OUT_TIMING);
    pressOpacity.value = withTiming(1, PRESS_OUT_TIMING);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      hitSlop={SEGMENT_HIT_SLOP}
      onLayout={onLayout}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.segment,
        pressStyle,
        {
          height,
          minWidth,
          paddingHorizontal,
          borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.segmentLabel,
          {
            color: labelColor,
            fontSize: labelFontSize,
            lineHeight: labelLineHeight,
          },
        ]}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

export function GlassSegmentedControl({
  items,
  value,
  onChange,
  tintColor,
  selectedTextColor = "#f8fafc",
  unselectedTextColor = "rgba(226,232,240,0.58)",
  scrollY,
  size = "default",
  embedded = false,
  style,
}: GlassSegmentedControlProps) {
  const [segmentLayouts, setSegmentLayouts] = useState<
    Record<string, SegmentLayout>
  >({});
  const sizePreset = SIZE_PRESETS[size];
  const controlHeight = sizePreset.controlHeight;
  const controlPad = sizePreset.controlPad;
  const thumbHeight = controlHeight - controlPad * 2;
  const controlRadius = controlHeight / 2;
  const thumbRadius = thumbHeight / 2;

  const thumbX = useSharedValue(0);
  const thumbWidth = useSharedValue(0);
  const shineProgress = useSharedValue(-1);

  useEffect(() => {
    const nextLayout = segmentLayouts[value];
    if (!nextLayout) return;

    thumbX.value = withTiming(nextLayout.x, SELECTION_TIMING);
    thumbWidth.value = withTiming(nextLayout.width, SELECTION_TIMING);

    shineProgress.value = -1;
    shineProgress.value = withTiming(1.2, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [segmentLayouts, thumbWidth, thumbX, value, shineProgress]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: thumbWidth.value,
    transform: [{ translateX: thumbX.value }],
  }));

  const thumbShineStyle = useAnimatedStyle(() => {
    const shineWidth = Math.max(thumbWidth.value * 0.6, 54);

    return {
      width: shineWidth,
      transform: [
        {
          translateX:
            shineProgress.value * (thumbWidth.value + shineWidth) - shineWidth,
        },
        { rotate: "-14deg" },
      ],
    };
  });

  const handleSegmentLayout =
    (key: string) =>
    (event: LayoutChangeEvent) => {
      const { width, x } = event.nativeEvent.layout;
      setSegmentLayouts((prev) =>
        prev[key]?.width === width && prev[key]?.x === x
          ? prev
          : { ...prev, [key]: { width, x } }
      );
    };

  const thumbTint = tintColor
    ? glassTint(tintColor, embedded ? 0.28 : 0.2)
    : GLASS.surfaceStrong;
  const embeddedTrackColor = tintColor
    ? glassTint(tintColor, 0.1)
    : "rgba(255,255,255,0.05)";
  const embeddedTrackBorderColor = tintColor
    ? glassTint(tintColor, 0.2)
    : GLASS.border;

  const segmentedContent = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          thumbStyle,
          {
            top: controlPad,
            bottom: controlPad,
            borderRadius: thumbRadius,
            backgroundColor: thumbTint,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.thumbShine, thumbShineStyle]}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.00)",
              "rgba(255,255,255,0.22)",
              "rgba(255,255,255,0.00)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {items.map((item) => {
        const isSelected = item.key === value;

        return (
          <SegmentButton
            key={item.key}
            item={item}
            isSelected={isSelected}
            labelColor={isSelected ? selectedTextColor : unselectedTextColor}
            onLayout={handleSegmentLayout(item.key)}
            onPress={() => onChange(item.key)}
            height={thumbHeight}
            minWidth={sizePreset.segmentMinWidth}
            paddingHorizontal={sizePreset.segmentPaddingX}
            borderRadius={thumbRadius}
            labelFontSize={sizePreset.labelFontSize}
            labelLineHeight={sizePreset.labelLineHeight}
          />
        );
      })}
    </>
  );

  if (embedded) {
    return (
      <View style={style}>
        <View
          style={[
            styles.embeddedTrack,
            {
              height: controlHeight,
              borderRadius: controlRadius,
              padding: controlPad,
              backgroundColor: embeddedTrackColor,
              borderColor: embeddedTrackBorderColor,
            },
          ]}
        >
          {segmentedContent}
        </View>
      </View>
    );
  }

  return (
    <LiquidGlassSurface
      variant="toolbar"
      tintColor={tintColor}
      scrollY={scrollY}
      style={[
        styles.container,
        {
          height: controlHeight,
          borderRadius: controlRadius,
        },
        style,
      ]}
      contentStyle={[
        styles.content,
        {
          padding: controlPad,
          borderRadius: controlRadius,
        },
      ]}
    >
      {segmentedContent}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
  content: {
    flex: 1,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: {
    position: "absolute",
    left: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.24)",
    overflow: "hidden",
    backgroundColor: GLASS.surfaceStrong,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
  },
  thumbShine: {
    position: "absolute",
    top: -8,
    bottom: -8,
  },
  embeddedTrack: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontWeight: "600",
    includeFontPadding: false,
    textAlign: "center",
  },
});
