# Expense Macros

Expense Macros is a local-first daily spending tracker for iPhone, Android, and the web. Set your monthly take-home income, recurring bills, and savings target. The app turns the rest into a daily spending target. Log expenses, refunds, and extra income as you go.

- **Today** shows how much you have left, with a week picker and daily log.
- **Activity** shows monthly spending by category and a filterable log. Tap a transaction to edit or delete it; the delete message offers undo.
- **Plan** shows what you have set aside and lets you adjust your monthly targets. The welcome screen has an isolated sample plan you can try without saving anything.

Amounts use USD. Budgets use calendar months and the device's local date. A fixed daily pace divides the planned flexible budget by the days in the month; an adaptive pace also carries earlier entries forward. Extra income increases the monthly budget. Bills or savings logged as transactions count as extra outflows beyond the planned allocations. Changing the plan recalculates the displayed targets for all months, while keeping the original transaction log intact.

## Use on iPhone

**Home Screen app:** Open the deployed HTTPS URL in Safari, tap **Share → Add to Home Screen**, enable **Open as Web App**, and tap **Add**. Open it once while online before going offline. No App Store submission is needed for this option.

**Preview from your Mac:** Run the web build below. Open the Mac's local network address on the iPhone while both devices are on the same Wi-Fi. Plain HTTP previews work online, but require HTTPS for offline operation. For a native preview, Expo SDK 54 also supports the compatible iOS Expo Go client: run `npm start` and scan the QR code from the same network.

**Native TestFlight/App Store build:** This project retains the iOS bundle ID `com.kevenhypn.expensemacros`. With an Expo account and Apple signing set up, run `eas build --platform ios --profile production`, then submit the build to App Store Connect for TestFlight. Update the build number if that number is already used.

Data is stored on the device in the original Expo AsyncStorage keys. An update to an existing native install with the same identity can read its saved plan and ledger. The Home Screen web app, Expo Go, and a signed native install have separate storage and do not sync. Use the same installed app for ongoing logging.

## Develop and check

Node 22 recommended.

```sh
npm ci
npm run typecheck
npm test
npm start
```

Build and serve the installable web version:

```sh
npm run build:web
python3 -m http.server 8765 --bind 0.0.0.0 --directory dist
```

Open `http://localhost:8765/` on the Mac. To serve under a subpath, build with `EXPENSE_MACROS_BASE_PATH=/expense-macros npm run build:web` and serve the result from that directory.

For GitHub Pages, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. With this code on the default branch, manually run **Publish iPhone web app** from the Actions tab. Use the URL reported by the deployment. The workflow builds and checks the app before publishing.

Generate the native and Home Screen icons with `npm run assets:generate`.
