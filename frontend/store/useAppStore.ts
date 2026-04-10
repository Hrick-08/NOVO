import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Payment {
  txn_ref: string;
  merchant_name: string;
  merchant_upi: string;
  amount: number;
  status: string;
  created_at: string;
}

interface AppState {
  user: User | null;
  isLoading: boolean;
  currentPayment: {
    txn_ref: string;
    merchant_upi: string;
    merchant_name: string;
    amount: number;
  } | null;
  paymentHistory: Payment[];
  monthlySummary: {
    total_spent_this_month: number;
    recent_merchants: { merchant_name: string; merchant_upi: string; last_used: string }[];
  } | null;
  setUser: (user: User | null) => void;
  setCurrentPayment: (payment: AppState['currentPayment']) => void;
  setPaymentHistory: (history: Payment[]) => void;
  setMonthlySummary: (summary: AppState['monthlySummary']) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: false,
  currentPayment: null,
  paymentHistory: [],
  monthlySummary: null,
  setUser: (user) => set({ user }),
  setCurrentPayment: (payment) => set({ currentPayment: payment }),
  setPaymentHistory: (history) => set({ paymentHistory: history }),
  setMonthlySummary: (summary) => set({ monthlySummary: summary }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({
    user: null,
    currentPayment: null,
    paymentHistory: [],
    monthlySummary: null,
  }),
}));
