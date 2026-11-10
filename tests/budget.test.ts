import { test } from "node:test";
import assert from "node:assert/strict";
import type { BudgetConfig, Transaction } from "../types/index.ts";
import { budgetFor, dayEquation, isDate, isoDate, monthEquation, moveDay, moveMonth, planTotals, weekDates } from "../lib/budget.ts";
import { dollarsToCents, formatCents, parseMoneyToCents } from "../lib/money.ts";
import { sampleData } from "../lib/demo.ts";

const plan: BudgetConfig = {
  startDate: "2024-02-01", monthlyIncome: 2900,
  bills: [{ id: "rent", name: "Rent", amount: 610 }],
  savingsGoal: { mode: "percent", percent: 10 },
};
const tx = (id: string, date: string, amount: number, category: Transaction["category"], extra: Partial<Transaction> = {}): Transaction =>
  ({ id, date, amount, category, ...extra });

test("local calendar navigation crosses leap days and calendar years", () => {
  assert.equal(isoDate(new Date(2024, 1, 1, 23, 30)), "2024-02-01");
  assert.equal(isDate("2024-02-29"), true);
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2026-04-31"), false);
  assert.equal(moveDay("2024-02-29", 1), "2024-03-01");
  assert.equal(moveMonth("2024-12-31", 1), "2025-01-31");
  assert.equal(moveMonth("2024-01-31", 1), "2024-02-29");
  assert.equal(moveMonth("2025-01-31", 1), "2025-02-28");
  assert.equal(moveMonth("2024-03-31", -1), "2024-02-29");
  assert.deepEqual(weekDates("2024-12-31"), ["2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"]);
  assert.equal(budgetFor(plan, [], "2024-02-01").dailyCents, 6897);
  assert.equal(formatCents(6897), "$68.97");
  assert.equal(budgetFor(plan, [], "2025-02-01").dailyCents, 7143);
  assert.equal(formatCents(7143), "$71.43");
});

test("amounts are validated rather than silently rounded or partially parsed", () => {
  assert.equal(parseMoneyToCents("$1,234.09"), 123409);
  assert.equal(parseMoneyToCents(".20"), 20);
  assert.equal(parseMoneyToCents("0"), 0);
  assert.equal(parseMoneyToCents("($12.40)"), -1240);
  assert.equal(parseMoneyToCents("−12.40"), -1240);
  assert.equal(parseMoneyToCents("-$1,234.50"), -123450);
  assert.equal(parseMoneyToCents("10."), 1000);
  for (const bad of ["", "3x", "2.999", "10000000", "1e2", "Infinity", "1.4.5", "12.40.1"]) {
    assert.equal(parseMoneyToCents(bad), null);
  }
});

test("two-decimal currency survives the binary round trip", () => {
  for (let cents = 0; cents <= 20000; cents += 1) {
    assert.equal(dollarsToCents(cents / 100), cents);
    assert.equal(dollarsToCents(-(cents / 100)), cents === 0 ? 0 : -cents);
  }
  assert.equal(dollarsToCents(1.005), 101);
  assert.equal(dollarsToCents(19.99), 1999);
  assert.equal(dollarsToCents(0.1 + 0.2), 30);
  assert.equal(dollarsToCents(8.995), 900);
});

test("planned allocations, refunds, extra income, and extra bills reconcile in cents", () => {
  assert.deepEqual(planTotals(plan), { income: 2900, bills: 610, savings: 290, flex: 2000 });
  const ledger = [
    tx("base", "2024-02-01", 2900, "Income", { isSystem: true }),
    tx("rent", "2024-02-01", -610, "Bills", { isSystem: true }),
    tx("savings", "2024-02-01", -290, "Savings", { isSystem: true }),
    tx("a", "2024-02-04", -0.1, "Food"), tx("b", "2024-02-04", -0.2, "Food"), tx("c", "2024-02-04", 0.15, "Food"),
    tx("d", "2024-02-06", -49, "Bills"), tx("e", "2024-02-04", 200, "Income"),
    tx("old", "2024-01-07", -900, "Shopping"),
  ];
  const result = budgetFor(plan, ledger, "2024-02-04");
  assert.equal(result.entries.length, 5);
  assert.equal(result.daySpentCents, 15);
  assert.equal(result.monthBudgetCents, 220000);
  assert.equal(result.monthSpentCents, 4915);
  assert.equal(result.monthLeftCents, 215085);
  assert.equal(result.categories.find(item => item.category === "Food")?.cents, 15);
  assert.equal(result.dailyCents - result.daySpentCents, result.dayLeftCents);
  assert.equal(result.plan.flex + result.monthIncomeCents - result.monthSpentCents, result.monthLeftCents);
  assert.equal(dayEquation(result).includes(formatCents(result.dayLeftCents)), true);
  assert.equal(monthEquation(result).includes(formatCents(result.monthLeftCents)), true);
});

