import { useState, useEffect, useCallback } from "react";
import { BudgetConfig, Transaction } from "../types";
import { loadConfig, loadTransactions } from "../lib/storage";

type AppDataState = {
  config: BudgetConfig | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
};

export const useAppData = () => {
  const [state, setState] = useState<AppDataState>({
    config: null,
    transactions: [],
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [cfg, txs] = await Promise.all([
        loadConfig(),
        loadTransactions(),
      ]);
      setState({
        config: cfg,
        transactions: txs,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load data",
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setConfig = useCallback((config: BudgetConfig | null) => {
    setState((prev) => ({ ...prev, config }));
  }, []);

  const setTransactions = useCallback((transactions: Transaction[]) => {
    setState((prev) => ({ ...prev, transactions }));
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    setConfig,
    setTransactions,
    refresh,
  };
};
