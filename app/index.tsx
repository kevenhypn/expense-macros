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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Settings, RefreshCw, Trash2 } from "lucide-react-native";
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
  const { availableToSpend } = calculateFinancials(config);

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
            className="px-6 flex-row gap-4 mb-6"
          >
            <View className="flex-1">
              <SummaryCard
                title="Period Budget"
                mainValue={`$${periodLeft.toFixed(0)}`}
                mainIsPositive={periodLeft >= 0}
                subValue={`$${availableToSpend.toFixed(0)} total`}
                footerText={`Spent: $${discretionarySpent.toFixed(0)} • Day ${daysPassed}`}
              />
            </View>
            <View className="flex-1">
              <SummaryCard
                title="Today's Budget"
                mainValue={`$${todayLeft.toFixed(0)}`}
                mainIsPositive={todayLeft >= 0}
                subValue={`$${dailyBudget.toFixed(0)} total`}
                footerText="Daily limit"
              />
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
                        {tx.note || tx.date} {tx.isSystem && "(Auto)"}
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
                      onPress={() => handleDeleteTransaction(tx.id)}
                      className="p-1"
                    >
                      <Trash2 size={18} color="#6b7280" />
                    </Pressable>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
