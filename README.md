# Personal Finance Tracker

A premium personal finance tracker application built with a **MERN Stack** (Node.js, Express, MongoDB, Mongoose) backend and an **Expo React Native** mobile client using file-based routing and a floating navigation menu layout.

---

## Key Features

1. **Onboarding & Splash Screens**: Premium splash screen welcoming users with custom branding and quick login/registration gates.
2. **Dashboard Overview**: Displays total net worth, assets vs. debts, and friends' receivable/payable sums in real-time.
3. **Wallet Management**:
   * Create, edit, and delete wallets with customized colors and account types.
   * View monthly performance grids tracking wallet-specific income (+) and expense (-) activity.
4. **Categories CRUD Manager**:
   * Customize categories with specific names, emojis, and color palettes.
   * Protect default system categories from accidental deletion or edit.
5. **Auto-Recurring Setups**:
   * Schedule recurring items (e.g., salary, department fees, subscriptions) inside settings.
   * Supports manual `YYYY-MM-DD` next run due date configurations.
6. **Notification Settings**:
   * Toggle settings for monthly salary credits, expense limits, and fee reports.
7. **Friends & Shared Ledger**:
   * Send and receive friend requests via email.
   * View consolidated "owes you" / "you owe" net friend balances.
   * Record shared split items in a timeline ledger.
8. **Splits in Wallet Transaction Forms**:
   * Link any regular wallet transaction to a friend.
   * Auto-calculates a 50% split default, logs the wallet transaction, and generates the ledger record concurrently.
9. **Flexible Settle Up System**:
   * Settle balances in full or record custom partial payment amounts.
   * **Wallet Syncing**: Option to sync settlement payments directly to your own wallet (creates an income or expense transaction in the selected wallet).

---

## Directory Structure

```text
personal-finance-tracker/
├── api_doc/                    # Backend API Reference Documentation
│   └── README.md
├── backend/                    # Node.js + Express API Backend
│   ├── controllers/            # Controller logic (Auth, Wallet, Ledger, etc.)
│   ├── models/                 # Mongoose Schema Definitions
│   ├── routes/                 # Express API Endpoint Routers
│   ├── server.js               # Entry script
│   └── package.json
└── client/                     # Expo React Native App
    ├── app/                    # Expo Router file structure
    │   ├── (tabs)/             # Main Views (Dashboard, Wallets, Friends, Profile)
    │   ├── _layout.tsx         # Layout provider stack
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
