import { BudgetConfig, Transaction } from "../types";

const CONFIG_KEY = "expense_macros_budget_config";
const TX_KEY = "expense_macros_transactions";

// --- Date Helpers ---

export const getTodayISO = (): string => {
  // Use locale CA to get YYYY-MM-DD easily
  return new Date().toLocaleDateString("en-CA");
};

export const daysInMonth = (dateISO: string): number => {
  const d = new Date(dateISO);
  // toggle to next month, day 0 gets last day of previous month
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

export const isSameMonth = (d1: string, d2: string): boolean => {
  return d1.substring(0, 7) === d2.substring(0, 7);
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Storage Helpers ---

export const loadConfig = (): BudgetConfig | null => {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const saveConfig = (config: BudgetConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const loadTransactions = (): Transaction[] => {
  const raw = localStorage.getItem(TX_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveTransactions = (txs: Transaction[]) => {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
};

// --- Logic ---

export const calculateFinancials = (config: BudgetConfig) => {
  const billsTotal = config.bills.reduce((sum, b) => sum + b.amount, 0);
  
  let savingsAmount = 0;
  if (config.savingsGoal.mode === "percent") {
    savingsAmount = config.monthlyIncome * (config.savingsGoal.percent / 100);
  } else {
    savingsAmount = config.savingsGoal.amount;
  }

  const availableToSpend = config.monthlyIncome - billsTotal - savingsAmount;

  return { billsTotal, savingsAmount, availableToSpend };
};

export const regenerateSystemTransactions = (config: BudgetConfig) => {
  const existingTxs = loadTransactions();
  // Keep ONLY non-system transactions
  const userTxs = existingTxs.filter((t) => !t.isSystem);

  const { savingsAmount } = calculateFinancials(config);

  const newSystemTxs: Transaction[] = [];
  const date = config.startDate; // Or getTodayISO() if we want them generated for today

  // 1. Income
  newSystemTxs.push({
    id: generateId(),
    date,
    amount: config.monthlyIncome,
    category: "Income",
    isSystem: true,
    note: "Monthly Income",
  });

  // 2. Bills
  config.bills.forEach((bill) => {
    newSystemTxs.push({
      id: generateId(),
      date,
      amount: -Math.abs(bill.amount),
      category: "Bills",
      isSystem: true,
      note: bill.name,
    });
  });

  // 3. Savings
  if (savingsAmount > 0) {
    newSystemTxs.push({
      id: generateId(),
      date,
      amount: -Math.abs(savingsAmount),
      category: "Savings",
      isSystem: true,
      note: "Auto Savings",
    });
  }

  saveTransactions([...userTxs, ...newSystemTxs]);
};
