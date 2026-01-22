import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Trash2, Plus, ArrowRight } from "lucide-react-native";
import { Bill, BudgetConfig, SavingsGoal } from "../../types";
import {
  getTodayISO,
  saveConfig,
  regenerateSystemTransactions,
  generateId,
} from "../../lib/storage";

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form State
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [startDate, setStartDate] = useState(getTodayISO());
  const [bills, setBills] = useState<Bill[]>([
    { id: "1", name: "Rent", amount: 0 },
    { id: "2", name: "Phone", amount: 0 },
    { id: "3", name: "Car Payment", amount: 0 },
  ]);
  const [savingsMode, setSavingsMode] = useState<"percent" | "fixed">("percent");
  const [savingsValue, setSavingsValue] = useState<string>("20");

  // Helpers
  const addBill = () =>
    setBills([...bills, { id: generateId(), name: "", amount: 0 }]);
  const removeBill = (id: string) => setBills(bills.filter((b) => b.id !== id));
  const updateBill = (id: string, field: keyof Bill, val: string | number) => {
    setBills(bills.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  };

  const getSavingsAmount = () => {
    const inc = parseFloat(monthlyIncome) || 0;
    const val = parseFloat(savingsValue) || 0;
    return savingsMode === "percent" ? inc * (val / 100) : val;
  };

  const handleSave = async () => {
    const savingsGoal: SavingsGoal =
      savingsMode === "percent"
        ? { mode: "percent", percent: parseFloat(savingsValue) || 0 }
        : { mode: "fixed", amount: parseFloat(savingsValue) || 0 };

    const config: BudgetConfig = {
      startDate,
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      bills: bills.filter((b) => b.name.trim() !== ""),
      savingsGoal,
    };

    await saveConfig(config);
    await regenerateSystemTransactions(config);
    router.replace("/");
  };

  const renderStep1 = () => (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="flex-1 justify-center"
    >
      <Text className="text-2xl font-bold text-white mb-6">
        Let's get started
      </Text>
      <View>
        <Text className="text-gray-400 mb-2">Monthly Income</Text>
        <TextInput
          keyboardType="decimal-pad"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
          placeholder="e.g. 5000"
          placeholderTextColor="#6b7280"
          className="w-full bg-borderAlt p-4 rounded-xl text-white text-xl border border-border"
        />
      </View>
      <View className="mt-6">
        <Text className="text-gray-400 mb-2">Period start date</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#6b7280"
          keyboardType="numbers-and-punctuation"
          className="w-full bg-borderAlt p-4 rounded-xl text-white text-xl border border-border"
        />
      </View>
      <Pressable
        disabled={!monthlyIncome}
        onPress={() => setStep(2)}
        className={`w-full bg-green-600 p-4 rounded-xl mt-8 items-center ${
          !monthlyIncome ? "opacity-50" : "opacity-100"
        }`}
      >
        <Text className="font-bold text-white">Next</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="flex-1"
    >
      <Text className="text-2xl font-bold text-white mb-4">
        Recurring Bills
      </Text>
      <ScrollView className="flex-1 mb-4">
        <View className="gap-3">
          {bills.map((bill) => (
            <View key={bill.id} className="flex-row gap-2 items-center">
              <TextInput
                value={bill.name}
                onChangeText={(text) => updateBill(bill.id, "name", text)}
                placeholder="Bill Name"
                placeholderTextColor="#6b7280"
                className="flex-1 bg-borderAlt p-3 rounded-lg text-white border border-border"
              />
              <TextInput
                keyboardType="decimal-pad"
                value={bill.amount ? String(bill.amount) : ""}
                onChangeText={(text) =>
                  updateBill(bill.id, "amount", parseFloat(text) || 0)
                }
                placeholder="$"
                placeholderTextColor="#6b7280"
                className="w-24 bg-borderAlt p-3 rounded-lg text-white border border-border"
              />
              <Pressable onPress={() => removeBill(bill.id)} className="p-2">
                <Trash2 size={20} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable
          onPress={addBill}
          className="flex-row items-center gap-2 p-2 mt-3"
        >
          <Plus size={18} color="#22c55e" />
          <Text className="text-green-500 font-medium">Add Bill</Text>
        </Pressable>
      </ScrollView>
      <Pressable
        onPress={() => setStep(3)}
        className="w-full bg-green-600 p-4 rounded-xl items-center"
      >
        <Text className="font-bold text-white">Next</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="flex-1 justify-center"
    >
      <Text className="text-2xl font-bold text-white mb-6">Savings Goal</Text>
      <View className="flex-row bg-borderAlt p-1 rounded-lg mb-6">
        <Pressable
          onPress={() => setSavingsMode("percent")}
          className={`flex-1 py-2 rounded-md items-center ${
            savingsMode === "percent" ? "bg-green-600" : ""
          }`}
        >
          <Text
            className={
              savingsMode === "percent" ? "text-white" : "text-gray-400"
            }
          >
            Percent (%)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSavingsMode("fixed")}
          className={`flex-1 py-2 rounded-md items-center ${
            savingsMode === "fixed" ? "bg-green-600" : ""
          }`}
        >
          <Text
            className={savingsMode === "fixed" ? "text-white" : "text-gray-400"}
          >
            Fixed ($)
          </Text>
        </Pressable>
      </View>
      <View>
        <Text className="text-gray-400 mb-2">
          {savingsMode === "percent" ? "Percentage" : "Amount"}
        </Text>
        <TextInput
          keyboardType="decimal-pad"
          value={savingsValue}
          onChangeText={setSavingsValue}
          className="w-full bg-borderAlt p-4 rounded-xl text-white text-xl border border-border"
        />
        <Text className="text-gray-500 mt-2">
          Approximated savings:{" "}
          <Text className="text-green-500 font-bold">
            ${getSavingsAmount().toFixed(0)}
          </Text>
        </Text>
      </View>
      <Pressable
        onPress={() => setStep(4)}
        className="w-full bg-green-600 p-4 rounded-xl mt-8 items-center"
      >
        <Text className="font-bold text-white">Next</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep4 = () => {
    const inc = parseFloat(monthlyIncome) || 0;
    const billsTotal = bills.reduce((acc, b) => acc + (b.amount || 0), 0);
    const saveAmt = getSavingsAmount();
    const available = inc - billsTotal - saveAmt;

    return (
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-1 justify-center"
      >
        <Text className="text-2xl font-bold text-white mb-6">Review</Text>
        <View className="bg-borderAlt rounded-xl p-4 gap-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-400">Monthly Income</Text>
            <Text className="text-green-500 font-bold">+${inc}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-400">Period Start</Text>
            <Text className="text-white font-medium">{startDate}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-400">Bills Total</Text>
            <Text className="text-red-500 font-bold">-${billsTotal}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-400">Savings</Text>
            <Text className="text-red-500 font-bold">
              -${saveAmt.toFixed(0)}
            </Text>
          </View>
          <View className="h-px bg-border my-2" />
          <View className="flex-row justify-between">
            <Text className="text-white text-lg">Available to Spend</Text>
            <Text className="text-green-500 font-bold text-lg">
              ${available.toFixed(0)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSave}
          className="w-full bg-green-600 p-4 rounded-xl mt-8 flex-row items-center justify-center gap-2"
        >
          <Text className="font-bold text-white">Looks Good</Text>
          <ArrowRight size={20} color="#ffffff" />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 p-6"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
