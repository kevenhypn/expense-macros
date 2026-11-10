import type { BudgetConfig, Transaction, TransactionCategory } from "../types";

export const flexible = ["Food", "Shopping", "Transport", "Entertainment", "Other"] as const;
export const expenseCategories = [...flexible, "Bills", "Savings"] as const;

const cents = (value: number) => Math.round(value * 100);
export const money = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value === 0 ? 0 : value);

export function amountValue(value: string) {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^(?:\d{1,7}(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) return null;
  return cents(Number(cleaned)) / 100;
}

export function isoDate(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part, index) =>
    String(part).padStart(index === 0 ? 4 : 2, "0"),
  ).join("-");
}

export function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && isoDate(localDate(iso)) === iso;
}

export function moveDay(iso: string, days: number) {
  const date = localDate(iso);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function moveMonth(iso: string, months: number) {
  const date = localDate(iso);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return isoDate(date);
}

export function weekDates(iso: string) {
  const monday = moveDay(iso, -((localDate(iso).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDay(monday, index));
}

export function dateLabel(iso: string, options: Intl.DateTimeFormatOptions) {
  return localDate(iso).toLocaleDateString("en-US", options);
}

export function planTotals(config: BudgetConfig) {
  const income = cents(config.monthlyIncome);
  const bills = config.bills.reduce((sum, bill) => sum + cents(bill.amount), 0);
  const savings = config.savingsGoal.mode === "percent"
    ? Math.round(income * config.savingsGoal.percent / 100)
    : cents(config.savingsGoal.amount);
  return { income: income / 100, bills: bills / 100, savings: savings / 100, flex: (income - bills - savings) / 100 };
}

export function budgetFor(config: BudgetConfig, transactions: Transaction[], date: string) {
  const plan = planTotals(config);
  const prefix = date.slice(0, 7);
  const day = localDate(date).getDate();
  const days = localDate(moveDay(moveMonth(date, 1), -1)).getDate();
  // Planned income, bills and savings already live in the plan. Legacy system rows
  // are kept in storage and never counted a second time.
  const entries = transactions.filter(tx => !tx.isSystem && tx.date.startsWith(prefix));
  const byCategory: Partial<Record<TransactionCategory, number>> = {};
  let earned = 0;
  let spent = 0;
  let daySpent = 0;
  let priorNet = 0;
  for (const tx of entries) {
    const signed = cents(tx.amount);
    if (tx.category === "Income") earned += signed;
    else {
      spent -= signed;
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) - signed;
      if (tx.date === date) daySpent -= signed;
    }
    if (tx.date < date) priorNet += signed;
  }
  const limit = cents(plan.flex);
  const daily = config.rolloverUnspent
    ? Math.round((limit + priorNet) / (days - day + 1))
    : Math.round(limit / days);
  return {
    plan, entries,
    categories: expenseCategories.map(category => ({ category, amount: (byCategory[category] ?? 0) / 100 })),
    monthBudget: (limit + earned) / 100,
    monthSpent: spent / 100,
    monthLeft: (limit + earned - spent) / 100,
    daily: daily / 100,
    daySpent: daySpent / 100,
    dayLeft: (daily - daySpent) / 100,
  };
}
