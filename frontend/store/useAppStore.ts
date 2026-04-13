import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  email: string;
  nova_coins: number;
}

interface Payment {
  txn_ref: string;
  merchant_name: string;
  merchant_upi: string;
  amount: number;
  status: string;
  coins_earned: number;
  created_at: string;
}

interface MonthlySummary {
  total_spent_this_month: number;
  total_coins_this_month: number;
  recent_merchants: { merchant_name: string; merchant_upi: string; last_used: string }[];
}

interface AppState {
  user: User | null;
  isLoading: boolean;
  paymentHistory: Payment[];
  monthlySummary: MonthlySummary | null;
  setUser: (user: User | null) => void;
  updateNovaCoins: (coins: number) => void;
  setPaymentHistory: (history: Payment[]) => void;
  setMonthlySummary: (summary: MonthlySummary | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: false,
  paymentHistory: [],
  monthlySummary: null,
  setUser: (user) => set({ user }),
  updateNovaCoins: (coins) =>
    set((state) => ({
      user: state.user ? { ...state.user, nova_coins: coins } : null,
    })),
  setPaymentHistory: (history) => set({ paymentHistory: history }),
  setMonthlySummary: (summary) => set({ monthlySummary: summary }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () =>
    set({
      user: null,
      paymentHistory: [],
      monthlySummary: null,
    }),
}));
