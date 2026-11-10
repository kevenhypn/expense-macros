import type { BudgetConfig, SavingsGoal, Transaction, TransactionCategory } from "../types";
import { isDate, isoDate } from "./budget.ts";
import { isCategory } from "./categories.ts";
import { dollarsToCents } from "./money.ts";

export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

export type NormalizedData = {
  config: BudgetConfig | null;
  transactions: Transaction[];
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeConfig(value: unknown, warnings: string[]): BudgetConfig {
  if (!isRecord(value) || !isRecord(value.savingsGoal) || !Array.isArray(value.bills)) {
    throw new DataError("Saved plan could not be read.");
  }
  const income = typeof value.monthlyIncome === "number" ? dollarsToCents(value.monthlyIncome) : null;
  if (income === null || income < 0) throw new DataError("Saved plan could not be read.");

  const bills: BudgetConfig["bills"] = [];
  const billIds = new Set<string>();
  let droppedBills = 0;
  for (const bill of value.bills) {
    if (!isRecord(bill) || typeof bill.name !== "string" || typeof bill.amount !== "number") {
      droppedBills += 1;
      continue;
    }
    const name = bill.name.trim();
    const amount = dollarsToCents(bill.amount);
    if (!name || name.length > 60 || amount === null || amount <= 0) {
      droppedBills += 1;
      continue;
    }
    let id = typeof bill.id === "string" && bill.id.trim() ? bill.id : `bill-${bills.length + 1}`;
    if (billIds.has(id)) id = `${id}-${bills.length + 1}`;
    billIds.add(id);
    bills.push({ id, name, amount: amount / 100 });
  }
  if (droppedBills) warnings.push(droppedBills === 1 ? "Removed 1 unreadable bill." : `Removed ${droppedBills} unreadable bills.`);

  const goal = value.savingsGoal;
  let savingsGoal: SavingsGoal;
  if (goal.mode === "percent" && typeof goal.percent === "number" && Number.isFinite(goal.percent) && goal.percent >= 0 && goal.percent <= 100) {
    savingsGoal = { mode: "percent", percent: Math.round(goal.percent * 100) / 100 };
  } else if (goal.mode === "fixed" && typeof goal.amount === "number") {
    const amount = dollarsToCents(goal.amount);
    if (amount === null || amount < 0) throw new DataError("Saved plan could not be read.");
    savingsGoal = { mode: "fixed", amount: amount / 100 };
  } else {
    throw new DataError("Saved plan could not be read.");
  }

  let rolloverUnspent = false;
  if (typeof value.rolloverUnspent === "boolean") rolloverUnspent = value.rolloverUnspent;
  else if (value.rolloverUnspent !== undefined) warnings.push("The daily pace setting was reset to fixed.");

  const startDate = typeof value.startDate === "string" && isDate(value.startDate) ? value.startDate : isoDate();
  if (value.startDate !== undefined && startDate !== value.startDate) {
    warnings.push("The saved plan date was not a real calendar day, so it was reset.");
  }

  return { startDate, monthlyIncome: income / 100, bills, savingsGoal, rolloverUnspent };
}

function normalizeTransactions(rows: unknown[], warnings: string[]): Transaction[] {
  const seen = new Set<string>();
  const transactions: Transaction[] = [];
  let dropped = 0;
  let duplicates = 0;
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== "string" || !row.id.trim()) {
      dropped += 1;
      continue;
    }
    if (seen.has(row.id)) {
      duplicates += 1;
      continue;
    }
    const date = typeof row.date === "string" && isDate(row.date) ? row.date : "";
    const cents = typeof row.amount === "number" ? dollarsToCents(row.amount) : null;
    const category = typeof row.category === "string" && isCategory(row.category) ? row.category : null;
    if (!date || cents === null || !category || (category === "Income" && cents < 0)) {
      dropped += 1;
      continue;
    }
    seen.add(row.id);
    const tx: Transaction = { id: row.id, date, amount: cents / 100, category: category as TransactionCategory };
    if (typeof row.note === "string" && row.note.trim()) tx.note = row.note.trim();
    if (typeof row.account === "string" && row.account.trim()) tx.account = row.account.trim();
    if (row.pending === true) tx.pending = true;
    if (row.isSystem === true) tx.isSystem = true;
    transactions.push(tx);
  }
  if (dropped) warnings.push(dropped === 1 ? "Removed 1 unreadable transaction." : `Removed ${dropped} unreadable transactions.`);
  if (duplicates) warnings.push(duplicates === 1 ? "Removed 1 duplicate transaction." : `Removed ${duplicates} duplicate transactions.`);
  return transactions;
}

export function normalizeStored(configRaw: string | null, transactionsRaw: string | null): NormalizedData {
  const warnings: string[] = [];
  let config: BudgetConfig | null = null;
  if (configRaw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configRaw);
    } catch {
      throw new DataError("Saved plan could not be read.");
    }
    config = normalizeConfig(parsed, warnings);
  }
  if (transactionsRaw === null) return { config, transactions: [], warnings };
  let parsed: unknown;
  try {
    parsed = JSON.parse(transactionsRaw);
  } catch {
    throw new DataError("Saved transactions could not be read.");
  }
  if (!Array.isArray(parsed)) throw new DataError("Saved transactions could not be read.");
  return { config, transactions: normalizeTransactions(parsed, warnings), warnings };
}
