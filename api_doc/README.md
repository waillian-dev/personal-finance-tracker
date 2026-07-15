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
      "theme": "system"
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
    "theme": "light"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf349a...",
      "name": "Jane Smith",
      "currency": "MMK",
      "monthlySalary": 6000,
      "notificationSalary": false,
      "notificationExpenseLimit": true,
      "notificationMonthlyFee": false,
      "theme": "light"
    }
  }
  ```

---

## 2. Wallets

### Get All Wallets
* **Route**: `GET /api/wallets`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "_id": "64bdf35aa...",
        "name": "KBZ Bank",
        "balance": 450000,
        "currency": "MMK",
        "color": "#3B82F6",
        "type": "bank",
        "icon": "account-balance"
      }
    ]
  }
  ```

### Create Wallet
* **Route**: `POST /api/wallets`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "Cash Wallet",
    "balance": 15000,
    "currency": "MMK",
    "color": "#10B981",
    "type": "cash",
    "icon": "account-balance-wallet",
    "creditLimit": 0
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf36bb...",
      "userId": "64bdf349a...",
      "name": "Cash Wallet",
      "balance": 15000,
      "currency": "MMK",
      "color": "#10B981",
      "type": "cash",
      "icon": "account-balance-wallet"
    }
  }
  ```

### Update Wallet
* **Route**: `PUT /api/wallets/:id`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "Cash Pocket",
    "color": "#EC4899"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf36bb...",
      "name": "Cash Pocket",
      "balance": 15000,
      "color": "#EC4899"
    }
  }
  ```

### Delete Wallet
* **Route**: `DELETE /api/wallets/:id`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

---

## 3. Categories

### Get Categories
* **Route**: `GET /api/categories`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [
      {
        "_id": "64bdf37cc...",
        "userId": null,
        "name": "Food & Drinks",
        "type": "expense",
        "emoji": "🍔",
        "color": "#EF4444"
      }
    ]
  }
  ```

### Create Custom Category
* **Route**: `POST /api/categories`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "Subscriptions",
    "type": "expense",
    "color": "#8B5CF6",
    "emoji": "🎬"
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf38dd...",
      "userId": "64bdf349a...",
      "name": "Subscriptions",
      "type": "expense",
      "color": "#8B5CF6",
      "emoji": "🎬"
    }
  }
  ```

### Update Custom Category
* **Route**: `PUT /api/categories/:id`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "Tech Subscriptions",
    "emoji": "💻",
    "color": "#6366F1"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf38dd...",
      "name": "Tech Subscriptions",
      "emoji": "💻",
      "color": "#6366F1"
    }
  }
  ```

### Delete Custom Category
* **Route**: `DELETE /api/categories/:id`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "message": "Category deleted successfully"
  }
  ```

---

## 4. Transactions

### Get Transactions (Filtered)
* **Route**: `GET /api/transactions`
* **Access**: Private (Protected)
* **Query Parameters**:
  - `limit`: number
  - `startDate`: YYYY-MM-DD
  - `endDate`: YYYY-MM-DD
  - `type`: `income` | `expense` | `transfer`
  - `walletId`: string
  - `categoryId`: string
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "_id": "64bdf39ee...",
        "amount": 2500,
        "type": "expense",
        "description": "Lunch split",
        "date": "2026-07-15T00:00:00.000Z",
        "walletId": {
          "_id": "64bdf36bb...",
          "name": "Cash Pocket"
        },
        "categoryId": {
          "_id": "64bdf37cc...",
          "name": "Food & Drinks",
          "emoji": "🍔"
        }
      }
    ]
  }
  ```

### Create Transaction
* **Route**: `POST /api/transactions`
* **Access**: Private (Protected)
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
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf39ee...",
      "amount": 12000,
      "type": "expense",
      "description": "Weekly grocery list"
    }
  }
  ```

### Get Transaction by ID
* **Route**: `GET /api/transactions/:id`
* **Access**: Private (Protected)

### Update Transaction
* **Route**: `PUT /api/transactions/:id`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "amount": 14000,
    "description": "Weekly grocery list (adjusted)"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf39ee...",
      "amount": 14000,
      "description": "Weekly grocery list (adjusted)"
    }
  }
  ```

### Delete Transaction
* **Route**: `DELETE /api/transactions/:id`
* **Access**: Private (Protected)

---

## 5. Recurring Setup

### Create Auto-Recurring Transaction Setup
* **Route**: `POST /api/recurring`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "name": "Monthly Netflix",
    "type": "expense",
    "amount": 15.99,
    "walletId": "64bdf36bb...",
    "categoryId": "64bdf38dd...",
    "frequency": "monthly",
    "nextDueDate": "2026-08-01T00:00:00.000Z"
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "64bdf40ff...",
      "name": "Monthly Netflix",
      "nextDueDate": "2026-08-01T00:00:00.000Z",
      "isActive": true
    }
  }
  ```

---

## 6. Friends & Split Ledger

### Send Friend Request
* **Route**: `POST /api/friends/request`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "email": "friend@example.com"
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "message": "Friend request sent"
  }
  ```

### Get Friends List & Pending Requests
* **Route**: `GET /api/friends`
* **Access**: Private (Protected)
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "friends": [
        {
          "friendshipId": "64bdf77ff...",
          "friend": {
            "_id": "64bdf999z...",
            "name": "Bob Friend",
            "email": "friend@example.com"
          },
          "netBalance": 25.50
        }
      ],
      "pendingIncoming": [],
      "pendingOutgoing": []
    }
  }
  ```

### Respond to Friend Request
* **Route**: `PUT /api/friends/request/:id`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "status": "accepted" // or "rejected"
  }
  ```

### Log Shared Split Expense
* **Route**: `POST /api/ledger`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "description": "Starbucks Split",
    "amount": 10.00,
    "friendId": "64bdf999z...",
    "paidByMe": true,
    "split50": true
  }
  ```

### Settle Ledger with Custom Payment and Wallet Sync
* **Route**: `POST /api/ledger/pay`
* **Access**: Private (Protected)
* **Request Payload**:
  ```json
  {
    "friendId": "64bdf999z...",
    "amount": 25.50,
    "walletId": "64bdf36bb..." // Optional wallet for standard transaction recording
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "data": {
      "description": "Settlement Payment",
      "amount": 25.50,
      "settled": true
    }
  }
  ```
