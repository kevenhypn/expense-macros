import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BudgetConfig, Transaction } from "../types";
import { DataError, normalizeStored } from "./validate.ts";

const CONFIG_KEY = "expense_macros_budget_config";
const TX_KEY = "expense_macros_transactions";

export const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export async function loadData() {
  let rows: readonly (readonly [string, string | null])[];
  try {
    rows = await AsyncStorage.multiGet([CONFIG_KEY, TX_KEY]);
  } catch {
    throw new DataError("Storage is unavailable on this device.");
  }
  const configRaw = rows.find(([key]) => key === CONFIG_KEY)?.[1] ?? null;
  const transactionsRaw = rows.find(([key]) => key === TX_KEY)?.[1] ?? null;
  return normalizeStored(configRaw, transactionsRaw);
}

export const saveConfig = (config: BudgetConfig) =>
  AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));

export const saveTransactions = (transactions: Transaction[]) =>
  AsyncStorage.setItem(TX_KEY, JSON.stringify(transactions));

export const clearData = () => AsyncStorage.multiRemove([CONFIG_KEY, TX_KEY]);

export { DataError };
