# Expense Macros

Local daily spending tracker. One Expo UI for web, iOS, and Android.

## Flow

Plan → today’s pace → log a transaction. Activity is the month: category totals, search, filters, and import. Sample data stays in memory until you leave it.

## Money

All budget math uses integer cents in `lib/budget.ts`.

- Flexible plan = income − bills − savings. A percent savings target is basis points of income, rounded to the cent.
- Fixed daily target = (flexible plan + extra income on or before the selected day) / days in the month.
- Adaptive daily target = (flexible plan + posted activity before the selected day + today’s extra income) / days left, including today.
- Amount left today = daily target − today’s net posted spending. Refunds reduce spending. Pending rows are excluded.
- Month left = flexible plan + posted extra income − posted non-income spending, for the calendar month up to today.
- System rows from the previous version stay in storage and are excluded, so the plan is not counted twice.
- `lib/validate.ts` drops unreadable rows and reports them. Corrupt JSON is an error with a way to erase the device data, not an empty new plan.

## Import

`lib/transactionImport.ts` reads up to 500 rows. A bad row rejects the whole paste and names the line. The screen lists every row before anything is saved.

## Storage

AsyncStorage keys are unchanged: `expense_macros_budget_config`, `expense_macros_transactions`, and `expense_macros_appearance`.

## Checks

`make check` runs TypeScript and `tests/*.test.ts` on Node 22.
