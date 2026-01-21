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
import { Settings, RefreshCw, Trash2 } from "lucide-react";
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
  const todayISO = getTodayISO();
  const { availableToSpend } = calculateFinancials(config);
  
  // Filter for current month
  const currentMonthTxs = transactions.filter(t => isSameMonth(t.date, todayISO));

  // Discretionary calculation
  const discretionarySpent = currentMonthTxs.reduce((sum, t) => {
     // Spending = categories excluding Bills, Savings, Income
     if (["Bills", "Savings", "Income"].includes(t.category)) return sum;
     if (t.amount < 0) return sum + Math.abs(t.amount);
     return sum;
  }, 0);

  const periodLeft = availableToSpend - discretionarySpent;
  const daysPassed = new Date().getDate(); // approximate days passed in month

  // B) Today's Budget Logic
  const dim = daysInMonth(todayISO);
  const dailyBudget = availableToSpend / dim;
  
  const todayTxs = currentMonthTxs.filter(t => t.date === todayISO);
  const todaySpent = todayTxs.reduce((sum, t) => {
    if (["Bills", "Savings", "Income"].includes(t.category)) return sum;
    if (t.amount < 0) return sum + Math.abs(t.amount);
    return sum;
  }, 0);
  
  const todayLeft = dailyBudget - todaySpent;

  // --- Handlers ---

  const handleAddTransaction = () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;

    const newTx: Transaction = {
      id: generateId(),
      date: getTodayISO(),
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

  // Filter Logic
  const getFilteredTransactions = () => {
    return currentMonthTxs.filter(t => {
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
    <div className="min-h-screen bg-[#121212] text-white pb-20">
      {/* Header */}
      <div className="p-6 flex justify-between items-center sticky top-0 bg-[#121212]/95 backdrop-blur-sm z-10">
        <h1 className="text-3xl font-bold">Today</h1>
        <div className="flex gap-4">
          <button className="text-gray-400 hover:text-white" onClick={() => window.location.reload()}>
            <RefreshCw size={24} />
          </button>
          <Link to="/setup" className="text-gray-400 hover:text-white">
            <Settings size={24} />
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-6">
        <SummaryCard
          title="Period Budget"
          mainValue={`$${periodLeft.toFixed(0)}`}
          mainIsPositive={periodLeft >= 0}
          subValue={`$${availableToSpend.toFixed(0)} total`}
          footerText={`Spent: $${discretionarySpent.toFixed(0)} • Day ${daysPassed}`}
        />
        <SummaryCard
          title="Today's Budget"
          mainValue={`$${todayLeft.toFixed(0)}`}
          mainIsPositive={todayLeft >= 0}
          subValue={`$${dailyBudget.toFixed(0)} total`}
          footerText="Daily limit"
        />
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
          className="w-full bg-transparent border-b border-[#333] pb-2 mb-6 text-gray-400 focus:outline-none focus:border-orange-500"
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
            <div key={tx.id} className={`flex justify-between items-center gap-3 ${tx.isSystem ? 'opacity-50' : 'opacity-100'}`}>
              <div className="flex gap-3 items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${CATEGORY_STYLES[tx.category].badge}`}>
                  {tx.category[0]}
                </div>
                <div>
                  <div className="font-medium text-white">{tx.category}</div>
                  <div className="text-xs text-gray-500">{tx.note || tx.date} {tx.isSystem && "(Auto)"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </div>
                <button
                  onClick={() => handleDeleteTransaction(tx.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  aria-label={`Delete ${tx.category} transaction`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filteredList.length === 0 && (
            <div className="text-center text-gray-600 mt-10">No transactions found</div>
          )}
        </div>
      </div>
    </div>
  );
};
