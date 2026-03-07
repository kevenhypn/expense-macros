import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Trash2, Plus, ArrowRight, CalendarDays } from "lucide-react-native";
import { Bill, BudgetConfig, SavingsGoal } from "../../types";
import {
  getTodayISO,
  saveConfig,
  loadConfig,
  regenerateSystemTransactions,
  generateId,
  daysInMonth,
  calculateFinancials,
} from "../../lib/storage";
import { PRIVACY_POLICY_URL, SUPPORT_URL } from "../../src/constants/urls";
import { SetupHeader } from "../../components/setup/SetupHeader";
import { BudgetPreviewCard } from "../../components/setup/BudgetPreviewCard";
import { LiquidGlassSurface } from "../../components/ui/LiquidGlassSurface";
import { formatCurrency, parseMoneyInput } from "../../src/utils/format";
import {
  DEFAULT_BUDGET_THEME,
  getBudgetTheme,
} from "../../src/utils/budgetTheme";
import { GLASS } from "../../src/theme/glass";

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

function StepCard({
  children,
  accentGlowColor = DEFAULT_BUDGET_THEME.accentGlowStrong,
}: {
  children: React.ReactNode;
  accentGlowColor?: string;
}) {
  return (
    <LiquidGlassSurface
      variant="card"
      contentStyle={{ paddingHorizontal: GLASS.pad, paddingVertical: GLASS.pad }}
    >
      <View
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full"
        style={{ backgroundColor: accentGlowColor }}
      />
      <View className="absolute bottom-0 left-10 h-16 w-16 rounded-full bg-white/5" />
      <View className="gap-5">{children}</View>
    </LiquidGlassSurface>
  );
}

function StepIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-gray-500">
        {eyebrow}
      </Text>
      <Text className="text-3xl font-bold leading-[36px] text-white">
        {title}
      </Text>
      <Text className="text-sm leading-6 text-gray-400">{subtitle}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-gray-500">
      {children}
    </Text>
  );
}

