export type TransactionCategory =
  | "Food"
  | "Bills"
  | "Savings"
  | "Shopping"
  | "Transport"
  | "Entertainment"
  | "Other"
  | "Income";

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // IN positive, OUT negative
  category: TransactionCategory;
  note?: string;
  isSystem?: boolean;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
};

export type SavingsGoal =
  | { mode: "percent"; percent: number }
  | { mode: "fixed"; amount: number };

export type BudgetConfig = {
  startDate: string; // YYYY-MM-DD
  monthlyIncome: number;
  bills: Bill[];
  savingsGoal: SavingsGoal;
};
