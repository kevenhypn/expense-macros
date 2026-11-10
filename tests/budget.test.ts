import { test } from "node:test";
import assert from "node:assert/strict";
import type { BudgetConfig, Transaction } from "../types/index.ts";
import { amountValue, budgetFor, isoDate, isDate, moveDay, moveMonth, planTotals, weekDates } from "../lib/budget.ts";

const plan: BudgetConfig = {
  startDate: "2024-02-01", monthlyIncome: 2900,
  bills: [{ id: "rent", name: "Rent", amount: 610 }],
  savingsGoal: { mode: "percent", percent: 10 },
};
const tx = (id: string, date: string, amount: number, category: Transaction["category"], isSystem = false): Transaction =>
  ({ id, date, amount, category, isSystem });

test("local calendar navigation crosses leap days and calendar years", () => {
  assert.equal(isoDate(new Date(2024, 1, 1, 23, 30)), "2024-02-01");
  assert.equal(isDate("2024-02-29"), true);
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2026-04-31"), false);
  assert.equal(moveDay("2024-02-29", 1), "2024-03-01");
  assert.equal(moveMonth("2024-12-31", 1), "2025-01-01");
  assert.deepEqual(weekDates("2024-12-31"), ["2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"]);
  assert.equal(budgetFor(plan, [], "2024-02-01").daily, 68.97);
  assert.equal(budgetFor(plan, [], "2025-02-01").daily, 71.43);
});

test("amounts are validated rather than silently rounded or partially parsed", () => {
  assert.equal(amountValue("$1,234.09"), 1234.09);
  assert.equal(amountValue(".20"), 0.2);
  assert.equal(amountValue("0"), 0);
  for (const bad of ["", "3x", "-1", "2.999", "10000000", "1e2", "Infinity", "1.4.5"]) assert.equal(amountValue(bad), null);
});

test("planned allocations, refunds, extra income, and extra bills reconcile in cents", () => {
  assert.deepEqual(planTotals(plan), { income: 2900, bills: 610, savings: 290, flex: 2000 });
  const ledger = [
    tx("base", "2024-02-01", 2900, "Income", true), tx("rent", "2024-02-01", -610, "Bills", true),
    tx("savings", "2024-02-01", -290, "Savings", true),
    tx("a", "2024-02-04", -0.1, "Food"), tx("b", "2024-02-04", -0.2, "Food"), tx("c", "2024-02-04", 0.15, "Food"),
    tx("d", "2024-02-06", -49, "Bills"), tx("e", "2024-02-04", 200, "Income"),
    tx("old", "2024-01-07", -900, "Shopping"),
  ];
  const result = budgetFor(plan, ledger, "2024-02-04");
  assert.equal(result.entries.length, 5);
  assert.equal(result.daySpent, 0.15);
  assert.equal(result.monthBudget, 2200);
  assert.equal(result.monthSpent, 49.15);
  assert.equal(result.monthLeft, 2150.85);
  assert.equal(result.categories.find(x => x.category === "Food")?.amount, 0.15);
});

test("adaptive allowance only carries earlier entries forward into today's target", () => {
  const result = budgetFor({ ...plan, rolloverUnspent: true }, [
    tx("a", "2024-02-26", -100, "Food"),
    tx("b", "2024-02-27", 30, "Income"),
    tx("c", "2024-02-28", -20, "Food"),
    tx("d", "2024-02-29", -800, "Food"),
  ], "2024-02-28");
  assert.equal(result.daily, 965);
  assert.equal(result.dayLeft, 945);
  assert.equal(result.monthLeft, 1110);
});
