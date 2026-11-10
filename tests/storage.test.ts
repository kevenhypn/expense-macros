import { test } from "node:test";
import assert from "node:assert/strict";
import { DataError, normalizeStored } from "../lib/validate.ts";

const plan = {
  startDate: "2026-11-01",
  monthlyIncome: 10.1,
  bills: [
    { id: "rent", name: "Rent", amount: 1.15 },
    { id: "bad", name: " ", amount: 5 },
    { name: "Phone", amount: 19.99 },
  ],
  savingsGoal: { mode: "fixed", amount: 0.1 },
  rolloverUnspent: true,
};

test("readable rows are repaired and unreadable rows are dropped", () => {
  const transactions = [
    { id: "a", date: "2026-11-01", amount: 0.1 + 0.2, category: "Food", note: "  Coffee  " },
    { id: "a", date: "2026-11-02", amount: -1, category: "Food" },
    { id: "b", date: "2026-02-29", amount: -1, category: "Food" },
    { id: "c", date: "2026-11-03", amount: -4, category: "Nope" },
    { id: "d", date: "2026-11-04", amount: -8, category: "Income" },
    { id: "e", date: "2026-11-05", amount: 12, category: "Income", isSystem: true, pending: true, account: " Checking " },
    { nope: true },
  ];
  const result = normalizeStored(JSON.stringify(plan), JSON.stringify(transactions));
  assert.equal(Math.round((result.config?.monthlyIncome ?? 0) * 100), 1010);
  assert.deepEqual(result.config?.bills.map(bill => [bill.name, Math.round(bill.amount * 100)]), [["Rent", 115], ["Phone", 1999]]);
  assert.equal(result.config?.rolloverUnspent, true);
  assert.equal(result.transactions.length, 2);
  assert.equal(Math.round(result.transactions[0].amount * 100), 30);
  assert.equal(result.transactions[0].note, "Coffee");
  assert.equal(result.transactions[1].isSystem, true);
  assert.equal(result.transactions[1].pending, true);
  assert.equal(result.transactions[1].account, "Checking");
  assert.match(result.warnings.join(" "), /unreadable bill/);
  assert.match(result.warnings.join(" "), /unreadable transaction/);
  assert.match(result.warnings.join(" "), /duplicate/);
});

test("missing storage is a new plan, and corrupt storage is not treated as empty", () => {
  assert.deepEqual(normalizeStored(null, null), { config: null, transactions: [], warnings: [] });
  assert.throws(() => normalizeStored("{", "[]"), DataError);
  assert.throws(() => normalizeStored("{}", "[]"), DataError);
  assert.throws(() => normalizeStored(JSON.stringify(plan), "{"), DataError);
  assert.throws(() => normalizeStored(JSON.stringify(plan), "{\"id\":1}"), DataError);
});

test("an unknown pace flag is reset without discarding the plan", () => {
  const result = normalizeStored(JSON.stringify({ ...plan, rolloverUnspent: "yes", startDate: "nope" }), "[]");
  assert.equal(result.config?.rolloverUnspent, false);
  assert.match(result.warnings.join(" "), /pace/);
  assert.match(result.warnings.join(" "), /plan date/);
});
