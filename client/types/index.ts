export interface User {
  _id: string;
  name: string;
  email: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  isVerified: boolean;
  monthlySalary: number;
  notificationSalary?: boolean;
  notificationExpenseLimit?: boolean;
  notificationMonthlyFee?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Wallet {
  _id: string;
  userId: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  type: 'cash' | 'bank' | 'mobile_wallet' | 'credit_card' | 'other';
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  userId: string | null;
  name: string;
  type: 'income' | 'expense';
  color: string;
  emoji: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  walletId: Wallet;
  categoryId: Category;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description?: string;
  merchant?: string;
  receiptUrl?: string;
  destinationWalletId?: Wallet | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    _id: string;
    name: string;
    email: string;
    currency: string;
    theme: 'light' | 'dark' | 'system';
    monthlySalary: number;
    token: string;
    refreshToken: string;
  };
}
