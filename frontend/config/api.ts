export const BASE_URL = 'http://10.30.25.147:8000';

export const UPI_APPS = [
  { name: 'GPay', scheme: 'gpay://upi/pay?', icon: 'google' },
  { name: 'PhonePe', scheme: 'phonepe://upi/pay?', icon: 'phone' },
  { name: 'Paytm', scheme: 'paytm://upi/pay?', icon: 'paytm' },
  // { name: 'BHIM', scheme: 'bhim://upi/pay?', icon: 'bhim' },
  { name: 'Other UPI', scheme: 'upi://pay?', icon: 'apps' },
];

export const DEEPLINK_SCHEME = 'payscan://';