function ToggleCard({
  label,
  description,
  value,
  onPress,
  accentSurfaceColor = DEFAULT_BUDGET_THEME.accentSurface,
  accentTextColor = DEFAULT_BUDGET_THEME.accentText,
  activeColor = DEFAULT_BUDGET_THEME.accent,
  activeThumbColor = DEFAULT_BUDGET_THEME.onAccent,
}: {
  label: string;
  description: string;
  value: boolean;
  onPress: () => void;
  accentSurfaceColor?: string;
  accentTextColor?: string;
  activeColor?: string;
  activeThumbColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-[28px] border border-border bg-cardAlt px-4 py-4"
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-white">{label}</Text>
            <Text
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                value ? "" : "bg-white/5 text-gray-400"
              }`}
              style={
                value
                  ? {
                      backgroundColor: accentSurfaceColor,
                      color: accentTextColor,
                    }
                  : undefined
              }
            >
              {value ? "On" : "Off"}
            </Text>
          </View>
          <Text className="text-sm leading-6 text-gray-400">{description}</Text>
        </View>

        <View
          className={`h-8 w-14 rounded-full p-1 ${value ? "" : "bg-white/10"}`}
          style={value ? { backgroundColor: activeColor } : undefined}
        >
          <View
            className={`h-6 w-6 rounded-full ${value ? "ml-6" : "ml-0 bg-white"}`}
            style={value ? { backgroundColor: activeThumbColor } : undefined}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function SetupWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

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
  const previewTheme = getBudgetTheme(
    monthlyIncomeNumber > 0
      ? previewFinancials.availableToSpend / monthlyIncomeNumber
      : 1
  );

  useEffect(() => {
    let isActive = true;

    const hydrateFromConfig = async () => {
      const existingConfig = await loadConfig();
      if (!isActive) return;

      if (existingConfig) {
        setHasExistingConfig(true);
        setMonthlyIncome(
          existingConfig.monthlyIncome > 0
            ? String(existingConfig.monthlyIncome)
            : ""
        );
        setStartDate(existingConfig.startDate);
        setBills(existingConfig.bills);
        setSavingsMode(existingConfig.savingsGoal.mode);
        setSavingsValue(
          existingConfig.savingsGoal.mode === "percent"
            ? String(existingConfig.savingsGoal.percent)
            : String(existingConfig.savingsGoal.amount)
        );
        setRolloverUnspent(existingConfig.rolloverUnspent ?? true);
        setSpareMoneyMode(existingConfig.spareMoneyMode ?? true);
        setErrors({});
      }

      setIsHydrating(false);
    };

    hydrateFromConfig();

    return () => {
      isActive = false;
    };
  }, []);

  if (isHydrating) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

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
    <LiquidGlassSurface
      variant="card"
      contentStyle={{ paddingHorizontal: GLASS.pad, paddingVertical: GLASS.pad }}
    >
      <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-gray-500">
        About
      </Text>
      <Text className="mt-2 text-sm leading-6 text-gray-400">
        Privacy, support, and account details are always available after setup.
      </Text>
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => openExternal(PRIVACY_POLICY_URL)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-gray-200">Privacy policy</Text>
        </Pressable>
        <Pressable
          onPress={() => openExternal(SUPPORT_URL)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-gray-200">Support</Text>
        </Pressable>
      </View>
    </LiquidGlassSurface>
  );

  const renderIncomeStep = () => (
    <View className="gap-4">
      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <StepIntro
          eyebrow="Foundation"
          title="Set your monthly runway"
          subtitle="A few numbers power the hero card, daily allowance, and the faster logging flow."
        />

        <View className="gap-3">
          <FieldLabel>Monthly income</FieldLabel>
          <View className="rounded-[28px] border border-border bg-cardAlt px-5 py-5">
            <View className="min-h-[64px] flex-row items-end">
              <Text className="pb-2 pr-2 text-[32px] font-bold leading-[36px] text-gray-500">$</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={monthlyIncome}
                onChangeText={onIncomeChange}
                placeholder="5000"
                placeholderTextColor="#6b7280"
                className="flex-1 text-[52px] font-bold leading-[60px] text-white"
                style={{ paddingTop: 6, paddingBottom: 0.2 }}
              />
            </View>
          </View>
          {!!errors.income && (
            <Text className="text-sm text-orange-300">{errors.income}</Text>
          )}
        </View>

        <View className="gap-3">
          <FieldLabel>Month start date</FieldLabel>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="rounded-[28px] border border-border bg-cardAlt px-5 py-5"
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-lg font-semibold text-white">
                  {new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text className="text-sm text-gray-400">
                  This sets the monthly budget cycle.
                </Text>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <CalendarDays size={18} color="#d1d5db" />
              </View>
            </View>
          </Pressable>
        </View>
      </StepCard>

      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <FieldLabel>Behavior</FieldLabel>
        <ToggleCard
          label="Rollover unspent budget"
          description="Unused daily allowance carries into later days so the month feels less rigid."
          value={rolloverUnspent}
          onPress={() => setRolloverUnspent((prev) => !prev)}
          accentSurfaceColor={previewTheme.accentSurface}
          accentTextColor={previewTheme.accentText}
          activeColor={previewTheme.accent}
          activeThumbColor={previewTheme.onAccent}
        />
        <ToggleCard
          label="Spare money mode"
          description="Default the app to discretionary spending and hide income and fixed bills until you need them."
          value={spareMoneyMode}
          onPress={() => setSpareMoneyMode((prev) => !prev)}
          accentSurfaceColor={previewTheme.accentSurface}
          accentTextColor={previewTheme.accentText}
          activeColor={previewTheme.accent}
          activeThumbColor={previewTheme.onAccent}
        />
      </StepCard>
    </View>
  );

  const renderBillsStep = () => (
    <View className="gap-4">
      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <StepIntro
          eyebrow="Fixed costs"
          title="Add the bills that always show up"
          subtitle="Optional now, but useful if you want the leftover number to feel more realistic on day one."
        />

        <View className="flex-row flex-wrap gap-2">
          {QUICK_BILLS.map((name) => (
            <Pressable
              key={name}
              onPress={() => addBill(name)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3"
            >
              <Text className="text-sm font-semibold text-gray-200">+ {name}</Text>
            </Pressable>
          ))}
        </View>
      </StepCard>

      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <FieldLabel>Recurring bills</FieldLabel>
            <Text className="mt-1 text-sm text-gray-400">
              Keep the list lean. You can edit everything later.
            </Text>
          </View>
          <Text className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-300">
            {bills.length} rows
          </Text>
        </View>

        <View className="gap-3">
          {bills.map((bill) => (
            <View
              key={bill.id}
              className="rounded-[28px] border border-border bg-cardAlt px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={bill.name}
                  onChangeText={(text) => updateBill(bill.id, "name", text)}
                  placeholder="Bill name"
                  placeholderTextColor="#6b7280"
                  className="flex-1 text-lg font-semibold text-white"
                  style={{ paddingVertical: 0 }}
                />
                <Pressable
                  onPress={() => removeBill(bill.id)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5"
                  hitSlop={6}
                >
                  <Trash2 size={18} color="#fb923c" />
                </Pressable>
              </View>

              <View className="mt-4 rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                <View className="flex-row items-center">
                  <Text className="mr-2 text-xl font-semibold text-gray-400">$</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={bill.amount ? String(bill.amount) : ""}
                    onChangeText={(text) => updateBill(bill.id, "amount", text)}
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                    className="flex-1 text-2xl font-semibold text-white"
                    style={{ paddingVertical: 0 }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => addBill()}
          className="flex-row items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4"
        >
          <Plus size={16} color="#d1d5db" />
          <Text className="text-sm font-semibold text-gray-200">Add custom bill</Text>
        </Pressable>
      </StepCard>
    </View>
  );

  const renderSavingsStep = () => (
    <View className="gap-4">
      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <StepIntro
          eyebrow="Savings"
          title="Choose what to keep for later"
          subtitle="A percent is better if income changes. A fixed amount is better if you want a firm rule."
        />

        <View className="rounded-full border border-white/10 bg-cardAlt p-1">
          <View className="flex-row">
            <Pressable
              onPress={() => setSavingsMode("percent")}
              className="flex-1 rounded-full py-3 items-center"
              style={
                savingsMode === "percent"
                  ? { backgroundColor: previewTheme.accent }
                  : undefined
              }
            >
              <Text
                className={`font-semibold ${
                  savingsMode === "percent" ? "" : "text-gray-400"
                }`}
                style={
                  savingsMode === "percent"
                    ? { color: previewTheme.onAccent }
                    : undefined
                }
              >
                Percent
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSavingsMode("fixed")}
              className="flex-1 rounded-full py-3 items-center"
              style={
                savingsMode === "fixed"
                  ? { backgroundColor: previewTheme.accent }
                  : undefined
              }
            >
              <Text
                className={`font-semibold ${
                  savingsMode === "fixed" ? "" : "text-gray-400"
                }`}
                style={
                  savingsMode === "fixed"
                    ? { color: previewTheme.onAccent }
                    : undefined
                }
              >
                Fixed
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <FieldLabel>
            {savingsMode === "percent" ? "Savings percent" : "Savings amount"}
          </FieldLabel>
          <View className="rounded-[28px] border border-border bg-cardAlt px-5 py-5">
            <View className="flex-row items-center">
              <Text className="pr-2 text-3xl font-bold text-gray-500">
                {savingsMode === "percent" ? "%" : "$"}
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                value={savingsValue}
                onChangeText={onSavingsValueChange}
                placeholder={savingsMode === "percent" ? "20" : "500"}
                placeholderTextColor="#6b7280"
                className="flex-1 text-5xl font-bold text-white"
                style={{ paddingVertical: 0 }}
              />
            </View>
          </View>
          {savingsMode === "percent" ? (
            <Text className="text-sm text-gray-500">
              Percent is capped between 0 and 100.
            </Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={() => {
              setSavingsMode("fixed");
              setSavingsValue("0");
            }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-3"
          >
            <Text className="text-sm font-semibold text-gray-200">No savings</Text>
          </Pressable>
          <View
            className="rounded-full border px-4 py-3"
            style={{
              borderColor: previewTheme.accentBorder,
              backgroundColor: previewTheme.accentSurface,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: previewTheme.accentText }}
            >
              Estimated savings {formatCurrency(savingsAmount)}
            </Text>
          </View>
        </View>
      </StepCard>
    </View>
  );

  const renderReviewStep = () => (
    <View className="gap-4">
      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <StepIntro
          eyebrow="Ready"
          title="Review your monthly setup"
          subtitle="This is the baseline the app will use for the new hero card and your daily spend guidance."
        />

        <View className="rounded-[28px] border border-border bg-cardAlt px-4 py-4 gap-3">
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-sm text-gray-400">Month starts</Text>
            <Text className="text-sm font-semibold text-white">{startDate}</Text>
          </View>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-sm text-gray-400">Rollover</Text>
            <Text className="text-sm font-semibold text-white">
              {rolloverUnspent ? "On" : "Off"}
            </Text>
          </View>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-sm text-gray-400">Spare money mode</Text>
            <Text className="text-sm font-semibold text-white">
              {spareMoneyMode ? "On" : "Off"}
            </Text>
          </View>
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-sm text-gray-400">Active bills</Text>
            <Text className="text-sm font-semibold text-white">
              {normalizedBills.length}
            </Text>
          </View>
        </View>
      </StepCard>

      <StepCard accentGlowColor={previewTheme.accentGlowStrong}>
        <FieldLabel>Daily target</FieldLabel>
        <Text className="text-5xl font-bold text-white">{formatCurrency(dailyBudget)}</Text>
        <Text className="text-sm leading-6 text-gray-400">
          This is your estimated per-day spend target before transaction history starts changing it.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Income
            </Text>
            <Text
              className="mt-1 text-base font-semibold"
              style={{ color: previewTheme.accentText }}
            >
              {formatCurrency(monthlyIncomeNumber)}
            </Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Bills
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {formatCurrency(previewFinancials.billsTotal)}
            </Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Savings
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {formatCurrency(previewFinancials.savingsAmount)}
            </Text>
          </View>
        </View>
      </StepCard>
    </View>
  );

  const steps: SetupStep[] = [
    {
      key: "income",
      title: "Income",
      renderContent: renderIncomeStep,
      canNext: monthlyIncomeNumber > 0,
    },
    {
      key: "bills",
      title: "Bills",
      renderContent: renderBillsStep,
      canNext: true,
      optional: true,
    },
    {
      key: "savings",
      title: "Savings",
      renderContent: renderSavingsStep,
      canNext: true,
      optional: true,
    },
    {
      key: "review",
      title: "Review",
      renderContent: renderReviewStep,
      canNext: true,
      ctaLabel: hasExistingConfig ? "Save changes" : "Start tracking",
    },
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
    if (stepIndex === 0 && hasExistingConfig) {
      router.replace("/");
      return;
    }
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const selectedDateValue = new Date(`${startDate}T00:00:00`);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute -top-24 right-0 h-64 w-64 rounded-full"
          style={{ backgroundColor: previewTheme.accentGlowStrong }}
        />
        <View
          className="absolute bottom-20 -left-16 h-52 w-52 rounded-full"
          style={{ backgroundColor: previewTheme.accentGlowSoft }}
        />
      </View>
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
            allowBackOnFirstStep={hasExistingConfig}
            accentGlowColor={previewTheme.accentGlowStrong}
            activeStepColor={previewTheme.accent}
          />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 32, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={currentStep.key}
              entering={FadeInDown.duration(220)}
            >
              {currentStep.renderContent()}
            </Animated.View>

            <BudgetPreviewCard
              monthlyIncome={monthlyIncomeNumber}
              startDate={startDate}
              bills={normalizedBills}
              savingsGoal={normalizedSavingsGoal}
              spareMoneyMode={spareMoneyMode}
              accentGlowColor={previewTheme.accentGlowStrong}
              accentSurfaceColor={previewTheme.accentSurface}
              accentBorderColor={previewTheme.accentBorder}
              accentTextColor={previewTheme.accentText}
            />

            {renderAbout()}
          </ScrollView>
        </View>

        <View
          className="border-t border-white/8 bg-background px-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {currentStep.optional && !isLastStep ? (
            <Pressable
              onPress={() =>
                setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
              }
              className="mb-3 self-center rounded-full border border-white/10 bg-white/5 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-400">Skip for now</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={goNext}
            disabled={!currentStep.canNext}
            className={`w-full rounded-[24px] p-4 flex-row items-center justify-center gap-2 ${
              currentStep.canNext ? "" : "bg-cardAlt"
            }`}
            style={
              currentStep.canNext
                ? { backgroundColor: previewTheme.accent }
                : undefined
            }
          >
            <Text
              className={`font-bold ${
                currentStep.canNext ? "" : "text-gray-500"
              }`}
              style={
                currentStep.canNext
                  ? { color: previewTheme.onAccent }
                  : undefined
              }
            >
              {currentStep.ctaLabel ?? (isLastStep ? "Finish" : "Next")}
            </Text>
            <ArrowRight
              size={18}
              color={currentStep.canNext ? previewTheme.onAccent : "#6b7280"}
            />
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
                <Pressable
                  className="rounded-t-[32px] border-t border-border bg-background px-6 pt-4"
                  style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                  onPress={() => {}}
                >
                  <View className="items-center pb-3">
                    <View className="h-1.5 w-14 rounded-full bg-white/10" />
                  </View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Calendar
                      </Text>
                      <Text className="text-xl font-bold text-white">
                        Select start date
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2"
                    >
                      <Text className="text-sm font-medium text-gray-300">Done</Text>
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
