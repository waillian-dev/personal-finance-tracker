# Personal Finance Tracker - Backend API Documentation

This document describes the REST API endpoints provided by the MERN backend of the Personal Finance Tracker application.

---

## Global Details

* **Base URL**: `http://localhost:5001` (Development)
* **Headers**: All private/protected routes require a JSON Web Token (JWT) sent in the Authorization header:
  ```http
  Authorization: Bearer <your_jwt_token>
  ```
* **Content-Type**: `application/json`

---

## 1. Authentication & Profile Settings

### Register User
* **Route**: `POST /api/auth/register`
* **Access**: Public
* **Request Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "currency": "USD"
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf349a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "currency": "USD",
      "theme": "system",
      "token": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```

### Login User
* **Route**: `POST /api/auth/login`
* **Access**: Public
* **Request Payload**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf349a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "currency": "USD",
      "theme": "system",
      "token": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```

### Get Current User Profile
* **Route**: `GET /api/auth/me`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf349a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "currency": "USD",
      "monthlySalary": 5000,
      "notificationSalary": true,
      "notificationExpenseLimit": true,
      "notificationMonthlyFee": true,
      "theme": "dark"
    }
  }
  ```

### Update User Configurations
* **Route**: `PUT /api/auth/settings`
* **Access**: Private (Protected)
* **Request Payload** (All keys are optional):
  ```json
  {
    "name": "Jane Smith",
    "currency": "MMK",
    "monthlySalary": 6000,
    "notificationSalary": false,
    "notificationExpenseLimit": true,
    "notificationMonthlyFee": false,
    "theme": "dark"
  }
  ```

---

## 2. Wallets

### Get All Wallets
* **Route**: `GET /api/wallets`
* **Access**: Private (Protected)

### Create Wallet
* **Route**: `POST /api/wallets`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "KBZ Bank",
    "balance": 500000,
    "currency": "MMK",
    "color": "#3B82F6",
    "type": "bank",
    "icon": "account-balance",
    "creditLimit": 0
  }
  ```

### Update Wallet
* **Route**: `PUT /api/wallets/:id`
* **Access**: Private (Protected)

### Delete Wallet
* **Route**: `DELETE /api/wallets/:id`
* **Access**: Private (Protected)

---

## 3. Categories

### Get Categories
* **Route**: `GET /api/categories`

### Create Custom Category
* **Route**: `POST /api/categories`
* **Request Payload**:
  ```json
  {
    "name": "Subscriptions",
    "type": "expense",
    "color": "#8B5CF6",
    "emoji": "🎬"
  }
  ```

### Update Custom Category
* **Route**: `PUT /api/categories/:id`

### Delete Custom Category
* **Route**: `DELETE /api/categories/:id`

---

## 4. Transactions

### Get Transactions (Filtered)
* **Route**: `GET /api/transactions`
* **Query Parameters**: `limit`, `startDate`, `endDate`, `type`, `walletId`, `categoryId`

### Create Transaction
* **Route**: `POST /api/transactions`
* **Request Payload**:
  ```json
  {
    "walletId": "64bdf36bb...",
    "categoryId": "64bdf37cc...",
    "type": "expense",
    "amount": 12000,
    "description": "Weekly grocery list",
    "destinationWalletId": null
  }
  ```

### Update Transaction
* **Route**: `PUT /api/transactions/:id`

### Delete Transaction
* **Route**: `DELETE /api/transactions/:id`

---

## 5. Savings Goals

### Get All Savings Goals
* **Route**: `GET /api/goals`
* **Access**: Private (Protected)

### Create Savings Goal
* **Route**: `POST /api/goals`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "New Car Fund",
    "targetAmount": 15000,
    "currentAmount": 2000,
    "targetDate": "2026-12-31T00:00:00.000Z",
    "color": "#10B981"
  }
  ```

### Add Contribution to Goal
* **Route**: `POST /api/goals/:id/contribute`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "amount": 500,
    "walletId": "64bdf36bb...",
    "note": "Monthly savings allocation"
  }
  ```

### Withdraw from Goal
* **Route**: `POST /api/goals/:id/withdraw`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "amount": 200,
    "walletId": "64bdf36bb...",
    "note": "Emergency maintenance"
  }
  ```

---

## 6. Auto-Recurring Transactions

### Get Recurring Setups
* **Route**: `GET /api/recurring`

### Create Recurring Setup
* **Route**: `POST /api/recurring`
* **Request Payload**:
  ```json
  {
    "name": "Monthly Salary",
    "type": "income",
    "amount": 3500,
    "walletId": "64bdf36bb...",
    "categoryId": "64bdf37cc...",
    "frequency": "monthly",
    "nextDueDate": "2026-08-01T00:00:00.000Z"
  }
  ```

### Toggle Active Status
* **Route**: `PUT /api/recurring/:id/toggle`

### Delete Setup
* **Route**: `DELETE /api/recurring/:id`

---

## 7. Friends & Split Ledgers

### Send Friend Request
* **Route**: `POST /api/friends/request`
* **Request Payload**: `{ "email": "friend@example.com" }`

### Get Friends & Pending Lists
* **Route**: `GET /api/friends`

### Respond to Request
* **Route**: `PUT /api/friends/request/:id`
* **Request Payload**: `{ "status": "accepted" }` // or "rejected"

### Log Shared Split Expense
* **Route**: `POST /api/ledger`
* **Request Payload**:
  ```json
  {
    "description": "Dinner Split",
    "amount": 40.00,
    "friendId": "64bdf999z...",
    "paidByMe": true,
    "split50": true
  }
  ```

### Settle Up Payment with Wallet Sync
* **Route**: `POST /api/ledger/pay`
* **Request Payload**:
  ```json
  {
    "friendId": "64bdf999z...",
    "amount": 20.00,
    "walletId": "64bdf36bb..."
  }
  ```
