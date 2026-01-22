import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Settings, RefreshCw, Trash2, Pencil } from "lucide-react-native";
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
  const [filter, setFilter] = useState<FilterType>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<"period" | "today" | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"day" | "period">("day");
  const [selectedDateISO, setSelectedDateISO] = useState(getTodayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>("Food");

  // Redirect to setup if no config
  useEffect(() => {
    if (!isLoading && !config) {
      router.replace("/setup");
    }
  }, [isLoading, config, router]);

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
  const discretionarySpent = currentMonthTxs.reduce((sum, t) => {
    if (["Bills", "Savings", "Income"].includes(t.category)) return sum;
    if (t.amount < 0) return sum + Math.abs(t.amount);
    return sum;
  }, 0);

  const incomeAdjustments = currentMonthTxs.reduce((sum, t) => {
    if (t.isSystem) return sum;
    if (t.amount <= 0) return sum;
    return sum + Math.abs(t.amount);
  }, 0);

  const availableToSpend = baseAvailableToSpend + incomeAdjustments;
  const periodLeft = availableToSpend - discretionarySpent;
  const daysPassed = selectedDate.getDate();

  // Today's Budget Logic
  const dim = daysInMonth(selectedDateISO);
  const baseDailyBudget = availableToSpend / dim;
  const monthPrefix = selectedDateISO.slice(0, 7);
  const selectedDay = selectedDate.getDate();
  const selectedDayTxs = currentMonthTxs.filter(
    (t) => t.date === selectedDateISO
  );
  const spendingByDate = currentMonthTxs.reduce(
    (acc, t) => {
      if (["Bills", "Savings", "Income"].includes(t.category)) return acc;
      if (t.amount < 0) {
        acc[t.date] = (acc[t.date] ?? 0) + Math.abs(t.amount);
      }
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
      const spent = spendingByDate[dateISO] ?? 0;
      if (spent > dayBudget) overspentDays += 1;
      if (day === selectedDay) dailyBudget = dayBudget;
      remainingBudget -= spent;
    }
  } else {
    for (let day = 1; day <= dim; day += 1) {
      const dateISO = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      const spent = spendingByDate[dateISO] ?? 0;
      if (spent > baseDailyBudget) overspentDays += 1;
    }
  }

  const todayTxs = selectedDayTxs;
  const todaySpent = todayTxs.reduce((sum, t) => {
    if (["Bills", "Savings", "Income"].includes(t.category)) return sum;
    if (t.amount < 0) return sum + Math.abs(t.amount);
    return sum;
  }, 0);

  const todayLeft = dailyBudget - todaySpent;

  const spendingCategories = [
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Other",
  ] as const;
  type SpendingCategory = (typeof spendingCategories)[number];

  const buildSpendingTotals = (txs: Transaction[]) => {
    const totals: Record<SpendingCategory, number> = {
      Food: 0,
      Shopping: 0,
      Transport: 0,
      Entertainment: 0,
      Other: 0,
    };

    txs.forEach((t) => {
      if (t.amount >= 0) return;
      if (!spendingCategories.includes(t.category as SpendingCategory)) return;
      totals[t.category as SpendingCategory] += Math.abs(t.amount);
    });

    const totalSpent = Object.values(totals).reduce((sum, val) => sum + val, 0);
    return { totals, totalSpent };
  };

  const periodSpending = buildSpendingTotals(currentMonthTxs);
  const todaySpending = buildSpendingTotals(todayTxs);

  const periodLogTxs = [...currentMonthTxs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const todaySpendingTxs = todayTxs.filter(
    (t) =>
      t.amount < 0 &&
      spendingCategories.includes(t.category as SpendingCategory)
  );

  // --- Handlers ---

  const handleAddTransaction = async () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDateISO,
      amount: isIncome ? Math.abs(val) : -Math.abs(val),
      category: selectedCat,
      note: note,
      isSystem: false,
    };

    const newTxs = [newTx, ...transactions];
    setTransactions(newTxs);
    await saveTransactions(newTxs);

    // Reset form
    setAmount("");
    setNote("");
  };

  const handleDeleteTransaction = async (id: string) => {
    const nextTxs = transactions.filter((tx) => tx.id !== id);
    setTransactions(nextTxs);
    await saveTransactions(nextTxs);
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
    handleCancelEdit();
  };

  // Filter Logic
  const getFilteredTransactions = () => {
    return selectedDayTxs
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
  const filters: FilterType[] = ["All", "Spending", "Bills", "Savings", "Income"];

  const handleDateChange = (_: unknown, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDateISO(date.toLocaleDateString("en-CA"));
    }
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
            <Pressable onPress={() => setShowDatePicker(true)} className="gap-1">
              <Text className="text-3xl font-bold text-white">
                {selectedDateLabel}
              </Text>
              <Text className="text-xs text-gray-400">Tap to change</Text>
            </Pressable>
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
                <View className="opacity-70">
                  <Pressable
                    onPress={() => {
                      setExpandedCard(null);
                      setViewMode("period");
                    }}
                  >
                    <SummaryCard
                      title="Period Budget"
                      mainValue={`$${periodLeft.toFixed(0)}`}
                      mainIsPositive={periodLeft >= 0}
                      subValue={`$${availableToSpend.toFixed(0)} total`}
                      footerText={`Tap for period breakdown • Day ${daysPassed}`}
                    />
                  </Pressable>
                </View>
                <View>
                  <Pressable
                    onPress={() =>
                      setExpandedCard(expandedCard === "today" ? null : "today")
                    }
                  >
                    <SummaryCard
                      title="Today's Budget"
                      mainValue={`$${todayLeft.toFixed(0)}`}
                      mainIsPositive={todayLeft >= 0}
                      subValue={`$${dailyBudget.toFixed(0)} ${
                        rolloverUnspent ? "rolling" : "fixed"
                      }`}
                      footerText="Daily limit"
                    >
                      {expandedCard === "today" && (
                        <View className="gap-3">
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
                                        {pctSpent.toFixed(0)}% spent •{" "}
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
                                className={`flex-row justify-between items-center gap-3 ${
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
                                    <Text className="font-medium text-white">
                                      {tx.category}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                      {tx.note
                                        ? `${tx.note} • ${tx.date}`
                                        : tx.date}
                                    </Text>
                                  </View>
                                </View>
                                <Text className="font-bold text-white">
                                  {tx.amount.toFixed(2)}
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
                <AmountToggle
                  amount={amount}
                  setAmount={setAmount}
                  isIncome={isIncome}
                  setIsIncome={setIsIncome}
                />
                <CategoryGrid selected={selectedCat} onSelect={setSelectedCat} />

                <TextInput
                  placeholder="Note (optional)"
                  placeholderTextColor="#6b7280"
                  value={note}
                  onChangeText={setNote}
                  className="w-full border-b border-border pb-2 mb-6 text-gray-400"
                />

                <Pressable
                  onPress={handleAddTransaction}
                  className={`w-full py-4 rounded-2xl shadow-lg items-center ${
                    isIncome ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  <Text className="text-white font-bold text-base">
                    Add Transaction
                  </Text>
                </Pressable>
              </Animated.View>

              {/* Log Section */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(300)}
                className="bg-cardAlt rounded-t-3xl min-h-[400px] p-6"
              >
                {/* Filter Tabs */}
                <View className="flex-row gap-3 mb-6 pb-2">
                  {filters.map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setFilter(f)}
                      className={`px-4 py-2 rounded-full ${
                        filter === f ? "bg-white" : "bg-[#2a2a2a]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          filter === f ? "text-black" : "text-gray-400"
                        }`}
                      >
                        {f}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Transaction List */}
                <View className="gap-4">
                  {filteredList.map((tx) => (
                    <View key={tx.id} className="gap-2">
                      <View
                        className={`flex-row justify-between items-center gap-3 ${
                          tx.isSystem ? "opacity-50" : "opacity-100"
                        }`}
                      >
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
                            <Text className="font-medium text-white">
                              {tx.category}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {tx.note
                                ? `${tx.note} • ${tx.date}`
                                : tx.date}{" "}
                              {tx.isSystem && "(Auto)"}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-3">
                          <Text
                            className={`font-bold ${
                              tx.amount > 0 ? "text-green-500" : "text-white"
                            }`}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {tx.amount.toFixed(2)}
                          </Text>
                          <Pressable
                            onPress={() => handleStartEdit(tx)}
                            className="p-1"
                          >
                            <Pencil size={18} color="#6b7280" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteTransaction(tx.id)}
                            className="p-1"
                          >
                            <Trash2 size={18} color="#6b7280" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                  {filteredList.length === 0 && (
                    <Text className="text-center text-gray-600 mt-10">
                      No transactions found
                    </Text>
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
                  Period breakdown
                </Text>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-xs text-gray-500">Left</Text>
                    <Text
                      className={`text-2xl font-bold ${
                        periodLeft >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      ${periodLeft.toFixed(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500">Overspent days</Text>
                    <Text className="text-2xl font-bold text-white">
                      {overspentDays}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-xs text-gray-500">Spent</Text>
                    <Text className="text-lg font-semibold text-white">
                      ${discretionarySpent.toFixed(0)}
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
                <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Category breakdown
                </Text>
                {periodSpending.totalSpent === 0 ? (
                  <Text className="text-xs text-gray-500">
                    No spending yet for this period.
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
                              {pctSpent.toFixed(0)}% • ${spent.toFixed(0)}
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

              <View className="bg-cardAlt rounded-3xl p-5 gap-3">
                <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Period log
                </Text>
                {periodLogTxs.map((tx) => (
                  <View
                    key={tx.id}
                    className={`flex-row justify-between items-center gap-3 ${
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
                        <Text className="font-medium text-white">
                          {tx.category}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {tx.note ? `${tx.note} • ${tx.date}` : tx.date}{" "}
                          {tx.isSystem && "(Auto)"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`font-bold ${
                        tx.amount > 0 ? "text-green-500" : "text-white"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
                {periodLogTxs.length === 0 && (
                  <Text className="text-center text-gray-600 mt-2">
                    No transactions found
                  </Text>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <View className="border-t border-border bg-background px-6 pt-3 pb-6">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setViewMode("day")}
              className={`flex-1 py-3 rounded-full items-center ${
                viewMode === "day" ? "bg-white" : "bg-[#2a2a2a]"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "day" ? "text-black" : "text-gray-400"
                }`}
              >
                Day + Log
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode("period")}
              className={`flex-1 py-3 rounded-full items-center ${
                viewMode === "period" ? "bg-white" : "bg-[#2a2a2a]"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "period" ? "text-black" : "text-gray-400"
                }`}
              >
                Period Breakdown
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
          <View className="flex-1 bg-black/60 justify-center px-6">
            <View className="bg-background border border-border rounded-3xl p-5 gap-4">
              <Text className="text-xs text-gray-400 uppercase tracking-wider">
                Edit transaction
              </Text>
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
                  <Text className="text-gray-300 font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>

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
                  display="spinner"
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
