# Expense Macros

A lightweight budgeting app built with Expo and React Native.

## Local Development

```bash
npm install
npm run start
```

## Generate Store Assets

```bash
npm run assets:generate
```

## EAS Prerequisites

```bash
npm install -g eas-cli
eas login
eas build:configure
```

## Build For Stores

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Submission Notes

- iOS: Upload via EAS Submit or App Store Connect/TestFlight.
- Android: First submission must be a manual upload in Play Console; after that you can automate.

## Bundle/Package IDs

- iOS bundle identifier: `com.kevenhypn.expensemacros`
- Android package: `com.kevenhypn.expensemacros`

## Privacy/Support Pages (GitHub Pages)

This repo includes `docs/privacy.html` and `docs/support.html` for GitHub Pages.

To enable GitHub Pages:
1. Go to GitHub repo settings.
2. Pages ? Source: `Deploy from a branch`.
3. Branch: `main` (or your default), folder: `/docs`.

Once enabled, the URLs should be:
- https://kevenhypn.github.io/expense-macros/privacy.html
- https://kevenhypn.github.io/expense-macros/support.html
