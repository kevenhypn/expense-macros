# Expense Macros — MVP Spec (Agent-Oriented)

This document describes the current MVP behavior and architecture so an AI agent can reason about improvements.

## Purpose
A lightweight budgeting app that turns a monthly income, bills, and savings goal into a daily/period spending budget, then helps the user log transactions and track progress at a day and period level.

## Target User
Someone who wants a simple, fast way to see:
- How much they can spend today
- How much they can spend for the current period (month)
- Where spending is going by category

## Core MVP Features (Implemented)
- Setup wizard to capture monthly income, period start date, recurring bills, and savings goal. `app/setup/index.tsx`
- Auto-generated system transactions for Income, Bills, and Savings (non-editable). `lib/storage.ts`
- Daily and period budget calculations based on config and logged transactions. `app/index.tsx`
- Add, edit, delete, and undo-delete transactions with categories and optional notes. `app/index.tsx`
- Category-based spending breakdowns (today and period). `app/index.tsx`
- Local-only data storage using AsyncStorage. `lib/storage.ts`
- Two main views: Day + Log and Period Breakdown. `app/index.tsx`

## Current Screens & Navigation
- Root layout: Expo Router stack with `index` and `setup/index`. `app/_layout.tsx`
- Setup Wizard (4 steps):
  1) Income + period start date + rollover toggle
  2) Recurring bills
  3) Savings goal (percent or fixed)
  4) Review + save
  `app/setup/index.tsx`
- Dashboard:
  - Day view: Today’s budget card, period budget card, today’s spending list, add transaction modal, edit modal, undo delete snackbar.
  - Period view: Period summary, full category breakdown, discretionary category breakdown, period log.
  `app/index.tsx`

## Data Model
Defined in `types/index.ts`:
- `Transaction`
  - `amount` positive = income/reimbursement, negative = spending.
  - `category` uses `TransactionCategory` union.
  - `isSystem` marks auto-generated items (income, bills, savings).
- `BudgetConfig`
  - `monthlyIncome`, `startDate`, `bills[]`, `savingsGoal`, optional `rolloverUnspent`.

## Storage
Local persistence via AsyncStorage. `lib/storage.ts`
- Config key: `expense_macros_budget_config`
- Transactions key: `expense_macros_transactions`
- No server, no sync, no authentication.

## Categories
Defined in `types/index.ts` and styled in `lib/categoryStyles.ts`.
- Spending categories: `Food`, `Shopping`, `Transport`, `Entertainment`, `Other`
- System categories: `Bills`, `Savings`, `Income`

## Budget & Calculation Logic (Current Behavior)
All main logic lives in `app/index.tsx` and `lib/storage.ts`.

- **Available to Spend (base):**
  `monthlyIncome - sum(bills) - savingsGoal`
  computed by `calculateFinancials(config)` in `lib/storage.ts`.

- **System Transactions Generation:**
  On save in setup, `regenerateSystemTransactions(config)` creates:
  1) `Income` (+monthlyIncome)
  2) `Bills` (each bill as negative)
  3) `Savings` (negative, if > 0)
  User-entered transactions are preserved. `lib/storage.ts`

- **Income Adjustments:**
  Any *user-entered* `Income` transactions add to available-to-spend for the period. `app/index.tsx`

- **Period Budget (`periodLeft`):**
  `availableToSpend + netDiscretionary`
  where `netDiscretionary` is sum of spending-category transactions for current month.

- **Daily Budget (fixed vs rollover):**
  - Fixed: `availableToSpend / daysInMonth`
  - Rollover:
    - Iterate day-by-day, reducing remaining budget by actual spend
    - Today’s budget is remaining budget divided by remaining days
  `app/index.tsx`

- **Today’s Budget (`todayLeft`):**
  `dailyBudget - todaySpent`

- **Spending Aggregations:**
  - "Discretionary" includes only spending categories (excludes Bills, Savings, Income)
  - Category breakdowns are based on absolute spend per category.
  `app/index.tsx`

## User Flows (MVP)
- First run:
  - No config -> redirect to setup. `app/index.tsx`
  - Complete setup -> system transactions generated -> dashboard loads. `app/setup/index.tsx`

- Add transaction:
  - Choose IN/OUT, amount, category, optional note
  - OUT is stored as negative; IN as positive
  - Saved to AsyncStorage
  `app/index.tsx`

- Edit transaction:
  - Edit date, amount, note, category via modal
  - Amount sign preserves original sign (income vs spending)
  `app/index.tsx`

- Delete transaction:
  - Soft delete with 5s undo window
  - Undo restores previous list
  `app/index.tsx`

## Non-Goals / Out of Scope (Currently)
- No cloud sync or multi-device support
- No recurring custom schedules beyond monthly system entries
- No analytics over multiple months
- No authentication
- No export/import

## Known Constraints & Assumptions
- Dates are stored as `YYYY-MM-DD` strings (local time).
- Monthly period is derived from `selectedDateISO` month, not strictly from `startDate`.
- Budgeting uses calendar months and `daysInMonth`, not a rolling 30-day period.
- Transactions are stored as a flat list; no indices or pagination.

## Tech Stack (Current)
- React Native + Expo Router
- NativeWind for styling
- AsyncStorage for persistence
- Reanimated for card animations
- DateTimePicker for date selection
`package.json`

## Opportunities for Improvement (Shortlist)
- Align “period” with the configured `startDate` instead of calendar months.
- Add validation / masking for date and amount inputs.
- Add import/export (CSV) for transactions.
- Add charts or trend lines for longer-term insights.
- Add category budget caps or alerts.
- Add a “Reimbursement” or “Transfer” category to reduce confusion.
- Add duplicate prevention for system transactions when config changes.

## Open Questions for Product Direction
- Should the budget period be calendar month or custom cycle (start date to start date)?
- Should user-entered Income be treated as “extra” or replace monthly income?
- Should Bills/Savings transactions be editable, or only changed via Setup?
- Should multi-currency or locale-specific formatting be supported?

## Primary Files
- `app/index.tsx` — Dashboard UI + calculations
- `app/setup/index.tsx` — Setup wizard
- `lib/storage.ts` — Storage + system transaction generation + calculation helpers
- `types/index.ts` — Core types
- `components/*` — UI components
