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
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Settings,
  RefreshCw,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
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
import { SummaryCard } from "../components/SummaryCard";
import { AmountToggle } from "../components/AmountToggle";
import { CategoryGrid } from "../components/CategoryGrid";
import { CATEGORY_STYLES, CATEGORY_TEXT_COLORS } from "../lib/categoryStyles";
import { formatMoney0, formatMoney2 } from "../src/utils/money";

type FilterType = "All" | "Spending" | "Bills" | "Savings" | "Income";

export default function Dashboard() {
  const router = useRouter();
  const { config, transactions, setTransactions, isLoading, refresh } =
    useAppData();

  // UI State
  const [amount, setAmount] = useState("");
  const [isIncome, setIsIncome] = useState(false);
  const [selectedCat, setSelectedCat] = useState<TransactionCategory>("Food");
  const [note, setNote] = useState("");
  const [filter] = useState<FilterType>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<"period" | "today" | null>(
    null
  );
  const [showAllMonthFlows, setShowAllMonthFlows] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
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

  const spendingCategories = [
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Other",
  ] as const;
  type SpendingCategory = (typeof spendingCategories)[number];
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
  const reimbursementCategories: TransactionCategory[] = [
    ...spendingCategories,
  ];
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
    if (!isIncome) return;
    if (!isSpendingCategory(selectedCat)) {
      setSelectedCat("Other");
    }
  }, [isIncome, selectedCat]);

  useEffect(() => {
    if (!config) return;
    const nextSpareMode = config.spareMoneyMode ?? true;
    setShowAllMonthFlows(!nextSpareMode);
  }, [config]);

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

  const todayTxs = selectedDayTxs;
  const todayNet = todayTxs.reduce((sum, t) => {
    if (!isSpendingCategory(t.category)) return sum;
    return sum + t.amount;
  }, 0);
  const todaySpent = -todayNet;
  const todayReimbursed = todayTxs.reduce((sum, t) => {
    if (!isSpendingCategory(t.category)) return sum;
    if (t.amount <= 0) return sum;
    return sum + t.amount;
  }, 0);

  const todayLeft = dailyBudget - todaySpent;
  const safeToSpendToday = dailyBudget;
  const remainingToday = todayLeft;
  const daysLeftInMonth = dim - selectedDay + 1;
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
  const todaySpending = buildSpendingTotals(todayTxs);
  const fullExpenses = buildExpenseTotals(currentMonthTxs);
  const shouldHideFullFlows = spareMoneyMode && !showAllMonthFlows;
  const monthExpenseCategories = shouldHideFullFlows
    ? (expenseCategories.filter((cat) => cat !== "Bills") as ExpenseCategory[])
    : expenseCategories;

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
  const todaySpendingTxs = todayTxs.filter((t) =>
    spendingCategories.includes(t.category as SpendingCategory)
  );

  // --- Handlers ---

  const handleAddTransaction = async () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;

    const safeCategory =
      isIncome && !isSpendingCategory(selectedCat) ? "Other" : selectedCat;

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDateISO,
      amount: isIncome ? Math.abs(val) : -Math.abs(val),
      category: safeCategory,
      note: note,
      isSystem: false,
    };

    const newTxs = [newTx, ...transactions];
    setTransactions(newTxs);
    await saveTransactions(newTxs);
    Vibration.vibrate(10);

    // Reset form
    setAmount("");
    setNote("");
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
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
              {/* Summary Cards */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(100)}
                className="px-6 flex-col gap-4 mb-6"
              >
                <View>
                  <Pressable
                    onPress={() =>
                      setExpandedCard(expandedCard === "period" ? null : "period")
                    }
                  >
                    <SummaryCard
                      title="Left this month"
                      mainValue={formatMoney0(monthLeft)}
                      mainIsPositive={monthLeft >= 0}
                      subValue={`${formatMoney0(monthBudgetTotal)} budget  ${daysLeftInMonth} days left`}
                      footerText={`${nextResetLabel}  Tap for month breakdown`}
                    >
                      {expandedCard === "period" && (
                        <View className="gap-3">
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">
                              Left this month
                            </Text>
                            <Text
                              className={`text-sm font-semibold ${
                                monthLeft >= 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {formatMoney0(monthLeft)}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">
                              Spent so far
                            </Text>
                            <Text className="text-sm font-semibold text-white">
                              {formatMoney0(discretionarySpent)}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">
                              Overspent days
                            </Text>
                            <Text className="text-sm font-semibold text-white">
                              {overspentDays}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-gray-500">
                              Budget mode
                            </Text>
                            <Text className="text-sm font-semibold text-white">
                              {rolloverUnspent ? "rollover" : "fixed"}
                            </Text>
                          </View>
                        </View>
                      )}
                    </SummaryCard>
                  </Pressable>
                </View>
                <View>
                  <Pressable
                    onPress={() =>
                      setExpandedCard(expandedCard === "today" ? null : "today")
                    }
                  >
                    <SummaryCard
                      title="Safe to spend today"
                      mainValue={formatMoney0(remainingToday)}
                      mainIsPositive={remainingToday >= 0}
                      subValue={`${formatMoney0(safeToSpendToday)} safe today  ${
                        rolloverUnspent ? "rollover" : "fixed"
                      }`}
                      footerText="Updates as you spend"
                    >
                      {expandedCard === "today" && (
                        <View className="gap-3">
                          <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                            Today's guide
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            <View className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                              <Text className="text-xs text-gray-300">
                                Net today: {formatMoney0(todayNet)}
                              </Text>
                            </View>
                            <View className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                              <Text className="text-xs text-emerald-200">
                                Reimbursed: {formatMoney0(todayReimbursed)}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                            Today's spending
                          </Text>
                          {todaySpending.totalSpent === 0 ? (
                            <Text className="text-xs text-gray-500 mb-2">
                              No spending yet today.
                            </Text>
                          ) : (
                            <View className="gap-4 mb-2">
                              {spendingCategories.map((cat) => {
                                const spent = todaySpending.totals[cat];
                                if (spent <= 0) return null;
                                const pctSpent = todaySpending.totalSpent
                                  ? (spent / todaySpending.totalSpent) * 100
                                  : 0;
                                const pctIncome = config.monthlyIncome
                                  ? (spent / config.monthlyIncome) * 100
                                  : 0;
                                return (
                                  <View key={cat} className="gap-2">
                                    <View className="flex-row justify-between">
                                      <Text className="text-sm text-white">
                                        {cat}
                                      </Text>
                                      <Text className="text-xs text-gray-500">
                                        {pctSpent.toFixed(0)}% spent -{" "}
                                        {pctIncome.toFixed(0)}% income
                                      </Text>
                                    </View>
                                    <View className="gap-2">
                                      <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                        <View
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              pctSpent
                                            )}%`,
                                            backgroundColor:
                                              CATEGORY_STYLES[cat].selectedBg,
                                          }}
                                          className="h-2"
                                        />
                                      </View>
                                      <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                        <View
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              pctIncome
                                            )}%`,
                                            backgroundColor:
                                              CATEGORY_STYLES[cat].unselectedBg,
                                          }}
                                          className="h-2"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                          <View className="gap-3">
                            {todaySpendingTxs.map((tx) => (
                              <View
                                key={tx.id}
                                className={`rounded-2xl border border-border bg-[#151515] px-3 py-3 flex-row justify-between items-center gap-3 ${
                                  tx.isSystem ? "opacity-50" : "opacity-100"
                                }`}
                              >
                                <View className="flex-row gap-3 items-center flex-1">
                                  <View
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor:
                                        CATEGORY_STYLES[tx.category].badgeBg,
                                    }}
                                  >
                                    <Text
                                      className={`text-[10px] font-bold ${
                                        CATEGORY_TEXT_COLORS[tx.category].badge
                                      }`}
                                    >
                                      {tx.category[0]}
                                    </Text>
                                  </View>
                                  <View className="flex-1">
                                    {tx.note ? (
                                      <>
                                        <Text className="font-medium text-white">
                                          {tx.note}
                                        </Text>
                                        <Text className="text-xs text-gray-500">
                                          {tx.date}
                                        </Text>
                                      </>
                                    ) : (
                                      <>
                                        <Text className="font-medium text-white">
                                          {tx.category}
                                        </Text>
                                        <Text className="text-xs text-gray-500">
                                          {tx.date}
                                        </Text>
                                      </>
                                    )}
                                  </View>
                                </View>
                                <Text className="text-base font-semibold text-white">
                                  {formatMoney2(tx.amount)}
                                </Text>
                              </View>
                            ))}
                            {todaySpendingTxs.length === 0 && (
                              <Text className="text-center text-gray-600 mt-2">
                                No transactions found
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </SummaryCard>
                  </Pressable>
                </View>
              </Animated.View>

              {/* Add Transaction Form */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(200)}
                className="px-6 mb-8"
              >
                <Pressable
                  onPress={() => setShowAddCard(true)}
                  className="w-full rounded-3xl border border-[#2f2f2f] bg-[#1a1a1a] p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-1 h-12 rounded-full bg-emerald-400/80" />
                    <View className="gap-1">
                      <Text className="text-white font-semibold text-base">
                        Add transaction
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Tap to enter amount and details
                      </Text>
                    </View>
                  </View>
                  <View className="h-10 px-4 rounded-full bg-emerald-400/15 items-center justify-center border border-emerald-400/30">
                    <Text className="text-emerald-200 font-semibold">
                      Amount
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Log Section */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(300)}
                className="mx-6 mb-2 bg-card border border-border rounded-3xl min-h-[360px] p-5"
              >
                <View className="flex-row items-end justify-between mb-5">
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
                      className={`rounded-2xl border border-border bg-[#151515] px-3 py-3 ${
                        tx.isSystem ? "opacity-60" : "opacity-100"
                      }`}
                    >
                      <View className="flex-row justify-between items-center gap-3">
                        <View className="flex-row gap-3 items-center flex-1">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                CATEGORY_STYLES[tx.category].badgeBg,
                            }}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                CATEGORY_TEXT_COLORS[tx.category].badge
                              }`}
                            >
                              {tx.category[0]}
                            </Text>
                          </View>
                          <View className="flex-1">
                            {tx.note ? (
                              <>
                                <Text className="font-medium text-white">
                                  {tx.note}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                  {tx.date} {tx.isSystem && "(Auto)"}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text className="font-medium text-white">
                                  {tx.category}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                  {tx.date} {tx.isSystem && "(Auto)"}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text
                            className={`text-base font-semibold ${
                              tx.amount > 0 ? "text-green-500" : "text-white"
                            }`}
                          >
                            {formatMoney2(tx.amount)}
                          </Text>
                          <Pressable
                            onPress={() => handleStartEdit(tx)}
                            className="p-2 rounded-lg bg-white/5"
                          >
                            <Pencil size={18} color="#6b7280" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteTransaction(tx.id)}
                            className="p-2 rounded-lg bg-white/5"
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
                        Tap Add to create your first transaction.
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
              <View className="bg-card border border-border rounded-3xl p-5 gap-3">
                <Text className="text-gray-400 text-sm uppercase tracking-wider font-semibold">
                  Month breakdown
                </Text>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-xs text-gray-500">Left</Text>
                    <Text
                      className={`text-2xl font-bold ${
                        periodLeft >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {formatMoney0(periodLeft)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-gray-500">
                      Overspent days
                    </Text>
                    <Text className="text-2xl font-bold text-white">
                      {overspentDays}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-xs text-gray-500">Spent</Text>
                    <Text className="text-lg font-semibold text-white">
                      {formatMoney0(discretionarySpent)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500">Budget mode</Text>
                    <Text className="text-lg font-semibold text-white">
                      {rolloverUnspent ? "Rollover" : "Fixed"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-card border border-border rounded-3xl p-5 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Category breakdown
                  </Text>
                  <Pressable
                    onPress={() => setShowAllMonthFlows((prev) => !prev)}
                    className="px-3 py-1.5 rounded-full border border-border bg-white/5"
                  >
                    <Text className="text-[11px] text-gray-300 font-semibold">
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
                      {monthExpenseCategories.map((cat) => {
                        const spent = fullExpenses.totals[cat];
                        if (spent <= 0) return null;
                        const pct = pctOfIncome(spent);
                        return (
                          <View key={cat} className="gap-2">
                            <View className="flex-row justify-between">
                              <Text className="text-sm text-white">{cat}</Text>
                              <Text className="text-xs text-gray-500">
                                {pct.toFixed(0)}% - ${spent.toFixed(0)}
                              </Text>
                            </View>
                            <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
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
                    {spendingCategories.map((cat) => {
                      const spent = periodSpending.totals[cat];
                      if (spent <= 0) return null;
                      const pctSpent = periodSpending.totalSpent
                        ? (spent / periodSpending.totalSpent) * 100
                        : 0;
                      return (
                        <View key={cat} className="gap-2">
                          <View className="flex-row justify-between">
                            <Text className="text-sm text-white">{cat}</Text>
                            <Text className="text-xs text-gray-500">
                              {pctSpent.toFixed(0)}% - ${spent.toFixed(0)}
                            </Text>
                          </View>
                          <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
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

              <View className="bg-card border border-border rounded-3xl p-5 gap-3">
                <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Month log
                </Text>
                {visiblePeriodLogTxs.map((tx) => (
                  <View
                    key={tx.id}
                    className={`rounded-2xl border border-border bg-[#151515] px-3 py-3 flex-row justify-between items-center gap-3 ${
                      tx.isSystem ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <View className="flex-row gap-3 items-center flex-1">
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: CATEGORY_STYLES[tx.category].badgeBg,
                        }}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            CATEGORY_TEXT_COLORS[tx.category].badge
                          }`}
                        >
                          {tx.category[0]}
                        </Text>
                      </View>
                      <View className="flex-1">
                        {tx.note ? (
                          <>
                            <Text className="font-medium text-white">
                              {tx.note}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {tx.date} {tx.isSystem && "(Auto)"}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text className="font-medium text-white">
                              {tx.category}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {tx.date} {tx.isSystem && "(Auto)"}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text
                      className={`text-base font-semibold ${
                        tx.amount > 0 ? "text-green-500" : "text-white"
                      }`}
                    >
                      {formatMoney2(tx.amount)}
                    </Text>
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

        <View className="border-t border-border bg-background px-6 py-3">
          <View className="flex-row items-stretch rounded-2xl border border-border bg-cardAlt p-1">
            <Pressable
              onPress={() => setViewMode("day")}
              className={`flex-1 py-3 items-center rounded-xl ${
                viewMode === "day" ? "bg-white/10" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "day" ? "text-white" : "text-gray-500"
                }`}
              >
                Day + Log
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode("period")}
              className={`flex-1 py-3 items-center rounded-xl ${
                viewMode === "period" ? "bg-white/10" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "period" ? "text-white" : "text-gray-500"
                }`}
              >
                Month Breakdown
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
            className="flex-1"
          >
            <Pressable
              className="flex-1 bg-black/60 justify-end px-6 pb-8"
              onPress={handleCancelEdit}
            >
              <Pressable
                className="bg-background border border-border rounded-3xl p-5 gap-4"
                onPress={() => {}}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400 uppercase tracking-wider">
                    Edit transaction
                  </Text>
                  <Pressable onPress={handleCancelEdit}>
                    <Text className="text-xs text-gray-400">Close</Text>
                  </Pressable>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
                >
                  <View className="flex-row gap-3">
                    <TextInput
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#6b7280"
                      className="flex-1 bg-borderAlt p-3 rounded-xl text-white border border-border"
                    />
                    <TextInput
                      keyboardType="decimal-pad"
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder="$"
                      placeholderTextColor="#6b7280"
                      className="w-28 bg-borderAlt p-3 rounded-xl text-white border border-border"
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
                    className="w-full border-b border-border pb-2 text-gray-400"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleSaveEdit}
                      className="flex-1 bg-green-600 p-3 rounded-xl items-center"
                    >
                      <Text className="text-white font-semibold">Save</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCancelEdit}
                      className="flex-1 bg-[#2a2a2a] p-3 rounded-xl items-center"
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
          animationType="fade"
          visible={showAddCard}
          onRequestClose={() => setShowAddCard(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <Pressable
              className="flex-1 bg-black/60 justify-end px-6 pb-8"
              onPress={() => setShowAddCard(false)}
            >
              <Pressable
                className="bg-background border border-border rounded-3xl p-5 gap-4"
                onPress={() => {}}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400 uppercase tracking-wider">
                    New transaction
                  </Text>
                  <Pressable onPress={() => setShowAddCard(false)}>
                    <Text className="text-xs text-gray-400">Close</Text>
                  </Pressable>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
                >
                  <AmountToggle
                    amount={amount}
                    setAmount={setAmount}
                    isIncome={isIncome}
                    setIsIncome={setIsIncome}
                  />
                  <CategoryGrid
                    selected={selectedCat}
                    onSelect={setSelectedCat}
                    allowedCategories={
                      isIncome ? reimbursementCategories : undefined
                    }
                  />
                  <TextInput
                    placeholder="Note (optional)"
                    placeholderTextColor="#6b7280"
                    value={note}
                    onChangeText={setNote}
                    className="w-full border-b border-border pb-2 text-gray-400"
                  />
                  <Pressable
                    onPress={async () => {
                      const val = parseFloat(amount);
                      if (!val || isNaN(val)) return;
                      await handleAddTransaction();
                      setShowAddCard(false);
                    }}
                    className={`w-full py-4 rounded-2xl shadow-lg items-center ${
                      isIncome ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    <Text className="text-white font-bold text-base">
                      Add Transaction
                    </Text>
                  </Pressable>
                </ScrollView>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>

      {pendingDelete && (
        <View className="absolute bottom-6 left-6 right-6 rounded-2xl bg-[#1a1a1a] border border-border px-4 py-3 flex-row items-center justify-between">
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
                className="bg-[#1c1c1e] p-4 rounded-t-2xl"
                onPress={() => {}}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white text-base font-semibold">
                    Select date
                  </Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text className="text-blue-400">Done</Text>
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
