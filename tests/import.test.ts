import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTransactionImport } from "../lib/transactionImport.ts";

const today = "2026-11-10";

test("pipe rows, repeats, and pending stay distinct", () => {
  const rows = parseTransactionImport([
    "2026-11-01 | -12.40 | Food | Lunch | Checking | posted",
    "2026-11-01 | -12.40 | Food | Lunch | Checking | posted",
    "2026-11-02 | -8.40 | Other | Pharmacy | Visa | pending",
  ].join("\n"), today);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].amount, -12.4);
  assert.equal(rows[0].id === rows[1].id, false);
  assert.equal(rows[2].pending, true);
  assert.equal(rows[2].account, "Visa");
});

test("csv quotes, US dates, unicode minus, and an unsigned expense", () => {
  const csv = parseTransactionImport([
    "date,amount,category,description,account,status",
    "11/02/2026, -8.40, groceries, \"Market, downtown\", Visa, hold",
    "\"Nov 3, 2026\", −15.00, Transport, Fuel, , cleared",
    "2026-11-05, 200, paycheck, Bonus",
  ].join("\n"), today);
  assert.deepEqual(csv.map(row => [row.date, row.category, row.note, row.pending ?? false]), [
    ["2026-11-02", "Food", "Market, downtown", true],
    ["2026-11-03", "Transport", "Fuel", false],
    ["2026-11-05", "Income", "Bonus", false],
  ]);
  assert.deepEqual(csv.map(row => Math.round(row.amount * 100)), [-840, -1500, 20000]);

  const refund = parseTransactionImport("2026-11-04; +6.50; Food; Refunded coffee; Checking; posted", today);
  assert.equal(Math.round(refund[0].amount * 100), 650);
  assert.equal(refund[0].account, "Checking");
});

test("a later row can use a different delimiter", () => {
  const rows = parseTransactionImport([
    "2026-11-01 | -12.40 | Food | Lunch | Checking | posted",
    "2026-11-02, -8.40, Other, Pharmacy, Visa, pending",
  ].join("\n"), today);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].category, "Other");
  assert.equal(rows[1].pending, true);
});

test("parentheses, a byte-order mark, blank lines, and a trailing delimiter", () => {
  const rows = parseTransactionImport("\uFEFF2026-11-06 | ($4.25) | Entertainment | Matinee |  |\n\n", today);
  assert.equal(rows[0].amount, -4.25);
  assert.equal(rows[0].account, undefined);
  assert.equal(rows[0].pending, undefined);
});

test("a bad row rejects the whole paste and names the line", () => {
  assert.throws(
    () => parseTransactionImport("2026-11-01 | -1 | Food | Lunch | Checking | posted\nnot a row\n2026-11-12 | -1 | Food | Future |  | posted", today),
    /Line 2:.*\nLine 3:/,
  );
});

test("empty, oversized, income sign, and future dates fail closed", () => {
  assert.throws(() => parseTransactionImport("   \n", today), /at least one/);
  assert.throws(() => parseTransactionImport("date,amount,category\n", today), /only has a header/);
  assert.throws(() => parseTransactionImport(`${"2026-11-01, -1, Food\n".repeat(501)}`, today), /500/);
  assert.throws(() => parseTransactionImport("2026-11-01 | -20 | Income | Pay |  | posted", today), /positive/);
  assert.throws(() => parseTransactionImport("2026-02-29 | -1 | Food | Leap |  | posted", today), /real date/);
  assert.throws(() => parseTransactionImport("2026-11-11 | -1 | Food | Tomorrow |  | posted", today), /on or before today/);
});
