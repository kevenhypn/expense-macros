import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pencil, Trash2 } from "lucide-react-native";
import { Transaction } from "../../types";
import { CATEGORY_STYLES } from "../../lib/categoryStyles";
import { formatMoney2 } from "../../src/utils/money";

type TransactionRowProps = {
  tx: Transaction;
  accentTextColor: string;
  showActions?: boolean;
  isDeleting?: boolean;
  systemOpacityClassName?: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
};

export const TRANSACTION_ROW_DELETE_DURATION = 180;

const ROW_LAYOUT = LinearTransition.duration(160).easing(
  Easing.out(Easing.cubic)
);

export const TransactionRow = React.memo(function TransactionRow({
  tx,
  accentTextColor,
  showActions = false,
  isDeleting = false,
  systemOpacityClassName = "opacity-60",
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isDeleting) {
      translateX.value = 0;
      opacity.value = 1;
      scale.value = 1;
      return;
    }

    translateX.value = withTiming(36, {
      duration: TRANSACTION_ROW_DELETE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: TRANSACTION_ROW_DELETE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(0.98, {
      duration: TRANSACTION_ROW_DELETE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [isDeleting, opacity, scale, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ] as const,
  }));

  return (
    <Animated.View
      layout={ROW_LAYOUT}
      style={animatedStyle}
      className={`rounded-[18px] border border-border bg-cardAlt flex-row items-center gap-3 overflow-hidden ${
        tx.isSystem ? systemOpacityClassName : "opacity-100"
      }`}
    >
      <View
        style={{
          width: 6,
          alignSelf: "stretch",
          backgroundColor: CATEGORY_STYLES[tx.category].selectedBg,
        }}
      />
      <View className="flex-1 flex-row items-center justify-between gap-3 px-2 py-3">
        <View className="min-w-0 flex-1">
          {tx.note ? (
            <>
              <Text className="font-medium text-white">{tx.note}</Text>
              <Text className="text-xs text-gray-500">
                {tx.category} • {tx.date} {tx.isSystem && "(Auto)"}
              </Text>
            </>
          ) : (
            <>
              <Text className="font-medium text-white">{tx.category}</Text>
              <Text className="text-xs text-gray-500">
                {tx.category} • {tx.date} {tx.isSystem && "(Auto)"}
              </Text>
            </>
          )}
        </View>

        <View className="shrink-0 flex-row items-center gap-2">
          <Text
            className={`text-base font-semibold ${
              tx.amount > 0 ? "" : "text-white"
            }`}
            style={tx.amount > 0 ? { color: accentTextColor } : undefined}
          >
            {formatMoney2(tx.amount)}
          </Text>

          {showActions ? (
            <>
              <Pressable
                disabled={isDeleting}
                onPress={() => onEdit?.(tx)}
                className="rounded-[12px] bg-white/5 p-2"
                style={isDeleting ? styles.disabledAction : undefined}
              >
                <Pencil size={18} color="#6b7280" />
              </Pressable>
              <Pressable
                disabled={isDeleting}
                onPress={() => onDelete?.(tx.id)}
                className="rounded-[12px] bg-white/5 p-2"
                style={isDeleting ? styles.disabledAction : undefined}
              >
                <Trash2 size={18} color="#6b7280" />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  disabledAction: {
    opacity: 0.5,
  },
});
