import type { TransactionCategory } from "../types";

export const flexible = ["Food", "Shopping", "Transport", "Entertainment", "Other"] as const;
export const expenseCategories = [...flexible, "Bills", "Savings"] as const;
export const allCategories = [...expenseCategories, "Income"] as const satisfies readonly TransactionCategory[];

const aliases: Record<string, TransactionCategory> = {
  food: "Food",
  groceries: "Food",
  grocery: "Food",
  dining: "Food",
  restaurant: "Food",
  restaurants: "Food",
  coffee: "Food",
  shopping: "Shopping",
  household: "Shopping",
  transport: "Transport",
  transportation: "Transport",
  transit: "Transport",
  gas: "Transport",
  fuel: "Transport",
  uber: "Transport",
  lyft: "Transport",
  parking: "Transport",
  entertainment: "Entertainment",
  fun: "Entertainment",
  movies: "Entertainment",
  other: "Other",
  misc: "Other",
  miscellaneous: "Other",
  bills: "Bills",
  bill: "Bills",
  rent: "Bills",
  utilities: "Bills",
  utility: "Bills",
  savings: "Savings",
  saving: "Savings",
  income: "Income",
  paycheck: "Income",
  salary: "Income",
};

export function categoryFromLabel(input: string): TransactionCategory | null {
  const key = input.trim().toLowerCase().replace(/[.\s]+$/g, "").replace(/\s+/g, " ");
  return aliases[key] ?? null;
}

export function isCategory(value: string): value is TransactionCategory {
  return (allCategories as readonly string[]).includes(value);
}
