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

interface Holding {
  ticker: string;
  name: string;
  weight: number;
  rupees: number;
  asset_class: string;
}

interface Health {
  overall: number;
  diversification: number;
  risk_adjusted: number;
  horizon_fit: number;
  annual_return: number;
  annual_vol: number;
}

interface Scenarios {
  amount: number;
  safe: number;
  moderate: number;
  optimistic: number;
  loss_prob: number;
}

interface MonteCarlo {
  loss_probability: number;
  median: number;
  p10: number;
  p90: number;
}

interface Portfolio {
  profile: string;
  amount: number;
  holdings: Holding[];
  health: Health;
  scenarios: Scenarios;
  monte_carlo: MonteCarlo;
}

interface AppState {
  user: User | null;
  isLoading: boolean;
  paymentHistory: Payment[];
  monthlySummary: MonthlySummary | null;
  portfolio: Portfolio | null;
  sessionId: string | null;
  setUser: (user: User | null) => void;
  updateNovaCoins: (coins: number) => void;
  updateUserCoins: (updater: (prev: number) => number) => void;
  setPaymentHistory: (history: Payment[]) => void;
  setMonthlySummary: (summary: MonthlySummary | null) => void;
  setLoading: (loading: boolean) => void;
  setPortfolio: (portfolio: Portfolio | null) => void;
  setSessionId: (sessionId: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: false,
  paymentHistory: [],
  monthlySummary: null,
  portfolio: null,
  sessionId: null,
  setUser: (user) => set({ user }),
  updateNovaCoins: (coins) =>
    set((state) => ({
      user: state.user ? { ...state.user, nova_coins: coins } : null,
    })),
  updateUserCoins: (updater) =>
    set((state) => ({
      user: state.user 
        ? { ...state.user, nova_coins: updater(state.user.nova_coins) } 
        : null,
    })),
  setPaymentHistory: (history) => set({ paymentHistory: history }),
  setMonthlySummary: (summary) => set({ monthlySummary: summary }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setSessionId: (sessionId) => set({ sessionId }),
  logout: () =>
    set({
      user: null,
      paymentHistory: [],
      monthlySummary: null,
      portfolio: null,
      sessionId: null,
    }),
}));
