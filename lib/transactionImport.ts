import type { Transaction, TransactionCategory } from "../types";
import { amountValue, expenseCategories, isDate, isoDate } from "./budget";

export function parseTransactionImport(input: string, today = isoDate()): Transaction[] {
  const categories: readonly TransactionCategory[] = [...expenseCategories, "Income"];
  const counts = new Map<string, number>();
  const lines = input.trim().split(/\r?\n/);
  if (!input.trim()) throw new Error("Paste at least one transaction.");
  if (lines.length > 500) throw new Error("Import up to 500 rows at a time.");

  return lines.flatMap((line, index) => {
    if (!line.trim()) return [];
    const fields = line.split("|").map(value => value.trim());
    const [date, rawAmount, rawCategory, note, account, status] = fields;
    const invalid = (message: string): never => { throw new Error(`Line ${index + 1}: ${message}`); };
    if (fields.length !== 6) invalid("Use six fields separated by |.");
    if (!isDate(date) || date > today) invalid("Use a valid date on or before today (YYYY-MM-DD).");
    const sign = rawAmount[0];
    const unsigned = amountValue(rawAmount.slice(1));
    if ((sign !== "+" && sign !== "-") || !unsigned) invalid("Use a signed, nonzero amount.");
    const category = categories.find(value => value.toLowerCase() === rawCategory.toLowerCase());
    if (!category) return invalid("Enter one of the listed categories.");
    if (category === "Income" && sign !== "+") invalid("Income must be positive.");
    if (!note || note.length > 100 || account.length > 60) invalid("Enter a description up to 100 characters and an account up to 60.");
    if (status !== "posted" && status !== "pending") invalid("Use posted or pending for status.");

    const amount = sign === "-" ? -unsigned! : unsigned!;
    const pending = status === "pending";
    const key = JSON.stringify([date, amount, category, note, account, status]);
    const occurrence = (counts.get(key) ?? 0) + 1;
    counts.set(key, occurrence);
    return [{
      id: `import:${key}:${occurrence}`,
      date, amount, category, note, account: account || undefined, pending,
    }];
  });
}
