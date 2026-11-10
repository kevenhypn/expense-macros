# Expense Macros: product and storage notes

The primary workflow is **plan → check today's allowance → log a transaction**. Monthly activity and plan settings are separate from the daily screen. The same Expo UI ships on native and the web.

- A plan sets monthly income, recurring bills, savings (USD or percentage), and a fixed or adaptive daily pace.
- Transactions are dated in local time and stored as signed amounts. Expenses are negative; refunds and extra income are positive. A refund keeps the category of the original expense.
- Planned income, bills, and savings are accounted for directly from the plan. Old generated rows are preserved in storage but excluded from totals and the editable activity log to prevent double counting.
- An extra bill payment or savings contribution logged manually reduces the flexible budget; a refund adds to it. Extra income increases the month balance and, in adaptive mode, changes subsequent daily targets.
- The plan is applied to calendar months. History records transactions, not past plan versions.
- There is no account, bank connection, or cloud sync. The demo is held in memory separately from saved entries.

Budget calculations live in `lib/budget.ts`; `lib/storage.ts` keeps the original AsyncStorage keys. `app/index.tsx` handles navigation and persistence; the dashboard and forms are split into focused components.
