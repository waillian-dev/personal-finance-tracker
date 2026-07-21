import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';
import { getItem, setItem, deleteItem } from '../utils/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  error: string | null;
  login: (email: string, password: string, keepSignedIn?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, currency?: string, theme?: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: {
    name?: string;
    currency?: string;
    theme?: string;
    monthlySalary?: number;
    notificationSalary?: boolean;
    notificationExpenseLimit?: boolean;
    notificationMonthlyFee?: boolean;
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  hasSeenOnboarding: false,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const seenOnboarding = await getItem('hasSeenOnboarding');
      const keepSignedIn = await getItem('keepSignedIn');
      const token = await getItem('userToken');
      const hasSeen = seenOnboarding === 'true';

      // Check if user opted out of persistent session
      if (keepSignedIn === 'false') {
        await deleteItem('userToken');
        await deleteItem('refreshToken');
        set({ user: null, token: null, hasSeenOnboarding: hasSeen, isLoading: false });
        return;
      }

      if (token) {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          set({ user: response.data.data, token, hasSeenOnboarding: hasSeen, isLoading: false });
          return;
        }
      }
      set({ user: null, token: null, hasSeenOnboarding: hasSeen, isLoading: false });
    } catch (error: any) {
      console.log('App initialization auth check failed:', error.message);
      await deleteItem('userToken');
      await deleteItem('refreshToken');
      const seenOnboarding = await getItem('hasSeenOnboarding');
      set({ user: null, token: null, hasSeenOnboarding: seenOnboarding === 'true', isLoading: false });
    }
  },

  completeOnboarding: async () => {
    await setItem('hasSeenOnboarding', 'true');
    set({ hasSeenOnboarding: true });
  },

  login: async (email, password, keepSignedIn = true) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { token, refreshToken, ...userData } = response.data.data;
        
        await setItem('keepSignedIn', keepSignedIn ? 'true' : 'false');
        await setItem('userToken', token);
        await setItem('refreshToken', refreshToken);
        
        set({ user: userData as User, token, isLoading: false });
      } else {
        set({ error: 'Login failed', isLoading: false });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      set({
        error: err.response?.data?.error || 'Invalid credentials or connection error',
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (name, email, password, currency, theme) => {
    set({ isLoading: true, error: null });
    try {
      const payload: any = { name, email, password };
      if (currency) payload.currency = currency;
      if (theme) payload.theme = theme;

      const response = await api.post('/auth/register', payload);
      if (response.data.success) {
        const { token, refreshToken, ...userData } = response.data.data;
        
        await setItem('keepSignedIn', 'true');
        await setItem('userToken', token);
        await setItem('refreshToken', refreshToken);
        
        set({ user: userData as User, token, isLoading: false });
      } else {
        set({ error: 'Registration failed', isLoading: false });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      set({
        error: err.response?.data?.error || 'Registration failed or connection error',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (e) {
      console.log('Error logging out from server:', e);
    } finally {
      await deleteItem('userToken');
      await deleteItem('refreshToken');
      set({ user: null, token: null, isLoading: false, error: null });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put('/auth/profile', data);
      if (response.data.success) {
        set({ user: response.data.data, isLoading: false });
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      set({
        error: err.response?.data?.error || 'Profile update failed',
        isLoading: false,
      });
      throw err;
    }
  },
}));
