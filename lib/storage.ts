import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BudgetConfig, Transaction } from "../types";

const CONFIG_KEY = "expense_macros_budget_config";
const TX_KEY = "expense_macros_transactions";

export const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export async function loadData(): Promise<{ config: BudgetConfig | null; transactions: Transaction[] }> {
  const [[, config], [, transactions]] = await AsyncStorage.multiGet([CONFIG_KEY, TX_KEY]);
  const plan: BudgetConfig | null = config === null ? null : JSON.parse(config);
  const entries: Transaction[] = transactions === null ? [] : JSON.parse(transactions);
  if ((config !== null && (!plan || !Array.isArray(plan.bills) || !plan.savingsGoal))
    || !Array.isArray(entries)) {
    throw new Error("Saved data is not in the expected format.");
  }
  return { config: plan, transactions: entries };
}

export const saveConfig = (config: BudgetConfig) =>
  AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));

export const saveTransactions = (transactions: Transaction[]) =>
  AsyncStorage.setItem(TX_KEY, JSON.stringify(transactions));
