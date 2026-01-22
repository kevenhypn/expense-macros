import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Transaction, BudgetConfig, TransactionCategory } from "../types";
import {
  loadConfig,
  loadTransactions,
  saveTransactions,
  generateId,
  getTodayISO,
  calculateFinancials,
  daysInMonth,
  isSameMonth,
} from "../lib/storage";
import { SummaryCard } from "../components/SummaryCard";
import { AmountToggle } from "../components/AmountToggle";
import { CategoryGrid } from "../components/CategoryGrid";
import { Settings, RefreshCw, Trash2, Pencil } from "lucide-react";
import { CATEGORY_STYLES } from "../lib/categoryStyles";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI State
  const [amount, setAmount] = useState("");
  const [isIncome, setIsIncome] = useState(false); // Default OUT
  const [selectedCat, setSelectedCat] = useState<TransactionCategory>("Food");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"All" | "Spending" | "Bills" | "Savings" | "Income">("All");
  const [expandedCard, setExpandedCard] = useState<"period" | "today" | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "period">("day");
  const [selectedDateISO, setSelectedDateISO] = useState(getTodayISO());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>("Food");

  useEffect(() => {
    const cfg = loadConfig();
    if (!cfg) {
      navigate("/setup");
      return;
    }
    setConfig(cfg);
    setTransactions(loadTransactions());
  }, [navigate]);

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
  const currentMonthTxs = transactions.filter(t => isSameMonth(t.date, selectedDateISO));

  // Discretionary calculation
  const discretionarySpent = currentMonthTxs.reduce((sum, t) => {
    // Spending = categories excluding Bills, Savings, Income
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
  const daysPassed = selectedDate.getDate(); // approximate days passed in month

  // B) Today's Budget Logic
  const dim = daysInMonth(selectedDateISO);
  const baseDailyBudget = availableToSpend / dim;
  const monthPrefix = selectedDateISO.slice(0, 7);
  const selectedDay = selectedDate.getDate();
  const selectedDayTxs = currentMonthTxs.filter((t) => t.date === selectedDateISO);
  const spendingByDate = currentMonthTxs.reduce((acc, t) => {
    if (["Bills", "Savings", "Income"].includes(t.category)) return acc;
    if (t.amount < 0) {
      acc[t.date] = (acc[t.date] ?? 0) + Math.abs(t.amount);
    }
    return acc;
  }, {} as Record<string, number>);

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
      if (!spendingCategories.includes(t.category as SpendingCategory)) return;
      if (t.amount < 0) totals[t.category as SpendingCategory] += Math.abs(t.amount);
      if (t.amount > 0) totals[t.category as SpendingCategory] -= Math.abs(t.amount);
    });

    const clampedTotals = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Math.max(0, v)])
    ) as Record<SpendingCategory, number>;
    const totalSpent = Object.values(clampedTotals).reduce((sum, val) => sum + val, 0);
    return { totals: clampedTotals, totalSpent };
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

  const handleAddTransaction = () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDateISO,
      amount: isIncome ? Math.abs(val) : -Math.abs(val),
      category: selectedCat,
      note: note,
      isSystem: false
    };

    const newTxs = [newTx, ...transactions];
    setTransactions(newTxs);
    saveTransactions(newTxs);
    
    // Reset form
    setAmount("");
    setNote("");
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTxs = transactions.filter((tx) => tx.id !== id);
    setTransactions(nextTxs);
    saveTransactions(nextTxs);
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

  const handleSaveEdit = () => {
    if (!editingId) return;
    const parsedAmount = parseFloat(editAmount);
    if (!editDate || isNaN(parsedAmount)) return;

    const nextTxs = transactions.map((tx) => {
      if (tx.id !== editingId) return tx;
      const signedAmount = tx.amount >= 0 ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
      return {
        ...tx,
        date: editDate,
        amount: signedAmount,
        note: editNote,
        category: editCategory,
      };
    });

    setTransactions(nextTxs);
    saveTransactions(nextTxs);
    handleCancelEdit();
  };

  // Filter Logic
  const getFilteredTransactions = () => {
    return selectedDayTxs.filter(t => {
      if (filter === "All") return true;
      if (filter === "Spending") return !["Bills", "Savings", "Income"].includes(t.category);
      return t.category === filter;
    }).sort((a, b) => {
      if (a.isSystem && !b.isSystem) return 1;
      if (!a.isSystem && b.isSystem) return -1;

      if (!a.isSystem && !b.isSystem) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      const systemOrder: Record<string, number> = { Bills: 0, Savings: 1, Income: 2 };
      const orderDiff = (systemOrder[a.category] ?? 99) - (systemOrder[b.category] ?? 99);
      if (orderDiff !== 0) return orderDiff;

      if (a.category === "Bills" && b.category === "Bills") {
        return Math.abs(a.amount) - Math.abs(b.amount);
      }

      return 0;
    });
  };

  const filteredList = getFilteredTransactions();

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-32">
      {/* Header */}
      <div className="p-6 flex justify-between items-center sticky top-0 bg-[#121212]/95 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">{selectedDateLabel}</h1>
          <input
            type="date"
            value={selectedDateISO}
            onChange={(event) => setSelectedDateISO(event.target.value)}
            className="text-xs text-gray-400 bg-transparent border border-gray-700/40 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-500/60"
            aria-label="Select day"
          />
        </div>
        <div className="flex gap-4">
          <button className="text-gray-400 hover:text-white" onClick={() => window.location.reload()}>
            <RefreshCw size={24} />
          </button>
          <Link to="/setup" className="text-gray-400 hover:text-white">
            <Settings size={24} />
          </Link>
        </div>
      </div>

      {viewMode === "day" ? (
        <>
          {/* Summary Cards */}
          <div className="px-6 flex flex-col gap-4 mb-6">
            <div className="opacity-70">
              <button
                type="button"
                onClick={() => {
                  setExpandedCard(null);
                  setViewMode("period");
                }}
                className="w-full text-left"
              >
                <SummaryCard
                  title="Period Budget"
                  mainValue={`$${periodLeft.toFixed(0)}`}
                  mainIsPositive={periodLeft >= 0}
                  subValue={`$${availableToSpend.toFixed(0)} total`}
                  footerText={`Tap for period breakdown • Day ${daysPassed}`}
                />
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setExpandedCard(expandedCard === "today" ? null : "today")}
                className="w-full text-left"
              >
                <SummaryCard
                  title="Today's Budget"
                  mainValue={`$${todayLeft.toFixed(0)}`}
                  mainIsPositive={todayLeft >= 0}
                  subValue={`$${dailyBudget.toFixed(0)} ${rolloverUnspent ? "rolling" : "fixed"}`}
                  footerText="Daily limit"
                >
                  {expandedCard === "today" && (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        Today&apos;s spending
                      </div>
                      {todaySpending.totalSpent === 0 ? (
                        <div className="text-xs text-gray-500">
                          No spending yet today.
                        </div>
                      ) : (
                        <div className="space-y-4">
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
                              <div key={cat} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="text-sm text-white">{cat}</div>
                                  <div className="text-xs text-gray-500">
                                    {pctSpent.toFixed(0)}% spent • {pctIncome.toFixed(0)}% income
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                    <div
                                      className="h-2"
                                      style={{
                                        width: `${Math.min(100, pctSpent)}%`,
                                        backgroundColor: CATEGORY_STYLES[cat].selectedBg,
                                      }}
                                    />
                                  </div>
                                  <div className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                                    <div
                                      className="h-2"
                                      style={{
                                        width: `${Math.min(100, pctIncome)}%`,
                                        backgroundColor: CATEGORY_STYLES[cat].unselectedBg,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="space-y-3">
                        {todaySpendingTxs.map((tx) => (
                          <div key={tx.id} className={`flex justify-between items-center gap-3 ${tx.isSystem ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="flex gap-3 items-center">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ backgroundColor: CATEGORY_STYLES[tx.category].badgeBg }}
                              >
                                {tx.category[0]}
                              </div>
                              <div>
                                <div className="font-medium text-white">{tx.category}</div>
                                <div className="text-xs text-gray-500">
                                  {tx.note ? `${tx.note} • ${tx.date}` : tx.date}
                                </div>
                              </div>
                            </div>
                            <div className="font-bold text-white">
                              {tx.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {todaySpendingTxs.length === 0 && (
                          <div className="text-center text-gray-600">No transactions found</div>
                        )}
                      </div>
                    </div>
                  )}
                </SummaryCard>
              </button>
            </div>
          </div>

          {/* Add Transaction Form */}
          <div className="px-6 mb-8">
            <AmountToggle
              amount={amount}
              setAmount={setAmount}
              isIncome={isIncome}
              setIsIncome={setIsIncome}
            />
            <CategoryGrid selected={selectedCat} onSelect={setSelectedCat} />
            
            <input 
              type="text" 
              placeholder="Note (optional)" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-transparent border-b border-[#333] pb-2 mb-6 text-gray-400 focus:outline-none focus:border-green-500"
            />

            <button
              onClick={handleAddTransaction}
              className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform ${
                isIncome ? "bg-green-600 shadow-green-900/20" : "bg-red-600 shadow-red-900/20"
              }`}
            >
              Add Transaction
            </button>
          </div>

          {/* Log Section */}
          <div className="bg-[#1a1a1a] rounded-t-3xl min-h-[400px] p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {["All", "Spending", "Bills", "Savings", "Income"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${filter === f ? 'bg-white text-black' : 'bg-[#2a2a2a] text-gray-400'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredList.map((tx) => (
                <div key={tx.id} className="space-y-2">
                  <div className={`flex justify-between items-center gap-3 ${tx.isSystem ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex gap-3 items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${CATEGORY_STYLES[tx.category].badge}`}>
                        {tx.category[0]}
                      </div>
                      <div>
                        <div className="font-medium text-white">{tx.category}</div>
                        <div className="text-xs text-gray-500">
                          {tx.note ? `${tx.note} • ${tx.date}` : tx.date} {tx.isSystem && "(Auto)"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleStartEdit(tx)}
                        className="text-gray-500 hover:text-white transition-colors"
                        aria-label={`Edit ${tx.category} transaction`}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        aria-label={`Delete ${tx.category} transaction`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredList.length === 0 && (
                <div className="text-center text-gray-600 mt-10">No transactions found</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="px-6 flex flex-col gap-4 mb-24">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-3xl p-5 space-y-3">
            <div className="text-gray-400 text-sm uppercase tracking-wider font-semibold">
              Period breakdown
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-xs text-gray-500">Left</div>
                <div className={`text-2xl font-bold ${periodLeft >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${periodLeft.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Overspent days</div>
                <div className="text-2xl font-bold text-white">{overspentDays}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-xs text-gray-500">Spent</div>
                <div className="text-lg font-semibold text-white">${discretionarySpent.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Budget mode</div>
                <div className="text-lg font-semibold text-white">{rolloverUnspent ? "Rollover" : "Fixed"}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-3xl p-5 space-y-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Category breakdown
            </div>
            {periodSpending.totalSpent === 0 ? (
              <div className="text-xs text-gray-500">No spending yet for this period.</div>
            ) : (
              spendingCategories.map((cat) => {
                const spent = periodSpending.totals[cat];
                if (spent <= 0) return null;
                const pctSpent = periodSpending.totalSpent
                  ? (spent / periodSpending.totalSpent) * 100
                  : 0;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-white">{cat}</div>
                      <div className="text-xs text-gray-500">
                        {pctSpent.toFixed(0)}% • ${spent.toFixed(0)}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#202020] rounded-full overflow-hidden">
                      <div
                        className="h-2"
                        style={{
                          width: `${Math.min(100, pctSpent)}%`,
                          backgroundColor: CATEGORY_STYLES[cat].selectedBg,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-[#1a1a1a] rounded-3xl p-5 space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Period log
            </div>
            {periodLogTxs.map((tx) => (
              <div key={tx.id} className={`flex justify-between items-center gap-3 ${tx.isSystem ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex gap-3 items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: CATEGORY_STYLES[tx.category].badgeBg }}
                  >
                    {tx.category[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white">{tx.category}</div>
                    <div className="text-xs text-gray-500">
                      {tx.note ? `${tx.note} • ${tx.date}` : tx.date} {tx.isSystem && "(Auto)"}
                    </div>
                  </div>
                </div>
                <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
            {periodLogTxs.length === 0 && (
              <div className="text-center text-gray-600">No transactions found</div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#262626] bg-[#121212]/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`flex-1 py-3 rounded-full text-sm font-semibold ${
              viewMode === "day" ? "bg-white text-black" : "bg-[#2a2a2a] text-gray-400"
            }`}
          >
            Day + Log
          </button>
          <button
            type="button"
            onClick={() => setViewMode("period")}
            className={`flex-1 py-3 rounded-full text-sm font-semibold ${
              viewMode === "period" ? "bg-white text-black" : "bg-[#2a2a2a] text-gray-400"
            }`}
          >
            Period Breakdown
          </button>
        </div>
      </div>

      {editingId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
          onClick={handleCancelEdit}
        >
          <div
            className="w-full max-w-lg bg-[#121212] border border-[#333] rounded-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              Edit transaction
            </div>
            <div className="flex gap-3">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="flex-1 bg-[#2a2a2a] p-3 rounded-xl text-white border border-[#333] focus:border-green-500 outline-none"
              />
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="$"
                className="w-28 bg-[#2a2a2a] p-3 rounded-xl text-white border border-[#333] focus:border-green-500 outline-none"
              />
            </div>
            <CategoryGrid selected={editCategory} onSelect={setEditCategory} />
            <input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-transparent border-b border-[#333] pb-2 text-gray-300 placeholder:text-gray-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-[#2a2a2a] text-gray-300 font-semibold py-3 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
