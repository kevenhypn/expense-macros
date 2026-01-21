import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";

interface AmountToggleProps {
  amount: string;
  setAmount: (val: string) => void;
  isIncome: boolean;
  setIsIncome: (val: boolean) => void;
}

export const AmountToggle: React.FC<AmountToggleProps> = ({
  amount,
  setAmount,
  isIncome,
  setIsIncome,
}) => {
  return (
    <View className="flex-row gap-4 items-stretch h-16 mb-6">
      <View className="flex-1 bg-borderAlt rounded-2xl flex-row items-center px-4 border border-border">
        <Text className="text-gray-400 text-xl mr-2">$</Text>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#6b7280"
          className="flex-1 text-3xl font-bold text-white"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <Pressable
        onPress={() => setIsIncome(!isIncome)}
        className={`w-16 h-16 rounded-2xl items-center justify-center border-2 ${
          isIncome
            ? "border-green-500/50 bg-green-900/10"
            : "border-red-500/50 bg-red-900/10"
        }`}
      >
        <Text
          className={`font-bold text-sm ${
            isIncome ? "text-green-400" : "text-red-400"
          }`}
        >
          {isIncome ? "IN" : "OUT"}
        </Text>
      </Pressable>
    </View>
  );
};
