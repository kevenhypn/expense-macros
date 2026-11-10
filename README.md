# Expense Macros

Expense Macros turns monthly take-home income, recurring bills, and a savings target into a daily spending pace. Log expenses, refunds, and extra income as you go. The plan and the log stay on the device. There is no account, bank connection, or cloud sync.

## Run it on a Mac

You need Node.js 22 or newer. This repo pins that in `.nvmrc`.

```bash
node -v
```

If that is missing or older than 22:

```bash
# Homebrew
brew install node@22
brew link --overwrite node@22

# or nvm, from the repo root
nvm install
nvm use
```

Then:

```bash
git clone https://github.com/kevenhypn/expense-macros.git
cd expense-macros
git checkout cursor/audit-fixes-6f9b
make dev
```

`make dev` installs the lockfile (`npm ci`) if `node_modules` is missing and starts the web app at <http://localhost:8081>. Open that address if the browser does not. On the first screen, choose **Try sample data** or **Create a plan**.

The same checks the project uses:

```bash
make check
```

That is `npm run typecheck` and `npm test`. Dependencies are pinned by `package-lock.json`. Use `npm ci`, not `npm install`, so a fresh clone matches this lockfile.

`make` is the one command. The same steps without it:

```bash
npm ci
npm test
npm run dev
```

## How the numbers work

Amounts are US dollars. Dates are the device’s local calendar days, and a budget period is a calendar month.

- Left for spending = take-home income − recurring bills − savings.
- **Fixed pace:** that amount, plus extra income received on or before the day you are viewing, divided across every day of the month. Spending on other days does not change today’s target.
- **Adaptive pace:** what is left after earlier posted activity, plus today’s extra income, divided across the days still left including today.
- Today’s posted spending is then subtracted in full. A refund reduces that spending.
- Pending transactions stay in the log and out of every total until you edit them and turn pending off.
- Older automatic income, bill, and savings rows are kept in storage and ignored. The plan already counts them.

The Today card writes the equation under the number, so the target, the spending, and the amount left are the same cents.

## Import

Activity → Import. Paste one transaction per line, review every row, then save. Nothing is stored before that confirmation.

```text
2026-11-09 | -12.40 | Food | Lunch | Checking | posted
2026-11-10 | -8.40 | Other | Pharmacy | Visa | pending
```

Fields are date, amount, category, and optional description, account, and status. Separate them with `|`, a comma, a semicolon, or a tab. Quote a field that contains a comma. An amount without a sign is an expense, unless the category is Income. Dates can be `2026-11-10`, `11/10/2026`, or `Nov 10, 2026`.

## iPhone

**Home Screen app.** After this branch is published, open the HTTPS URL in Safari, tap Share → Add to Home Screen, turn on Open as Web App, and add it. Open it once while online before using it offline.

**Preview from the Mac.** Run `make dev`. On the iPhone, open the Mac’s `http://` address shown by Expo while both devices are on the same Wi-Fi. Offline use needs the HTTPS Home Screen app. For a native preview, run `npm start` and scan the QR code with a current Expo Go.

**TestFlight.** The iOS bundle id is still `com.kevenhypn.expensemacros`. With Expo and Apple signing set up, `eas build --platform ios --profile production`, then submit that build. Bump the build number if Apple already has it.

The Home Screen app, Expo Go, and a signed install do not share storage.

## GitHub Pages

Settings → Pages → Build and deployment → Source: GitHub Actions. On the default branch, run **Publish iPhone web app**. The workflow uses Node 22, runs the checks, and publishes the web build. For a subpath build locally:

```bash
EXPENSE_MACROS_BASE_PATH=/expense-macros npm run build:web
python3 -m http.server 8765 --directory dist
```

Generate the app icons with `npm run assets:generate`.
