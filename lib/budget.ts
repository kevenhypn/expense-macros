import type { BudgetConfig, Transaction, TransactionCategory } from "../types";
import { expenseCategories } from "./categories.ts";
import { amountValue, dollarsToCents, formatCents, money, roundCents } from "./money.ts";

export { amountValue, money, formatCents };
export { expenseCategories, flexible } from "./categories.ts";

export function isoDate(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part, index) =>
    String(part).padStart(index === 0 ? 4 : 2, "0"),
  ).join("-");
}

export function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

export function isDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && isoDate(localDate(iso)) === iso;
}

export function moveDay(iso: string, days: number) {
  const date = localDate(iso);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** Keep the day of month, and clamp to the last real day of the destination month. */
export function moveMonth(iso: string, months: number) {
  const date = localDate(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return isoDate(date);
}

export function daysInMonth(iso: string) {
  const date = localDate(iso);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function weekDates(iso: string) {
  const monday = moveDay(iso, -((localDate(iso).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDay(monday, index));
}

export function dateLabel(iso: string, options: Intl.DateTimeFormatOptions) {
  return localDate(iso).toLocaleDateString("en-US", options);
}

export type PlanCents = { income: number; bills: number; savings: number; flex: number };

export function planCents(config: BudgetConfig): PlanCents {
  const income = Math.max(0, dollarsToCents(config.monthlyIncome) ?? 0);
  const bills = config.bills.reduce((sum, bill) => sum + Math.max(0, dollarsToCents(bill.amount) ?? 0), 0);
  const savings = config.savingsGoal.mode === "percent"
    ? roundCents(income * Math.round(config.savingsGoal.percent * 100) / 10000)
    : Math.max(0, dollarsToCents(config.savingsGoal.amount) ?? 0);
  return { income, bills, savings, flex: income - bills - savings };
}

export function planTotals(config: BudgetConfig) {
  const plan = planCents(config);
  return {
    income: plan.income / 100,
    bills: plan.bills / 100,
    savings: plan.savings / 100,
    flex: plan.flex / 100,
  };
}

export type BudgetSnapshot = {
  plan: PlanCents;
  /** Non-system rows in the selected month, on or before today, including pending. */
  entries: Transaction[];
  categories: { category: TransactionCategory; cents: number }[];
  monthBudgetCents: number;
  monthIncomeCents: number;
  monthSpentCents: number;
  monthLeftCents: number;
  pendingCents: number;
  pendingSpendCents: number;
  pendingIncomeCents: number;
  dailyCents: number;
  daySpentCents: number;
  dayIncomeCents: number;
  dayLeftCents: number;
  daysInMonth: number;
  dayOfMonth: number;
  hiddenFuture: number;
};

/**
 * Daily pace is a share of the plan, not the whole month.
 * Fixed: (flexible plan + extra income on or before the selected day) / days in the month.
 * Adaptive: (flexible plan + posted activity before the selected day + today's extra income) / days left, including today.
 * Today's posted spending, including refunds, is then subtracted in full.
 * Pending rows stay in `entries` and out of every total. System rows are ignored.
 * Month totals include later days in the month up to `today`, so looking back at an earlier day still shows the month.
 */
export function budgetFor(
  config: BudgetConfig,
  transactions: Transaction[],
  date: string,
  today = "9999-12-31",
): BudgetSnapshot {
  if (!isDate(date)) throw new Error("Invalid budget date.");
  const plan = planCents(config);
  const days = daysInMonth(date);
  const dayOfMonth = localDate(date).getDate();
  const prefix = date.slice(0, 7);
  const rollover = config.rolloverUnspent === true;
  const entries: Transaction[] = [];
  const byCategory: Partial<Record<TransactionCategory, number>> = {};
  let priorNet = 0;
  let todayIncome = 0;
  let todaySpend = 0;
  let incomeThroughDay = 0;
  let earned = 0;
  let spent = 0;
  let pendingCents = 0;
  let pendingSpendCents = 0;
  let pendingIncomeCents = 0;
  let hiddenFuture = 0;

  for (const tx of transactions) {
    if (tx.isSystem || !tx.date.startsWith(prefix)) continue;
    if (!isDate(tx.date) || tx.date > today) {
      if (tx.date > today && tx.date.startsWith(prefix)) hiddenFuture += 1;
      continue;
    }
    const signed = dollarsToCents(tx.amount);
    if (signed === null) continue;
    entries.push(tx);
    if (tx.pending) {
      pendingCents += signed;
      if (tx.category === "Income") pendingIncomeCents += signed;
      else pendingSpendCents -= signed;
      continue;
    }
    if (tx.date < date) priorNet += signed;
    if (tx.date === date) {
      if (tx.category === "Income") todayIncome += signed;
      else todaySpend -= signed;
    }
    if (tx.category === "Income") {
      earned += signed;
      if (tx.date <= date) incomeThroughDay += signed;
    } else {
      spent -= signed;
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) - signed;
    }
  }

  const remainingDays = Math.max(1, days - dayOfMonth + 1);
  const dailyCents = rollover
    ? roundCents((plan.flex + priorNet + todayIncome) / remainingDays)
    : roundCents((plan.flex + incomeThroughDay) / days);

  return {
    plan,
    entries,
    categories: expenseCategories.map(category => ({ category, cents: byCategory[category] ?? 0 })),
    monthBudgetCents: plan.flex + earned,
    monthIncomeCents: earned,
    monthSpentCents: spent,
    monthLeftCents: plan.flex + earned - spent,
    pendingCents,
    pendingSpendCents,
    pendingIncomeCents,
    dailyCents,
    daySpentCents: todaySpend,
    dayIncomeCents: todayIncome,
    dayLeftCents: dailyCents - todaySpend,
    daysInMonth: days,
    dayOfMonth,
    hiddenFuture,
  };
}

export function dayEquation(snapshot: BudgetSnapshot) {
  const target = formatCents(snapshot.dailyCents);
  const left = formatCents(snapshot.dayLeftCents);
  if (snapshot.daySpentCents < 0) {
    return `Target ${target} + refunded ${formatCents(-snapshot.daySpentCents)} = ${left}`;
  }
  return `Target ${target} − spent ${formatCents(snapshot.daySpentCents)} = ${left}`;
}

export function monthEquation(snapshot: BudgetSnapshot) {
  const plan = formatCents(snapshot.plan.flex);
  const spent = formatCents(snapshot.monthSpentCents);
  const left = formatCents(snapshot.monthLeftCents);
  if (snapshot.monthIncomeCents === 0) return `Plan ${plan} − spent ${spent} = ${left}`;
  return `Plan ${plan} + income ${formatCents(snapshot.monthIncomeCents)} − spent ${spent} = ${left}`;
}
