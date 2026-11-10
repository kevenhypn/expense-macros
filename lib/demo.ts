import type { BudgetConfig, Transaction, TransactionCategory } from "../types";
import { isoDate, moveDay } from "./budget";

export function sampleData(date = isoDate()): { config: BudgetConfig; transactions: Transaction[] } {
  const config: BudgetConfig = {
    startDate: `${date.slice(0, 7)}-01`, monthlyIncome: 4200,
    bills: [{ id: "rent", name: "Rent", amount: 1450 }, { id: "utilities", name: "Utilities", amount: 180 },
      { id: "internet", name: "Internet & phone", amount: 110 }],
    savingsGoal: { mode: "fixed", amount: 600 }, rolloverUnspent: false,
  };
  const examples: [number, number, TransactionCategory, string][] = [
    [0, 5.75, "Food", "Morning coffee"], [0, 14.2, "Food", "Lunch"],
    [1, 32.5, "Transport", "Gas station"], [2, 49.68, "Food", "Grocery run"],
    [3, 24, "Entertainment", "Movie night"], [4, 72.25, "Shopping", "Running gear"],
    [5, 35, "Food", "Dinner with friends"], [6, 18, "Transport", "Parking"],
    [7, 12.99, "Entertainment", "Music subscription"], [8, 46.78, "Food", "Groceries"],
    [11, 82, "Shopping", "Household essentials"], [13, 37.8, "Transport", "Fuel"],
    [15, 128.5, "Shopping", "Weekend errands"], [17, 55.82, "Food", "Groceries"],
    [20, 31, "Entertainment", "Concert ticket"],
  ];
  return { config, transactions: examples.map(([ago, amount, category, note], index) =>
    ({ id: `demo-${index}`, date: moveDay(date, -ago), amount: -amount, category, note })) };
}
