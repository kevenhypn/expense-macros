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
  const todayISO = getTodayISO();
  const { availableToSpend: baseAvailableToSpend } = calculateFinancials(config);

  // Filter for current month
  const currentMonthTxs = transactions.filter((t) =>
    isSameMonth(t.date, todayISO)
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
  const daysPassed = new Date().getDate();

  // Today's Budget Logic
  const dim = daysInMonth(todayISO);
  const dailyBudget = availableToSpend / dim;

  const todayTxs = currentMonthTxs.filter((t) => t.date === todayISO);
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
      date: getTodayISO(),
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
    return currentMonthTxs
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
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
            <Text className="text-3xl font-bold text-white">Today</Text>
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
                  title="Period Budget"
                  mainValue={`$${periodLeft.toFixed(0)}`}
                  mainIsPositive={periodLeft >= 0}
                  subValue={`$${availableToSpend.toFixed(0)} total`}
                  footerText={`Spent: $${discretionarySpent.toFixed(0)} • Day ${daysPassed}`}
                >
                  {expandedCard === "period" && (
                    <View className="gap-3">
                      <Text className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                        Period log
                      </Text>
                      {periodSpending.totalSpent === 0 ? (
                        <Text className="text-xs text-gray-500 mb-2">
                          No spending yet for this period.
                        </Text>
                      ) : (
                        <View className="gap-4 mb-2">
                          {spendingCategories.map((cat) => {
                            const spent = periodSpending.totals[cat];
                            if (spent <= 0) return null;
                            const pctSpent = periodSpending.totalSpent
                              ? (spent / periodSpending.totalSpent) * 100
                              : 0;
                            const pctIncome = config.monthlyIncome
                              ? (spent / config.monthlyIncome) * 100
                              : 0;
                            return (
                              <View key={cat} className="gap-2">
                                <View className="flex-row justify-between">
                                  <Text className="text-sm text-white">{cat}</Text>
                                  <Text className="text-xs text-gray-500">
                                    {pctSpent.toFixed(0)}% spent • {pctIncome.toFixed(0)}% income
                                  </Text>
                                </View>
                                <View className="gap-2">
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
                                  <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                    <View
                                      style={{
                                        width: `${Math.min(100, pctIncome)}%`,
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
                  title="Today's Budget"
                  mainValue={`$${todayLeft.toFixed(0)}`}
                  mainIsPositive={todayLeft >= 0}
                  subValue={`$${dailyBudget.toFixed(0)} total`}
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
                                  <Text className="text-sm text-white">{cat}</Text>
                                  <Text className="text-xs text-gray-500">
                                    {pctSpent.toFixed(0)}% spent • {pctIncome.toFixed(0)}% income
                                  </Text>
                                </View>
                                <View className="gap-2">
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
                                  <View className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                    <View
                                      style={{
                                        width: `${Math.min(100, pctIncome)}%`,
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
                                  {tx.note ? `${tx.note} • ${tx.date}` : tx.date}
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
                <View
                  key={tx.id}
                  className="gap-2"
                >
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
                          backgroundColor: CATEGORY_STYLES[tx.category].badgeBg,
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
                          {tx.note ? `${tx.note} • ${tx.date}` : tx.date}{" "}
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
        </ScrollView>

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
    </SafeAreaView>
  );
}
