# Personal Finance Tracker

A premium personal finance tracker application built with a **MERN Stack** (Node.js, Express, MongoDB, Mongoose) backend and an **Expo React Native** mobile client using file-based routing and a dynamic floating navigation menu layout.

---

## Key Features

1. **Onboarding & Splash Screens**: Premium splash screen welcoming users with custom branding and quick login/registration gates.
2. **Dashboard Overview**:
   * Real-time total net worth, active balances, assets vs. debts breakdown.
   * **Total Income & Total Expense**: Real-time month-to-date metrics card tracking income (`+`) and expense (`-`) totals.
   * **Monthly Spending Trend Chart**: Timeline spending graph with peak highlight tooltips.
3. **Wallet Management**:
   * Create, edit, and delete wallets with customized colors, icons, and account types (bank, cash, mobile wallet, credit card).
   * View monthly performance grids tracking wallet-specific income (+) and expense (-) activity.
   * Credit card limit tracking displaying available credit vs outstanding balance.
4. **Categories CRUD Manager**:
   * Customize categories with specific names, emojis, and color palettes.
   * Protect default system categories from accidental deletion or edit.
5. **Savings Goals Manager**:
   * Target amount progress indicators, deadline dates, and atomic contribution & withdrawal modals.
   * Dedicated full-screen goal details view with complete transaction histories.
6. **Friends & Split Ledgers (Credit Card Theme)**:
   * Send and receive friend requests via email.
   * **Credit Card Friend Items**: Styled active friend cards displaying net balances, holder details, and card serial formats.
   * **Receivable | Payable KPI Card**: Dual status display showing split balances side-by-side with `ArrowLeftDown` and `ArrowRightUp` indicators.
   * **Slide-up Settlement & Expense Drawers**: Animated bottom drawers to record settlement payments (with optional wallet synchronization) and log shared expenses.
7. **System & Account Settings**:
   * **System Settings**: Flag currency dropdown (USD 🇺🇸, MMK 🇲🇲, EUR 🇪🇺, SGD 🇸🇬, GBP 🇬🇧), Theme toggle (Light / Dark mode), and Alert warning triggers.
   * **Account Settings**: Edit profile name and monthly salary baseline.
   * **Legal Policies**: Embedded Privacy Policy and Terms & Conditions views.
8. **Auto-Recurring Transactions**:
   * Dedicated auto-transactions management screen accessible from the main Menu.
   * Schedule recurring items (salaries, subscriptions, department fees) with automated execution logic.
9. **Dynamic Floating Bottom Navigation Bar**:
   * Floating navbar that adapts background and border colors dynamically to Light/Dark mode themes.
   * Direct route integration for Home, Wallets, Add (+ modal), Friends, and Menu/Profile.
   * Standardized `AltArrowLeft` header back buttons across all sub-screens.

---

## Directory Structure

```text
personal-finance-tracker/
├── api_doc/                    # Backend API Reference Documentation
│   └── README.md
├── backend/                    # Node.js + Express API Backend
│   ├── controllers/            # Controller logic (Auth, Wallet, Ledger, SavingsGoal, etc.)
│   ├── models/                 # Mongoose Schema Definitions
│   ├── routes/                 # Express API Endpoint Routers
│   ├── server.js               # Entry script
│   └── package.json
└── client/                     # Expo React Native App
    ├── app/                    # Expo Router file structure
    │   ├── (tabs)/             # Main Views (Dashboard, Wallets, Friends, Profile)
    │   ├── _layout.tsx         # Layout provider stack
    │   ├── goals.tsx           # Goals manager view
    │   ├── goal-detail.tsx     # Goal detail & contribution history
    │   ├── auto-transactions.tsx # Auto-recurring schedule setups
    │   ├── account-settings.tsx # Profile account editor
    │   ├── privacy-policy.tsx  # Privacy Policy page
    │   ├── terms-conditions.tsx# Terms and Conditions page
    │   └── modal.tsx           # Transaction Add/Edit modal form
    ├── components/             # Reusable UI Atoms (CustomAlert overlay alerts)
    ├── services/               # API wrapper (Axios configs)
    ├── store/                  # Zustand global stores (authStore)
    ├── types/                  # TypeScript interface declarations
    └── package.json
```

---

## Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v16+)
* [MongoDB](https://www.mongodb.com/) (running locally or via Atlas)

### 2. Run MERN Backend
```bash
cd backend
npm install
npm start
```
* The backend server runs on `http://localhost:5001`.

### 3. Run Expo Mobile Client
```bash
cd client
npm install
npx expo start
```
* Press `i` to launch in the iOS Simulator or `a` for Android.

---

## API Documentation

For a detailed walkthrough of all backend API endpoints, schemas, request bodies, and JSON responses, refer to the [API Documentation Guide](file:///Users/maegbug/ai_project/personal_finance_tracker/api_doc/README.md).
