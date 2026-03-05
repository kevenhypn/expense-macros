import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Trash2, Plus, ArrowRight, CalendarDays } from "lucide-react-native";
import { Bill, BudgetConfig, SavingsGoal } from "../../types";
import {
  getTodayISO,
  saveConfig,
  regenerateSystemTransactions,
  generateId,
  daysInMonth,
  calculateFinancials,
} from "../../lib/storage";
import { PRIVACY_POLICY_URL, SUPPORT_URL } from "../../src/constants/urls";
import { SetupHeader } from "../../components/setup/SetupHeader";
import { BudgetPreviewCard } from "../../components/setup/BudgetPreviewCard";
import { formatCurrency, parseMoneyInput } from "../../src/utils/format";

type SetupStepKey = "income" | "bills" | "savings" | "review";

type SetupStep = {
  key: SetupStepKey;
  title: string;
  renderContent: () => React.ReactNode;
  canNext: boolean;
  optional?: boolean;
  ctaLabel?: string;
};

const QUICK_BILLS = ["Rent", "Phone", "Car", "Insurance", "Utilities"];

export default function SetupWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [startDate, setStartDate] = useState(getTodayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bills, setBills] = useState<Bill[]>([
    { id: "1", name: "Rent", amount: 0 },
    { id: "2", name: "Phone", amount: 0 },
  ]);
  const [savingsMode, setSavingsMode] = useState<"percent" | "fixed">("percent");
  const [savingsValue, setSavingsValue] = useState<string>("20");
  const [rolloverUnspent, setRolloverUnspent] = useState(true);
  const [spareMoneyMode, setSpareMoneyMode] = useState(true);
  const [errors, setErrors] = useState<{ income?: string }>({});

  const monthlyIncomeNumber = parseFloat(monthlyIncome) || 0;

  const parsedSavingsValue = parseFloat(savingsValue) || 0;
  const clampedPercent = Math.min(100, Math.max(0, parsedSavingsValue));
  const clampedFixed = Math.max(0, parsedSavingsValue);
  const normalizedSavingsGoal: SavingsGoal =
    savingsMode === "percent"
      ? { mode: "percent", percent: clampedPercent }
      : { mode: "fixed", amount: clampedFixed };

  const savingsAmount =
    normalizedSavingsGoal.mode === "percent"
      ? monthlyIncomeNumber * (normalizedSavingsGoal.percent / 100)
      : normalizedSavingsGoal.amount;

  const normalizedBills = useMemo(
    () =>
      bills
        .map((bill) => ({
          ...bill,
          name: bill.name.trim(),
          amount: Math.abs(Number(bill.amount) || 0),
        }))
        .filter((bill) => bill.name.length > 0 && bill.amount > 0),
    [bills]
  );

  const previewFinancials = calculateFinancials({
    startDate,
    monthlyIncome: monthlyIncomeNumber,
    bills: normalizedBills,
    savingsGoal: normalizedSavingsGoal,
    rolloverUnspent,
    spareMoneyMode,
  });
  const dailyBudget =
    previewFinancials.availableToSpend / Math.max(1, daysInMonth(startDate));

  const addBill = (name = "") => {
    setBills((prev) => [...prev, { id: generateId(), name, amount: 0 }]);
  };

  const removeBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const updateBill = (id: string, field: keyof Bill, value: string) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== id) return bill;
        if (field === "name") {
          return { ...bill, name: value };
        }
        return {
          ...bill,
          amount: parseFloat(parseMoneyInput(value)) || 0,
        };
      })
    );
  };

  const onIncomeChange = (value: string) => {
    const parsed = parseMoneyInput(value);
    setMonthlyIncome(parsed);

    const incomeValue = parseFloat(parsed) || 0;
    setErrors((prev) => ({
      ...prev,
      income: incomeValue > 0 ? undefined : "Monthly income must be more than $0.",
    }));
  };

  const onSavingsValueChange = (value: string) => {
    const parsed = parseMoneyInput(value);

    if (savingsMode === "percent") {
      const asNumber = parseFloat(parsed);
      if (Number.isNaN(asNumber)) {
        setSavingsValue("");
        return;
      }
      setSavingsValue(String(Math.min(100, Math.max(0, asNumber))));
      return;
    }

    setSavingsValue(parsed);
  };

  const openExternal = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Unable to open link", "Please try again later.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", "Please try again later.");
    }
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setStartDate(selectedDate.toLocaleDateString("en-CA"));
    }
  };

  const handleSave = async () => {
    const config: BudgetConfig = {
      startDate,
      monthlyIncome: monthlyIncomeNumber,
      bills: normalizedBills,
      savingsGoal: normalizedSavingsGoal,
      rolloverUnspent,
      spareMoneyMode,
    };

    await saveConfig(config);
    await regenerateSystemTransactions(config);
    router.replace("/");
  };

  const renderAbout = () => (
    <View className="pt-4 border-t border-border mt-2">
      <Text className="text-xs text-gray-500 uppercase tracking-wider">About</Text>
      <View className="flex-row gap-4 mt-2">
        <Pressable onPress={() => openExternal(PRIVACY_POLICY_URL)}>
          <Text className="text-sm text-blue-400">Privacy Policy</Text>
        </Pressable>
        <Pressable onPress={() => openExternal(SUPPORT_URL)}>
          <Text className="text-sm text-blue-400">Support</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderIncomeStep = () => (
    <View className="gap-5">
      <View>
        <Text className="text-white text-2xl font-bold">Set up your budget</Text>
        <Text className="text-gray-400 mt-1">A quick setup to start tracking today.</Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm text-gray-300">Monthly income</Text>
        <View className="flex-row items-center bg-borderAlt border border-border rounded-xl px-4">
          <Text className="text-white text-xl mr-2">$</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={monthlyIncome}
            onChangeText={onIncomeChange}
            placeholder="5000"
            placeholderTextColor="#6b7280"
            className="flex-1 text-white text-xl py-4"
          />
        </View>
        {!!errors.income && <Text className="text-red-400 text-xs">{errors.income}</Text>}
      </View>

      <View className="gap-2">
        <Text className="text-sm text-gray-300">Month start date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="bg-borderAlt border border-border rounded-xl px-4 py-4 flex-row items-center justify-between"
        >
          <Text className="text-white text-base">
            {new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <CalendarDays size={18} color="#9ca3af" />
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-sm text-gray-300">Rollover unspent budget</Text>
        <Pressable
          onPress={() => setRolloverUnspent((prev) => !prev)}
          className="w-full bg-borderAlt p-4 rounded-xl border border-border flex-row items-center justify-between"
        >
          <Text className="text-gray-300 flex-1 mr-3">
            Unused daily allowance carries into remaining days.
          </Text>
          <View
            className={`w-12 h-7 rounded-full p-1 ${
              rolloverUnspent ? "bg-green-600" : "bg-[#2a2a2a]"
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full bg-white ${
                rolloverUnspent ? "ml-5" : "ml-0"
              }`}
            />
          </View>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-sm text-gray-300">Spare money mode</Text>
        <Pressable
          onPress={() => setSpareMoneyMode((prev) => !prev)}
          className="w-full bg-borderAlt p-4 rounded-xl border border-border flex-row items-center justify-between"
        >
          <Text className="text-gray-300 flex-1 mr-3">
            Focus on discretionary spending and hide income and set bills by default.
          </Text>
          <View
            className={`w-12 h-7 rounded-full p-1 ${
              spareMoneyMode ? "bg-green-600" : "bg-[#2a2a2a]"
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full bg-white ${
                spareMoneyMode ? "ml-5" : "ml-0"
              }`}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );

  const renderBillsStep = () => (
    <View className="gap-5">
      <View>
        <Text className="text-white text-2xl font-bold">Add recurring bills</Text>
        <Text className="text-gray-400 mt-1">Optional now, easy to edit later.</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {QUICK_BILLS.map((name) => (
          <Pressable
            key={name}
            onPress={() => addBill(name)}
            className="px-3 py-2 rounded-full border border-border bg-borderAlt"
          >
            <Text className="text-xs text-gray-200">+ {name}</Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-3">
        {bills.map((bill) => (
          <View
            key={bill.id}
            className="bg-borderAlt border border-border rounded-xl p-3 flex-row items-center gap-3"
          >
            <TextInput
              value={bill.name}
              onChangeText={(text) => updateBill(bill.id, "name", text)}
              placeholder="Bill name"
              placeholderTextColor="#6b7280"
              className="flex-1 text-white"
            />

            <View className="flex-row items-center bg-[#202020] rounded-lg px-2 w-28">
              <Text className="text-gray-300 mr-1">$</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={bill.amount ? String(bill.amount) : ""}
                onChangeText={(text) => updateBill(bill.id, "amount", text)}
                placeholder="0"
                placeholderTextColor="#6b7280"
                className="flex-1 text-white py-2 text-right"
              />
            </View>

            <Pressable onPress={() => removeBill(bill.id)} className="p-1" hitSlop={6}>
              <Trash2 size={18} color="#ef4444" />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => addBill()}
        className="self-start flex-row items-center gap-2 px-3 py-2 rounded-lg border border-border"
      >
        <Plus size={16} color="#9ca3af" />
        <Text className="text-sm text-gray-300">Add bill</Text>
      </Pressable>
    </View>
  );

  const renderSavingsStep = () => (
    <View className="gap-5">
      <View>
        <Text className="text-white text-2xl font-bold">Savings target</Text>
        <Text className="text-gray-400 mt-1">Pick a percent or fixed amount.</Text>
      </View>

      <View className="flex-row bg-borderAlt p-1 rounded-lg">
        <Pressable
          onPress={() => setSavingsMode("percent")}
          className={`flex-1 py-2 rounded-md items-center ${
            savingsMode === "percent" ? "bg-green-600" : ""
          }`}
        >
          <Text className={savingsMode === "percent" ? "text-white" : "text-gray-400"}>
            Percent
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSavingsMode("fixed")}
          className={`flex-1 py-2 rounded-md items-center ${
            savingsMode === "fixed" ? "bg-green-600" : ""
          }`}
        >
          <Text className={savingsMode === "fixed" ? "text-white" : "text-gray-400"}>
            Fixed
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-sm text-gray-300">
          {savingsMode === "percent" ? "Savings percent" : "Savings amount"}
        </Text>
        <View className="flex-row items-center bg-borderAlt border border-border rounded-xl px-4">
          <Text className="text-white mr-2">{savingsMode === "percent" ? "%" : "$"}</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={savingsValue}
            onChangeText={onSavingsValueChange}
            placeholder={savingsMode === "percent" ? "20" : "500"}
            placeholderTextColor="#6b7280"
            className="flex-1 text-white py-4 text-lg"
          />
        </View>
        {savingsMode === "percent" && (
          <Text className="text-xs text-gray-500">Percent is capped between 0 and 100.</Text>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            setSavingsMode("fixed");
            setSavingsValue("0");
          }}
          className="px-3 py-2 rounded-full border border-border bg-borderAlt"
        >
          <Text className="text-xs text-gray-200">None (0)</Text>
        </Pressable>
        <Text className="text-gray-400 text-sm">
          Estimated savings: <Text className="text-green-500 font-semibold">{formatCurrency(savingsAmount)}</Text>
        </Text>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View className="gap-5">
      <View>
        <Text className="text-white text-2xl font-bold">Review your setup</Text>
        <Text className="text-gray-400 mt-1">You can update any of this later.</Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-3">
        <View className="flex-row justify-between">
          <Text className="text-gray-300">Month starts</Text>
          <Text className="text-white font-medium">{startDate}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-300">Rollover</Text>
          <Text className="text-white font-medium">{rolloverUnspent ? "On" : "Off"}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-300">Spare money mode</Text>
          <Text className="text-white font-medium">{spareMoneyMode ? "On" : "Off"}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-300">Active bills</Text>
          <Text className="text-white font-medium">{normalizedBills.length}</Text>
        </View>
      </View>

      <View className="bg-green-600/10 border border-green-500/30 rounded-2xl p-4">
        <Text className="text-green-300 text-xs uppercase tracking-wider">Daily budget</Text>
        <Text className="text-white text-3xl font-bold mt-1">{formatCurrency(dailyBudget)}</Text>
      </View>
    </View>
  );

  const steps: SetupStep[] = [
    { key: "income", title: "Income", renderContent: renderIncomeStep, canNext: monthlyIncomeNumber > 0 },
    { key: "bills", title: "Bills", renderContent: renderBillsStep, canNext: true, optional: true },
    { key: "savings", title: "Savings", renderContent: renderSavingsStep, canNext: true, optional: true },
    { key: "review", title: "Review", renderContent: renderReviewStep, canNext: true, ctaLabel: "Start tracking" },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const goNext = async () => {
    if (isLastStep) {
      await handleSave();
      return;
    }
    setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const goBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const selectedDateValue = new Date(`${startDate}T00:00:00`);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          <SetupHeader
            currentStep={stepIndex + 1}
            totalSteps={steps.length}
            title={currentStep.title}
            onBack={goBack}
          />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 28, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.duration(220)}>{currentStep.renderContent()}</Animated.View>

            <BudgetPreviewCard
              monthlyIncome={monthlyIncomeNumber}
              startDate={startDate}
              bills={normalizedBills}
              savingsGoal={normalizedSavingsGoal}
              spareMoneyMode={spareMoneyMode}
            />

            {renderAbout()}
          </ScrollView>
        </View>

        <View className="px-6 pb-6 pt-4 border-t border-border bg-background gap-3">
          {currentStep.optional && !isLastStep && (
            <Pressable onPress={() => setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}>
              <Text className="text-center text-gray-400">Skip for now</Text>
            </Pressable>
          )}

          <Pressable
            onPress={goNext}
            disabled={!currentStep.canNext}
            className={`w-full p-4 rounded-xl flex-row items-center justify-center gap-2 ${
              currentStep.canNext ? "bg-green-600" : "bg-green-800/40"
            }`}
          >
            <Text className="font-bold text-white">{currentStep.ctaLabel ?? (isLastStep ? "Finish" : "Next")}</Text>
            <ArrowRight size={18} color="#ffffff" />
          </Pressable>
        </View>

        {showDatePicker &&
          (Platform.OS === "ios" ? (
            <Modal
              transparent
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable
                className="flex-1 bg-black/60 justify-end"
                onPress={() => setShowDatePicker(false)}
              >
                <Pressable className="bg-[#1c1c1e] p-4 rounded-t-2xl" onPress={() => {}}>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white text-base font-semibold">Select start date</Text>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text className="text-blue-400">Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={selectedDateValue}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDateValue}
              mode="date"
              display="calendar"
              onChange={handleDateChange}
            />
          ))}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
