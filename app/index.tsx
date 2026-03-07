import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  PanResponder,
  Keyboard,
  Pressable,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Vibration,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Settings,
  RefreshCw,
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
import { BudgetHero } from "../components/dashboard/BudgetHero";
import {
  TransactionRow,
  TRANSACTION_ROW_DELETE_DURATION,
} from "../components/dashboard/TransactionRow";
import { CategoryGrid } from "../components/CategoryGrid";
import { LiquidGlassSurface } from "../components/ui/LiquidGlassSurface";
import { LiquidGlassIconButton } from "../components/ui/LiquidGlassIconButton";
import { LiquidGlassChip } from "../components/ui/LiquidGlassChip";
import { BottomDock } from "../components/ui/BottomDock";
import { CATEGORY_STYLES, CATEGORY_TEXT_COLORS } from "../lib/categoryStyles";
import { GLASS } from "../src/theme/glass";
import { formatMoney0, formatMoney2 } from "../src/utils/money";
import { getBudgetTheme } from "../src/utils/budgetTheme";

type FilterType = "All" | "Spending" | "Bills" | "Savings" | "Income";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
  const [isAddSheetBlurReady, setIsAddSheetBlurReady] = useState(false);
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
  const [deletingTxIds, setDeletingTxIds] = useState<string[]>([]);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteAnimationTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const transactionsRef = useRef(transactions);
  const pendingDeleteRef = useRef(pendingDelete);
  const addAmountInputRef = useRef<TextInput>(null);
  const addSheetFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const addSheetBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const addSheetProgress = useSharedValue(0);
  const addSheetDragY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const focusAddAmountInput = useCallback(() => {
    if (addSheetFocusTimerRef.current) {
      clearTimeout(addSheetFocusTimerRef.current);
    }
    addSheetFocusTimerRef.current = setTimeout(() => {
      addAmountInputRef.current?.focus();
      addSheetFocusTimerRef.current = null;
    }, 110);
  }, []);

  const prepareAddSheetBlur = useCallback(() => {
    if (addSheetBlurTimerRef.current) {
      clearTimeout(addSheetBlurTimerRef.current);
    }
    addSheetBlurTimerRef.current = setTimeout(() => {
      setIsAddSheetBlurReady(true);
      addSheetBlurTimerRef.current = null;
    }, 120);
  }, []);

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
      if (addSheetFocusTimerRef.current) {
        clearTimeout(addSheetFocusTimerRef.current);
        addSheetFocusTimerRef.current = null;
      }
      if (addSheetBlurTimerRef.current) {
        clearTimeout(addSheetBlurTimerRef.current);
        addSheetBlurTimerRef.current = null;
      }
      setIsAddSheetBlurReady(false);
      addAmountInputRef.current?.blur();
      addSheetDragY.value = 0;
      addSheetProgress.value = 0;
      return;
    }

    setIsAddSheetBlurReady(false);
    addSheetProgress.value = withTiming(
      1,
      {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(prepareAddSheetBlur)();
        runOnJS(focusAddAmountInput)();
      }
    );
  }, [
    addSheetDragY,
    addSheetProgress,
    focusAddAmountInput,
    prepareAddSheetBlur,
    showAddSheet,
  ]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    pendingDeleteRef.current = pendingDelete;
  }, [pendingDelete]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }

      if (addSheetFocusTimerRef.current) {
        clearTimeout(addSheetFocusTimerRef.current);
        addSheetFocusTimerRef.current = null;
      }
      if (addSheetBlurTimerRef.current) {
        clearTimeout(addSheetBlurTimerRef.current);
        addSheetBlurTimerRef.current = null;
      }

      Object.values(deleteAnimationTimersRef.current).forEach(clearTimeout);
      deleteAnimationTimersRef.current = {};
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const closeAddSheet = useCallback(() => {
    if (addSheetFocusTimerRef.current) {
      clearTimeout(addSheetFocusTimerRef.current);
      addSheetFocusTimerRef.current = null;
    }
    if (addSheetBlurTimerRef.current) {
      clearTimeout(addSheetBlurTimerRef.current);
      addSheetBlurTimerRef.current = null;
    }
    setIsAddSheetBlurReady(false);
    addAmountInputRef.current?.blur();
    addSheetDragY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
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
  }, [addSheetDragY, addSheetProgress]);

  const addSheetBackdropStyle = useAnimatedStyle(() => ({
    opacity:
      addSheetProgress.value *
      0.6 *
      Math.max(0.32, 1 - Math.max(0, addSheetDragY.value) / 260),
  }));

  const addSheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (1 - addSheetProgress.value) * windowHeight + addSheetDragY.value,
      },
    ],
  }), [windowHeight]);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const snapAddSheetBack = useCallback(() => {
    addSheetDragY.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [addSheetDragY]);

  const addSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          if (addSheetFocusTimerRef.current) {
            clearTimeout(addSheetFocusTimerRef.current);
            addSheetFocusTimerRef.current = null;
          }
          addAmountInputRef.current?.blur();
          Keyboard.dismiss();
        },
        onPanResponderMove: (_, gestureState) => {
          const nextDrag =
            gestureState.dy < 0 ? gestureState.dy * 0.35 : gestureState.dy;
          addSheetDragY.value = Math.max(-36, Math.min(280, nextDrag));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 96 || gestureState.vy > 0.9) {
            closeAddSheet();
            return;
          }
          snapAddSheetBack();
        },
        onPanResponderTerminate: () => {
          snapAddSheetBack();
        },
      }),
    [addSheetDragY, closeAddSheet, snapAddSheetBack]
  );

  const handleStartEdit = useCallback((tx: Transaction) => {
    setEditingId(tx.id);
    setEditDate(tx.date);
    setEditAmount(String(Math.abs(tx.amount)));
    setEditNote(tx.note ?? "");
    setEditCategory(tx.category);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDate("");
    setEditAmount("");
    setEditNote("");
    setEditCategory("Food");
  }, []);

  const commitPendingDelete = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    pendingDeleteRef.current = null;
    setPendingDelete(null);
    void saveTransactions(pending.nextTxs);
  }, []);

  const handleDeleteTransaction = useCallback((id: string) => {
    if (deleteAnimationTimersRef.current[id]) return;

    const currentTransactions = transactionsRef.current;
    const txToDelete = currentTransactions.find((tx) => tx.id === id);
    if (!txToDelete) return;

    commitPendingDelete();

    setDeletingTxIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    Vibration.vibrate(10);

    deleteAnimationTimersRef.current[id] = setTimeout(() => {
      delete deleteAnimationTimersRef.current[id];
      setDeletingTxIds((prev) => prev.filter((txId) => txId !== id));

      const previousTxs = transactionsRef.current;
      if (!previousTxs.some((tx) => tx.id === id)) {
        return;
      }

      const nextTxs = previousTxs.filter((tx) => tx.id !== id);
      setTransactions(nextTxs);

      const nextPendingDelete = {
        tx: txToDelete,
        previousTxs,
        nextTxs,
      };

      pendingDeleteRef.current = nextPendingDelete;
      setPendingDelete(nextPendingDelete);

      deleteTimerRef.current = setTimeout(async () => {
        await saveTransactions(nextTxs);
        pendingDeleteRef.current = null;
        setPendingDelete(null);
        deleteTimerRef.current = null;
      }, 5000);
    }, TRANSACTION_ROW_DELETE_DURATION);
  }, [commitPendingDelete, setTransactions]);

  const handleUndoDelete = useCallback(async () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    setTransactions(pending.previousTxs);
    await saveTransactions(pending.previousTxs);
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, [setTransactions]);

  const openAddSheet = useCallback(() => {
    if (addSheetFocusTimerRef.current) {
      clearTimeout(addSheetFocusTimerRef.current);
      addSheetFocusTimerRef.current = null;
    }
    setShowAddSheet(true);
  }, []);

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
  const dockBottom = insets.bottom + 6;
  const dockHeight = 56;
  const scrollBottomPadding = dockBottom + dockHeight + 36;

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
  const deletingTxIdSet = new Set(deletingTxIds);
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
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
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
      <View className="flex-1">
        <Animated.ScrollView
          className="flex-1"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
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
          <View className="px-6 pb-3 pt-4 flex-row items-start justify-between">
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
            <LiquidGlassSurface
              variant="toolbar"
              scrollY={scrollY}
              tintColor={budgetTheme.accent}
              style={{ borderRadius: GLASS.rPill }}
              contentStyle={{
                flexDirection: "row",
                gap: 8,
                padding: 6,
              }}
            >
              <LiquidGlassIconButton
                icon={<RefreshCw size={22} color="#f5f7f6" />}
                onPress={onRefresh}
                size={42}
                tintColor={budgetTheme.accent}
                scrollY={scrollY}
                accessibilityLabel="Refresh budget"
              />
              <LiquidGlassIconButton
                icon={<Settings size={22} color="#f5f7f6" />}
                onPress={() => router.push("/setup")}
                size={42}
                tintColor={budgetTheme.accent}
                scrollY={scrollY}
                accessibilityLabel="Open settings"
              />
            </LiquidGlassSurface>
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
                className="mx-6 mb-2 overflow-hidden rounded-[28px] border border-border bg-card p-5"
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
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      accentTextColor={budgetTheme.accentText}
                      showActions={!tx.isSystem}
                      isDeleting={deletingTxIdSet.has(tx.id)}
                      onEdit={handleStartEdit}
                      onDelete={handleDeleteTransaction}
                    />
                  ))}
                  {filteredList.length === 0 && (
                    <View className="items-center gap-2 py-12">
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
                <View className="mt-5 rounded-[20px] border border-white/8 bg-white/5 px-4 py-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Spent this month
                    </Text>
                    <Text className="text-lg font-semibold text-white">
                      {formatMoney0(discretionarySpent)}
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
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    accentTextColor={budgetTheme.accentText}
                    systemOpacityClassName="opacity-50"
                  />
                ))}
                {visiblePeriodLogTxs.length === 0 && (
                  <Text className="text-center text-gray-600 mt-2">
                    No transactions found
                  </Text>
                )}
              </View>
            </Animated.View>
          )}
        </Animated.ScrollView>

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
              className="absolute inset-0"
              onPress={handleCancelEdit}
            >
              {Platform.OS === "ios" ? (
                <BlurView
                  intensity={24}
                  tint="systemMaterialDark"
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: "rgba(3, 5, 4, 0.46)" },
                ]}
              />
            </Pressable>
            <LiquidGlassSurface
              variant="card"
              tintColor={budgetTheme.accent}
              style={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
              contentStyle={{
                paddingHorizontal: GLASS.pad,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              <Pressable onPress={() => {}}>
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
                    <LiquidGlassChip
                      label="Close"
                      onPress={handleCancelEdit}
                      tintColor={budgetTheme.accent}
                    />
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
            </LiquidGlassSurface>
          </KeyboardAvoidingView>
        </Modal>

      </View>

      <BottomDock
        items={[
          { key: "day", label: "Today" },
          { key: "period", label: "Month" },
        ]}
        value={viewMode}
        onChange={(next) => setViewMode(next as "day" | "period")}
        onAddPress={openAddSheet}
        tintColor={budgetTheme.accent}
        scrollY={scrollY}
        bottomOffset={dockBottom}
      />

      {pendingDelete && (
        <View
          className="absolute left-6 right-6 rounded-[18px] bg-card border border-border px-4 py-3 flex-row items-center justify-between"
          style={{
            bottom: dockBottom + dockHeight + 16,
          }}
        >
          <Text className="text-sm text-gray-200">
            Deleted {pendingDelete.tx.category}
          </Text>
          <Pressable onPress={handleUndoDelete} className="px-3 py-1">
            <Text className="text-sm text-blue-400 font-semibold">Undo</Text>
          </Pressable>
        </View>
      )}

      <View
        pointerEvents={showAddSheet ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFillObject,
          {
            zIndex: 60,
          },
        ]}
      >
        <Animated.View
          className="absolute inset-0"
          style={addSheetBackdropStyle}
        >
          {Platform.OS === "ios" && isAddSheetBlurReady ? (
            <BlurView
              intensity={22}
              tint="systemMaterialDark"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(3, 5, 4, 0.42)" },
            ]}
          />
          <Pressable className="flex-1" onPress={closeAddSheet} />
        </Animated.View>
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: "flex-end",
            },
          ]}
        >
          <Animated.View
            className="overflow-hidden"
            style={[
              addSheetStyle,
              {
                maxHeight: "82%",
              },
            ]}
          >
            <LiquidGlassSurface
              variant="card"
              ambientMotion={false}
              blurEnabled={isAddSheetBlurReady}
              tintColor={budgetTheme.accent}
              style={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
              contentStyle={{
                paddingHorizontal: GLASS.pad,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, 20),
                maxHeight: "100%",
              }}
            >
              <View
                className="items-center pb-3"
                {...addSheetPanResponder.panHandlers}
              >
                <View className="items-center px-6 py-2">
                  <View className="h-1.5 w-14 rounded-full bg-white/10" />
                </View>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Quick log
                  </Text>
                  <Text className="text-2xl font-bold text-white">
                    Add transaction
                  </Text>
                </View>
                <LiquidGlassChip
                  label="Close"
                  onPress={closeAddSheet}
                  tintColor={budgetTheme.accent}
                />
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                removeClippedSubviews
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 20,
                  paddingTop: 20,
                  paddingBottom: 8,
                }}
                style={{ flexShrink: 1 }}
              >
                <View className="rounded-[28px] border border-border bg-cardAlt px-5 py-5">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Amount
                  </Text>
                  <View className="mt-3 min-h-[64px] flex-row items-end">
                    <Text className="pb-2 pr-2 text-[32px] font-bold leading-[36px] text-gray-500">
                      $
                    </Text>
                    <TextInput
                      ref={addAmountInputRef}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#6b7280"
                      className="flex-1 text-[52px] font-bold leading-[60px] text-white"
                      value={amount}
                      onChangeText={setAmount}
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
            </LiquidGlassSurface>
          </Animated.View>
        </KeyboardAvoidingView>
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
