// Use environment variable for BASE_URL (must be prefixed with EXPO_PUBLIC_ in .env)
export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8000';

export const UPI_APPS = [
  { name: 'GPay', scheme: 'gpay://upi/pay?', icon: 'google' },
  { name: 'PhonePe', scheme: 'phonepe://upi/pay?', icon: 'phone' },
  { name: 'Paytm', scheme: 'paytm://upi/pay?', icon: 'paytm' },
  // { name: 'BHIM', scheme: 'bhim://upi/pay?', icon: 'bhim' },
  { name: 'Other UPI', scheme: 'upi://pay?', icon: 'apps' },
];

export const DEEPLINK_SCHEME = 'payscan://';