test("adaptive allowance only carries earlier entries forward into today's target", () => {
  const result = budgetFor({ ...plan, rolloverUnspent: true }, [
    tx("a", "2024-02-26", -100, "Food"),
    tx("b", "2024-02-27", 30, "Income"),
    tx("c", "2024-02-28", -20, "Food"),
    tx("d", "2024-02-29", -800, "Food"),
  ], "2024-02-28");
  assert.equal(result.dailyCents, 96500);
  assert.equal(result.dayLeftCents, 94500);
  assert.equal(result.monthLeftCents, 111000);
});

test("fixed pace spreads extra income and ignores how other days were spent", () => {
  const withIncome = budgetFor(plan, [tx("pay", "2024-02-04", 290, "Income"), tx("meal", "2024-02-01", -50, "Food")], "2024-02-04");
  const untouched = budgetFor(plan, [], "2024-02-10");
  assert.equal(withIncome.dailyCents, roundShare(200000 + 29000, 29));
  assert.equal(untouched.dailyCents, roundShare(200000, 29));
  assert.notEqual(withIncome.dailyCents, untouched.dailyCents);
  assert.equal(budgetFor(plan, [tx("meal", "2024-02-01", -500, "Food")], "2024-02-02").dailyCents, untouched.dailyCents);
});

test("adaptive pace gives today's income to the days still left, then subtracts today's spending", () => {
  const result = budgetFor({ ...plan, rolloverUnspent: true }, [
    tx("pay", "2024-02-28", 30, "Income"),
    tx("meal", "2024-02-28", -20, "Food"),
  ], "2024-02-28");
  assert.equal(result.dailyCents, roundShare(200000 + 3000, 2));
  assert.equal(result.dayLeftCents, result.dailyCents - 2000);
});

test("pending rows stay visible and out of the totals", () => {
  const result = budgetFor(plan, [
    tx("posted", "2024-02-04", -10, "Food"),
    tx("hold", "2024-02-04", -25, "Shopping", { pending: true }),
  ], "2024-02-04");
  assert.equal(result.entries.length, 2);
  assert.equal(result.daySpentCents, 1000);
  assert.equal(result.monthSpentCents, 1000);
  assert.equal(result.pendingCents, -2500);
  assert.equal(result.categories.find(item => item.category === "Shopping")?.cents, 0);
});

test("future rows are hidden only when today is known", () => {
  const rows = [tx("later", "2024-02-20", -10, "Food")];
  assert.equal(budgetFor(plan, rows, "2024-02-04", "2024-02-04").entries.length, 0);
  assert.equal(budgetFor(plan, rows, "2024-02-04", "2024-02-04").hiddenFuture, 1);
  assert.equal(budgetFor(plan, rows, "2024-02-04", "2024-02-28").monthSpentCents, 1000);
});

test("a negative plan is visible instead of being clipped to zero", () => {
  const over: BudgetConfig = { ...plan, monthlyIncome: 100, savingsGoal: { mode: "fixed", amount: 40 } };
  const result = budgetFor(over, [], "2024-02-01");
  assert.equal(result.plan.flex, 10000 - 61000 - 4000);
  assert.ok(result.dailyCents < 0);
  assert.equal(result.dayLeftCents, result.dailyCents);
});

test("percent savings use basis points", () => {
  const odd: BudgetConfig = {
    ...plan, monthlyIncome: 10, bills: [], savingsGoal: { mode: "percent", percent: 33.33 },
  };
  assert.equal(planTotals(odd).savings, 3.33);
});

test("the November sample still reconciles to the daily figure", () => {
  const sample = sampleData("2026-11-10");
  const result = budgetFor(sample.config, sample.transactions, "2026-11-10", "2026-11-10");
  assert.equal(result.plan.flex, 186000);
  assert.equal(result.dailyCents, 6200);
  assert.equal(result.daySpentCents, 1995);
  assert.equal(result.dayLeftCents, 4205);
  assert.equal(result.monthSpentCents, 31115);
  assert.equal(result.monthLeftCents, 186000 - 31115);
  assert.equal(result.pendingCents, -840);
  assert.equal(dayEquation(result), "Target $62.00 − spent $19.95 = $42.05");
});

function roundShare(cents: number, days: number) {
  return Math.sign(cents / days) * Math.round(Math.abs(cents / days));
}
