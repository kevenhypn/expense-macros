import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Vibration,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Settings,
  RefreshCw,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react-native";
import { Transaction, TransactionCategory } from "../types";
import {
  saveTransactions,
  generateId,
  getTodayISO,
  calculateFinancials,
  daysInMonth,
  isSameMonth,
} from "../lib/storage";
import { useAppData } from "../hooks/useAppData";
import { BudgetHero } from "../components/dashboard/BudgetHero";
import { CategoryGrid } from "../components/CategoryGrid";
import { CATEGORY_STYLES, CATEGORY_TEXT_COLORS } from "../lib/categoryStyles";
import { formatMoney0, formatMoney2 } from "../src/utils/money";
import { getBudgetTheme } from "../src/utils/budgetTheme";

type FilterType = "All" | "Spending" | "Bills" | "Savings" | "Income";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, transactions, setTransactions, isLoading, refresh } =
    useAppData();

  // UI State
  const [amount, setAmount] = useState("");
  const [selectedCat, setSelectedCat] = useState<
    "Food" | "Shopping" | "Transport" | "Other"
  >("Food");
  const [note, setNote] = useState("");
  const [filter] = useState<FilterType>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [showAllMonthFlows, setShowAllMonthFlows] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "period">("day");
  const [selectedDateISO, setSelectedDateISO] = useState(getTodayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>("Food");
  const [pendingDelete, setPendingDelete] = useState<{
    tx: Transaction;
    previousTxs: Transaction[];
    nextTxs: Transaction[];
  } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addSheetProgress = useSharedValue(0);

  const spendingCategories = [
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Other",
  ] as const;
  type SpendingCategory = (typeof spendingCategories)[number];
  const quickLogCategories = [
    "Food",
    "Shopping",
    "Transport",
    "Other",
  ] as const;
  const expenseCategories = [
    "Bills",
    "Savings",
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Other",
  ] as const;
  type ExpenseCategory = (typeof expenseCategories)[number];
  const isSpendingCategory = (
    category: TransactionCategory
  ): category is SpendingCategory =>
    !["Bills", "Savings", "Income"].includes(category);

  // Redirect to setup if no config
  useEffect(() => {
    if (!isLoading && !config) {
      router.replace("/setup");
    }
  }, [isLoading, config, router]);

  useEffect(() => {
    if (!config) return;
    const nextSpareMode = config.spareMoneyMode ?? true;
    setShowAllMonthFlows(!nextSpareMode);
  }, [config]);

  useEffect(() => {
    if (!showAddSheet) {
      addSheetProgress.value = 0;
      return;
    }

    addSheetProgress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [addSheetProgress, showAddSheet]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const closeAddSheet = useCallback(() => {
    addSheetProgress.value = withTiming(
      0,
      {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setShowAddSheet)(false);
        }
      }
    );
  }, [addSheetProgress]);

  const addSheetBackdropStyle = useAnimatedStyle(() => ({
    opacity: addSheetProgress.value * 0.6,
  }));

  const addSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - addSheetProgress.value) * 360 }],
  }));

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (!config) return null;
  const spareMoneyMode = config.spareMoneyMode ?? true;

  // --- Calculations ---
  const selectedDate = new Date(`${selectedDateISO}T00:00:00`);
  const selectedDateLabel = selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const rolloverUnspent = config.rolloverUnspent ?? false;
  const { availableToSpend: baseAvailableToSpend } = calculateFinancials(config);

  // Filter for current month
  const currentMonthTxs = transactions.filter((t) =>
    isSameMonth(t.date, selectedDateISO)
  );

  // Discretionary calculation
  const netDiscretionary = currentMonthTxs.reduce((sum, t) => {
    if (!isSpendingCategory(t.category)) return sum;
    return sum + t.amount;
  }, 0);
  const discretionarySpent = Math.max(0, -netDiscretionary);
  const totalIncome = currentMonthTxs.reduce((sum, t) => {
    if (t.category !== "Income") return sum;
    if (t.amount <= 0) return sum;
    return sum + t.amount;
  }, 0);

  const incomeAdjustments = currentMonthTxs.reduce((sum, t) => {
    if (t.isSystem) return sum;
    if (t.category !== "Income") return sum;
    if (t.amount <= 0) return sum;
    return sum + t.amount;
  }, 0);

  const availableToSpend = baseAvailableToSpend + incomeAdjustments;
  const periodLeft = availableToSpend + netDiscretionary;
  const monthLeft = periodLeft;
  const monthBudgetTotal = availableToSpend;
  const budgetTheme = getBudgetTheme(
    monthBudgetTotal > 0 && monthLeft >= 0 ? monthLeft / monthBudgetTotal : 0
  );
  const pctOfIncome = (amount: number) =>
    totalIncome > 0 ? (amount / totalIncome) * 100 : 0;

  // Today's Budget Logic
  const dim = daysInMonth(selectedDateISO);
  const baseDailyBudget = availableToSpend / dim;
  const monthPrefix = selectedDateISO.slice(0, 7);
  const selectedDay = selectedDate.getDate();
  const selectedDayTxs = currentMonthTxs.filter(
    (t) => t.date === selectedDateISO
  );
  const netSpendingByDate = currentMonthTxs.reduce(
    (acc, t) => {
      if (!isSpendingCategory(t.category)) return acc;
      acc[t.date] = (acc[t.date] ?? 0) + t.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  let dailyBudget = baseDailyBudget;
  let overspentDays = 0;

  if (rolloverUnspent) {
    let remainingBudget = availableToSpend;
    for (let day = 1; day <= dim; day += 1) {
      const remainingDays = dim - day + 1;
      const dayBudget = remainingBudget / remainingDays;
      const dateISO = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      const spent = -(netSpendingByDate[dateISO] ?? 0);
      if (spent > dayBudget) overspentDays += 1;
      if (day === selectedDay) dailyBudget = dayBudget;
      remainingBudget -= spent;
    }
  } else {
    for (let day = 1; day <= dim; day += 1) {
      const dateISO = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      const spent = -(netSpendingByDate[dateISO] ?? 0);
      if (spent > baseDailyBudget) overspentDays += 1;
    }
  }

  const daysLeftInMonth = dim - selectedDay + 1;
  const suggestedDailyLeft =
    daysLeftInMonth > 0 ? monthLeft / daysLeftInMonth : monthLeft;
  const nextResetDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    1
  );
  const nextResetLabel = `Resets ${nextResetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  const buildSpendingTotals = (txs: Transaction[]) => {
    const netTotals: Record<SpendingCategory, number> = {
      Food: 0,
      Shopping: 0,
      Transport: 0,
      Entertainment: 0,
      Other: 0,
    };

    txs.forEach((t) => {
      if (!spendingCategories.includes(t.category as SpendingCategory)) return;
      netTotals[t.category as SpendingCategory] += t.amount;
    });

    const totals = spendingCategories.reduce((acc, cat) => {
      acc[cat] = Math.max(0, -netTotals[cat]);
      return acc;
    }, {} as Record<SpendingCategory, number>);

    const totalSpent = Object.values(totals).reduce((sum, val) => sum + val, 0);
    return { totals, totalSpent };
  };

  const buildExpenseTotals = (txs: Transaction[]) => {
    const netTotals: Record<ExpenseCategory, number> = {
      Bills: 0,
      Savings: 0,
      Food: 0,
      Shopping: 0,
      Transport: 0,
      Entertainment: 0,
      Other: 0,
    };

    txs.forEach((t) => {
      if (!expenseCategories.includes(t.category as ExpenseCategory)) return;
      netTotals[t.category as ExpenseCategory] += t.amount;
    });

    const totals = expenseCategories.reduce((acc, cat) => {
      acc[cat] = Math.max(0, -netTotals[cat]);
      return acc;
    }, {} as Record<ExpenseCategory, number>);

    const totalSpent = Object.values(totals).reduce((sum, val) => sum + val, 0);
    return { totals, totalSpent };
  };

  const periodSpending = buildSpendingTotals(currentMonthTxs);
  const fullExpenses = buildExpenseTotals(currentMonthTxs);
  const shouldHideFullFlows = spareMoneyMode && !showAllMonthFlows;
  const monthExpenseCategories = shouldHideFullFlows
    ? (expenseCategories.filter((cat) => cat !== "Bills") as ExpenseCategory[])
    : expenseCategories;
  const sortedMonthExpenseCategories = [...monthExpenseCategories].sort(
    (a, b) => fullExpenses.totals[b] - fullExpenses.totals[a]
  );
  const sortedSpendingCategories = [...spendingCategories].sort(
    (a, b) => periodSpending.totals[b] - periodSpending.totals[a]
  );

  const periodLogTxs = [...currentMonthTxs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const visiblePeriodLogTxs = shouldHideFullFlows
    ? periodLogTxs.filter(
        (tx) =>
          !(tx.isSystem && tx.category === "Bills") && tx.category !== "Income"
      )
    : periodLogTxs;
  const visibleSelectedDayTxs = shouldHideFullFlows
    ? selectedDayTxs.filter(
        (tx) =>
          !(tx.isSystem && tx.category === "Bills") && tx.category !== "Income"
      )
    : selectedDayTxs;

  // --- Handlers ---

  const handleAddTransaction = async () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDateISO,
      amount: -Math.abs(val),
      category: selectedCat,
      note: note.trim(),
      isSystem: false,
    };

    const newTxs = [newTx, ...transactions];
    setTransactions(newTxs);
    await saveTransactions(newTxs);

    // Reset form
    setAmount("");
    setNote("");
  };

  const handleSaveQuickTransaction = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount)) return;

    closeAddSheet();
    await handleAddTransaction();
  };

  const handleDeleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((tx) => tx.id === id);
    if (!txToDelete) return;

    // Finalize any existing pending delete immediately.
    if (deleteTimerRef.current && pendingDelete) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
      await saveTransactions(pendingDelete.nextTxs);
      setPendingDelete(null);
    }

    const nextTxs = transactions.filter((tx) => tx.id !== id);
    setTransactions(nextTxs);
    setPendingDelete({ tx: txToDelete, previousTxs: transactions, nextTxs });
    Vibration.vibrate(10);

    deleteTimerRef.current = setTimeout(async () => {
      await saveTransactions(nextTxs);
      setPendingDelete(null);
      deleteTimerRef.current = null;
    }, 5000);
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDate(tx.date);
    setEditAmount(String(Math.abs(tx.amount)));
    setEditNote(tx.note ?? "");
    setEditCategory(tx.category);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate("");
    setEditAmount("");
    setEditNote("");
    setEditCategory("Food");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const parsedAmount = parseFloat(editAmount);
    if (!editDate || isNaN(parsedAmount)) return;

    const nextTxs = transactions.map((tx) => {
      if (tx.id !== editingId) return tx;
      const signedAmount =
        tx.amount >= 0 ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
      return {
        ...tx,
        date: editDate,
        amount: signedAmount,
        note: editNote,
        category: editCategory,
      };
    });

    setTransactions(nextTxs);
    await saveTransactions(nextTxs);
    Vibration.vibrate(10);
    handleCancelEdit();
  };

  const handleUndoDelete = async () => {
    if (!pendingDelete) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setTransactions(pendingDelete.previousTxs);
    await saveTransactions(pendingDelete.previousTxs);
    setPendingDelete(null);
  };

  // Filter Logic
  const getFilteredTransactions = () => {
    return visibleSelectedDayTxs
      .filter((t) => {
        if (filter === "All") return true;
        if (filter === "Spending")
          return !["Bills", "Savings", "Income"].includes(t.category);
        return t.category === filter;
      })
      .sort((a, b) => {
        if (a.isSystem && !b.isSystem) return 1;
        if (!a.isSystem && b.isSystem) return -1;

        if (!a.isSystem && !b.isSystem) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }

        const systemOrder: Record<string, number> = {
          Bills: 0,
          Savings: 1,
          Income: 2,
        };
        const orderDiff =
          (systemOrder[a.category] ?? 99) - (systemOrder[b.category] ?? 99);
        if (orderDiff !== 0) return orderDiff;

        if (a.category === "Bills" && b.category === "Bills") {
          return Math.abs(a.amount) - Math.abs(b.amount);
        }

        return 0;
      });
  };

  const filteredList = getFilteredTransactions();
  const parsedQuickLogAmount = parseFloat(amount);
  const canSaveQuickLog =
    !isNaN(parsedQuickLogAmount) && parsedQuickLogAmount > 0;

  const handleDateChange = (_: unknown, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDateISO(date.toLocaleDateString("en-CA"));
    }
  };

  const shiftSelectedDate = (days: number) => {
    const base = new Date(`${selectedDateISO}T00:00:00`);
    const next = new Date(base);
    next.setDate(base.getDate() + days);
    setSelectedDateISO(next.toLocaleDateString("en-CA"));
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute -top-24 right-0 h-64 w-64 rounded-full"
          style={{ backgroundColor: budgetTheme.accentGlowStrong }}
        />
        <View
          className="absolute bottom-32 -left-20 h-52 w-52 rounded-full"
          style={{ backgroundColor: budgetTheme.accentGlowSoft }}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 176 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="p-6 flex-row justify-between items-center">
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => shiftSelectedDate(-1)}
                  className="py-1"
                  hitSlop={10}
                >
                  <ChevronLeft size={18} color="#6b7280" />
                </Pressable>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className="flex-row items-center"
                >
                  <Text className="text-3xl font-bold text-white">
                    {selectedDateLabel}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => shiftSelectedDate(1)}
                  className="py-1"
                  hitSlop={10}
                >
                  <ChevronRight size={18} color="#6b7280" />
                </Pressable>
              </View>
              <Text className="text-xs text-gray-400">Tap to change</Text>
            </View>
            <View className="flex-row gap-4">
              <Pressable onPress={onRefresh} className="p-2">
                <RefreshCw size={24} color="#9ca3af" />
              </Pressable>
              <Link href="/setup" asChild>
                <Pressable className="p-2">
                  <Settings size={24} color="#9ca3af" />
                </Pressable>
              </Link>
            </View>
          </View>

          {viewMode === "day" ? (
            <>
              <Animated.View
                entering={FadeInDown.duration(300).delay(100)}
                className="px-6 mb-6"
              >
                <View
                  accessible
                  accessibilityLabel={`Left this month: ${formatMoney0(
                    monthLeft
                  )}. Spent ${formatMoney0(
                    discretionarySpent
                  )} of ${formatMoney0(
                    monthBudgetTotal
                  )}. ${monthLeft < 0 ? "Behind" : "About"} ${formatMoney0(
                    Math.abs(suggestedDailyLeft)
                  )} a day for the rest of the month.`}
                >
                  <BudgetHero
                    budgetTotal={monthBudgetTotal}
                    monthLeft={monthLeft}
                    discretionarySpent={discretionarySpent}
                    daysLeftInMonth={daysLeftInMonth}
                    resetLabel={nextResetLabel}
                  />
                </View>
              </Animated.View>

              {/* Log Section */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(200)}
                className="mx-6 mb-2 min-h-[360px] overflow-hidden rounded-[28px] border border-border bg-card p-5"
              >
                <View className="mb-5 flex-row items-center justify-between gap-3">
                  <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    {selectedDateLabel} transactions
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {filteredList.length} total
                  </Text>
                </View>

                {/* Transaction List */}
                <View className="gap-3">
                  {filteredList.map((tx) => (
                    <View
                      key={tx.id}
                      className={`rounded-[18px] border border-border bg-cardAlt flex-row items-center gap-3 overflow-hidden ${
                        tx.isSystem ? "opacity-60" : "opacity-100"
                      }`}
                    >
                      <View
                        style={{
                          width: 6,
                          alignSelf: "stretch",
                          backgroundColor:
                            CATEGORY_STYLES[tx.category].selectedBg,
                        }}
                      />
                      <View className="flex-1 flex-row items-center justify-between gap-3 px-2 py-3">
                        <View className="min-w-0 flex-1">
                          {tx.note ? (
                            <>
                              <Text className="font-medium text-white">
                                {tx.note}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {tx.category} • {tx.date}{" "}
                                {tx.isSystem && "(Auto)"}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text className="font-medium text-white">
                                {tx.category}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {tx.category} • {tx.date}{" "}
                                {tx.isSystem && "(Auto)"}
                              </Text>
                            </>
                          )}
                        </View>
                        <View className="shrink-0 flex-row items-center gap-2">
                          <Text
                            className={`text-base font-semibold ${
                              tx.amount > 0 ? "" : "text-white"
                            }`}
                            style={
                              tx.amount > 0
                                ? { color: budgetTheme.accentText }
                                : undefined
                            }
                          >
                            {formatMoney2(tx.amount)}
                          </Text>
                          <Pressable
                            onPress={() => handleStartEdit(tx)}
                            className="rounded-[12px] bg-white/5 p-2"
                          >
                            <Pencil size={18} color="#6b7280" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteTransaction(tx.id)}
                            className="rounded-[12px] bg-white/5 p-2"
                          >
                            <Trash2 size={18} color="#6b7280" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                  {filteredList.length === 0 && (
                    <View className="items-center mt-10 gap-2">
                      <Text className="text-center text-gray-600">
                        No transactions found
                      </Text>
                      <Text className="text-center text-gray-500 text-xs">
                        Tap + to create your first transaction.
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(300).delay(100)}
              className="px-6 flex-col gap-4"
            >
              <View className="overflow-hidden rounded-[28px] border border-border bg-card px-6 py-6">
                <View
                  className="absolute -right-10 -top-12 h-36 w-36 rounded-full"
                  style={{ backgroundColor: budgetTheme.accentGlowStrong }}
                />
                <View
                  className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full"
                  style={{ backgroundColor: budgetTheme.accentGlowSoft }}
                />
                <Text className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Month breakdown
                </Text>
                <View className="mt-5 flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1 gap-2">
                    <Text className="text-sm text-gray-400">Left this month</Text>
                    <Text
                      className={`text-4xl font-bold ${periodLeft >= 0 ? "" : "text-orange-200"}`}
                      style={
                        periodLeft >= 0
                          ? { color: budgetTheme.accentText }
                          : undefined
                      }
                    >
                      {formatMoney0(periodLeft)}
                    </Text>
                  </View>
                  <View className="min-w-[108px] items-end gap-2">
                    <Text className="text-sm text-gray-400">
                      Overspent days
                    </Text>
                    <Text className="text-3xl font-bold text-white">
                      {overspentDays}
                    </Text>
                  </View>
                </View>
                <View className="mt-5 flex-row flex-wrap gap-2">
                  <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Spent
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-white">
                      {formatMoney0(discretionarySpent)}
                    </Text>
                  </View>
                  <View className="rounded-full border border-white/10 bg-white/5 px-4 py-3">
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Budget mode
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-white">
                      {rolloverUnspent ? "Rollover" : "Fixed"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="overflow-hidden rounded-[28px] border border-border bg-card px-5 py-5 gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="min-w-0 flex-1 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Category breakdown
                  </Text>
                  <Pressable
                    onPress={() => setShowAllMonthFlows((prev) => !prev)}
                    className="rounded-full border px-4 py-2"
                    style={
                      showAllMonthFlows
                        ? {
                            borderColor: budgetTheme.accentBorder,
                            backgroundColor: budgetTheme.accentSurface,
                          }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-[11px] font-semibold ${
                        showAllMonthFlows ? "" : "text-gray-300"
                      }`}
                      style={
                        showAllMonthFlows
                          ? { color: budgetTheme.accentText }
                          : undefined
                      }
                    >
                      {showAllMonthFlows ? "Spare-only view" : "Show full view"}
                    </Text>
                  </Pressable>
                </View>
                {showAllMonthFlows ? (
                  monthExpenseCategories.every(
                    (cat) => fullExpenses.totals[cat] <= 0
                  ) ? (
                    <Text className="text-xs text-gray-500">
                      No expenses yet for this view.
                    </Text>
                  ) : (
                    <View className="gap-4">
                    {sortedMonthExpenseCategories.map((cat) => {
                      const spent = fullExpenses.totals[cat];
                      if (spent <= 0) return null;
                        const pct = pctOfIncome(spent);
                        return (
                          <View key={cat} className="gap-2">
                            <View className="flex-row items-center justify-between gap-3">
                              <Text className="text-sm font-semibold text-white">{cat}</Text>
                              <Text className="text-xs text-gray-500">
                                {pct.toFixed(0)}% - ${spent.toFixed(0)}
                              </Text>
                            </View>
                            <View className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
                              <View
                                style={{
                                  width: `${Math.min(100, pct)}%`,
                                  backgroundColor:
                                    CATEGORY_STYLES[cat].selectedBg,
                                }}
                                className="h-2"
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )
                ) : periodSpending.totalSpent === 0 ? (
                  <Text className="text-xs text-gray-500">
                    No spending yet for this month.
                  </Text>
                ) : (
                  <View className="gap-4">
                    {sortedSpendingCategories.map((cat) => {
                      const spent = periodSpending.totals[cat];
                      if (spent <= 0) return null;
                      const pctSpent = periodSpending.totalSpent
                        ? (spent / periodSpending.totalSpent) * 100
                        : 0;
                      return (
                        <View key={cat} className="gap-2">
                          <View className="flex-row items-center justify-between gap-3">
                            <Text className="text-sm font-semibold text-white">{cat}</Text>
                            <Text className="text-xs text-gray-500">
                              {pctSpent.toFixed(0)}% - ${spent.toFixed(0)}
                            </Text>
                          </View>
                          <View className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
                            <View
                              style={{
                                width: `${Math.min(100, pctSpent)}%`,
                                backgroundColor:
                                  CATEGORY_STYLES[cat].selectedBg,
                              }}
                              className="h-2"
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="overflow-hidden rounded-[28px] border border-border bg-card px-5 py-5 gap-3">
                <Text className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Month log
                </Text>
                {visiblePeriodLogTxs.map((tx) => (
                  <View
                    key={tx.id}
                    className={`rounded-[18px] border border-border bg-cardAlt flex-row items-center gap-3 overflow-hidden ${
                      tx.isSystem ? "opacity-50" : "opacity-100"
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
                            <Text className="font-medium text-white">
                              {tx.note}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {tx.category} • {tx.date}{" "}
                              {tx.isSystem && "(Auto)"}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text className="font-medium text-white">
                              {tx.category}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {tx.category} • {tx.date}{" "}
                              {tx.isSystem && "(Auto)"}
                            </Text>
                          </>
                        )}
                      </View>
                      <Text
                        className={`text-base font-semibold ${
                          tx.amount > 0 ? "" : "text-white"
                        }`}
                        style={
                          tx.amount > 0
                            ? { color: budgetTheme.accentText }
                            : undefined
                        }
                      >
                        {formatMoney2(tx.amount)}
                      </Text>
                    </View>
                  </View>
                ))}
                {visiblePeriodLogTxs.length === 0 && (
                  <Text className="text-center text-gray-600 mt-2">
                    No transactions found
                  </Text>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View className="border-t border-white/8 bg-background px-6 py-3">
          <View className="flex-row items-stretch rounded-[18px] border border-border bg-card p-1.5">
            <Pressable
              onPress={() => setViewMode("day")}
              className="flex-1 items-center rounded-xl py-3"
              style={
                viewMode === "day"
                  ? { backgroundColor: budgetTheme.accent }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "day" ? "" : "text-gray-500"
                }`}
                style={
                  viewMode === "day"
                    ? { color: budgetTheme.onAccent }
                    : undefined
                }
              >
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode("period")}
              className="flex-1 items-center rounded-xl py-3"
              style={
                viewMode === "period"
                  ? { backgroundColor: budgetTheme.accent }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "period" ? "" : "text-gray-500"
                }`}
                style={
                  viewMode === "period"
                    ? { color: budgetTheme.onAccent }
                    : undefined
                }
              >
                Month
              </Text>
            </Pressable>
          </View>
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={!!editingId}
          onRequestClose={handleCancelEdit}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end"
          >
            <Pressable
              className="flex-1 bg-black/60 justify-end"
              onPress={handleCancelEdit}
            >
              <Pressable
                className="rounded-t-[32px] border-t border-border bg-background px-6 pt-4"
                style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                onPress={() => {}}
              >
                <View className="items-center pb-3">
                  <View className="h-1.5 w-14 rounded-full bg-white/10" />
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 18, paddingBottom: 8 }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Transaction
                      </Text>
                      <Text className="text-2xl font-bold text-white">
                        Edit transaction
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleCancelEdit}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2"
                    >
                      <Text className="text-sm font-medium text-gray-300">
                        Close
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row gap-3">
                    <TextInput
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#6b7280"
                      className="flex-1 rounded-[18px] border border-border bg-cardAlt p-4 text-white"
                    />
                    <TextInput
                      keyboardType="decimal-pad"
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder="$"
                      placeholderTextColor="#6b7280"
                      className="w-32 rounded-[18px] border border-border bg-cardAlt p-4 text-white"
                      style={{ paddingVertical: 0 }}
                    />
                  </View>
                  <CategoryGrid
                    selected={editCategory}
                    onSelect={setEditCategory}
                  />
                  <TextInput
                    placeholder="Note (optional)"
                    placeholderTextColor="#6b7280"
                    value={editNote}
                    onChangeText={setEditNote}
                    className="min-h-[88px] rounded-[18px] border border-border bg-cardAlt px-4 py-4 text-base text-white"
                    multiline
                    textAlignVertical="top"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleSaveEdit}
                      className="flex-1 items-center rounded-[18px] p-4"
                      style={{ backgroundColor: budgetTheme.accent }}
                    >
                      <Text
                        className="font-semibold"
                        style={{ color: budgetTheme.onAccent }}
                      >
                        Save
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCancelEdit}
                      className="flex-1 items-center rounded-[18px] bg-cardAlt p-4"
                    >
                      <Text className="text-gray-300 font-semibold">
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          transparent
          animationType="none"
          visible={showAddSheet}
          onRequestClose={closeAddSheet}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end"
          >
            <Animated.View
              className="absolute inset-0 bg-black"
              style={addSheetBackdropStyle}
            >
              <Pressable
                className="flex-1"
                onPress={closeAddSheet}
              />
            </Animated.View>
            <Animated.View
              className="rounded-t-[32px] border-t border-border bg-background px-6 pt-4"
              style={[
                addSheetStyle,
                {
                  maxHeight: "82%",
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              <View className="items-center pb-3">
                <View className="h-1.5 w-14 rounded-full bg-white/10" />
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 20, paddingBottom: 8 }}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Quick log
                    </Text>
                    <Text className="text-2xl font-bold text-white">
                      Add transaction
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeAddSheet}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  >
                    <Text className="text-sm font-medium text-gray-300">
                      Close
                    </Text>
                  </Pressable>
                </View>

                <View className="rounded-[28px] border border-border bg-cardAlt px-5 py-5">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Amount
                  </Text>
                  <View className="mt-3 min-h-[64px] flex-row items-end">
                    <Text className="pb-2 pr-2 text-[32px] font-bold leading-[36px] text-gray-500">
                      $
                    </Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#6b7280"
                      className="flex-1 text-[52px] font-bold leading-[60px] text-white"
                      value={amount}
                      onChangeText={setAmount}
                      autoFocus
                      style={{ paddingTop: 6, paddingBottom: 1 }}
                    />
                  </View>
                </View>

                <View className="gap-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {quickLogCategories.map((cat) => {
                      const isSelected = selectedCat === cat;
                      const styles = CATEGORY_STYLES[cat];
                      const textStyle = isSelected
                        ? CATEGORY_TEXT_COLORS[cat].selected
                        : CATEGORY_TEXT_COLORS[cat].badge;

                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setSelectedCat(cat)}
                          className="rounded-full border px-4 py-3"
                          style={{
                            backgroundColor: isSelected
                              ? styles.selectedBg
                              : styles.unselectedBg,
                            borderColor: isSelected
                              ? styles.selectedBg
                              : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <Text className={`text-sm font-semibold ${textStyle}`}>
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="gap-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Note
                  </Text>
                  <TextInput
                    placeholder="Optional note"
                    placeholderTextColor="#6b7280"
                    value={note}
                    onChangeText={setNote}
                    className="min-h-[88px] rounded-[18px] border border-border bg-cardAlt px-4 py-4 text-base text-white"
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  onPress={handleSaveQuickTransaction}
                  disabled={!canSaveQuickLog}
                  className={`items-center rounded-[18px] py-4 ${
                    canSaveQuickLog ? "" : "bg-[#2a2a2a]"
                  }`}
                  style={
                    canSaveQuickLog
                      ? { backgroundColor: budgetTheme.accent }
                      : undefined
                  }
                >
                  <Text
                    className={`text-base font-bold ${
                      canSaveQuickLog ? "" : "text-gray-500"
                    }`}
                    style={
                      canSaveQuickLog
                        ? { color: budgetTheme.onAccent }
                        : undefined
                    }
                  >
                    Save transaction
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>

      {viewMode === "day" ? (
        <Pressable
          onPress={() => setShowAddSheet(true)}
          className="absolute right-6 h-16 w-16 items-center justify-center rounded-full border"
          style={{
            bottom: insets.bottom + 88,
            backgroundColor: budgetTheme.accent,
            borderColor: budgetTheme.accentBorderStrong,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.24,
            shadowRadius: 18,
            elevation: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
        >
          <Plus size={28} color={budgetTheme.onAccent} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {pendingDelete && (
        <View
          className="absolute left-6 right-6 rounded-[18px] bg-card border border-border px-4 py-3 flex-row items-center justify-between"
          style={{ bottom: insets.bottom + (viewMode === "day" ? 96 : 24) }}
        >
          <Text className="text-sm text-gray-200">
            Deleted {pendingDelete.tx.category}
          </Text>
          <Pressable onPress={handleUndoDelete} className="px-3 py-1">
            <Text className="text-sm text-blue-400 font-semibold">Undo</Text>
          </Pressable>
        </View>
      )}

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
                        Select date
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2"
                    >
                      <Text className="text-sm font-medium text-gray-300">
                        Done
                      </Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                  />
                </Pressable>
              </Pressable>
            </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
          />
        ))}
    </SafeAreaView>
  );
}
