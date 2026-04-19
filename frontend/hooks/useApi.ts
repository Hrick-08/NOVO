/**
 * hooks/useApi.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/config/api';
import {
  cacheGet, cacheSet, cacheDelete,
  clearAllCache, invalidateUserCache,
  CacheKey, TTL,
} from '@/hooks/cache';

export { invalidateUserCache, clearAllCache };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QRData {
  pa: string; pn: string; am: string; tn: string;
}

export interface PaymentOrder {
  order_id: string; txn_ref: string; amount: number; key: string;
}

export interface User {
  user_id?: number; id: number; name: string; email: string;
  nova_coins?: number; created_at?: string;
}

export interface Payment {
  txn_ref: string; merchant_name: string; merchant_upi: string;
  amount: number; status: string; coins_earned?: number; created_at: string;
}

export interface MonthlySummary {
  total_spent_this_month: number; total_coins_this_month?: number;
  recent_merchants: { merchant_name: string; merchant_upi: string; last_used: string }[];
}

export interface ProfileStats {
  total_spent_inr: number; total_coins_earned: number; total_transactions: number;
}

export interface Redemption {
  id: number; item_type: string; item_name: string;
  coins_spent: number; status: string; created_at: string;
}

export interface ProfileData {
  id: number; name: string; email: string; phone: string;
  avatar_url: string | null; nova_coins: number; member_since: string;
  stats: ProfileStats; recent_redemptions: Redemption[];
}

export interface UpdateProfileRequest {
  name?: string; phone?: string; avatar_url?: string;
}

// ─── Collections types ────────────────────────────────────────────────────────

export interface MerchItem {
  id: number; name: string; description: string | null;
  image_url: string | null; coin_price: number; stock: number; category: string | null;
}

export interface AmazonCoupon {
  id: number; title: string; description: string | null;
  image_url: string | null; coin_price: number; face_value: number;
  stock: number; expires_at: string | null;
}

export interface FlipkartCoupon {
  id: number; title: string; description: string | null;
  image_url: string | null; coin_price: number; face_value: number;
  stock: number; expires_at: string | null;
}

export interface PurchaseRequest {
  item_type: 'merch' | 'amazon' | 'flipkart';
  item_id: number;
  delivery_address?: string;
}

export interface PurchaseResult {
  purchase_id: number; item_type: string; item_name: string;
  coins_spent: number; remaining_coins: number;
  status: string; created_at: string; coupon_code?: string;
}

// ─── Withdraw types ───────────────────────────────────────────────────────────

export interface WithdrawRequest {
  to_address: string;   // recipient public wallet address
  amount:     number;   // human-readable token amount (e.g. 10.5)
}

export interface WithdrawResult {
  tx_hash:      string;
  from_address: string;
  to_address:   string;
  amount:       number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT = 10_000;

async function fetchWithTimeout(
  url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e: any) {
    clearTimeout(id);
    if (e.name === 'AbortError') {
      console.warn(`[API] Timeout: ${options.method || 'GET'} ${url}`);
      throw new Error('Request timed out — check your network or dev tunnel.');
    }
    console.error(`[API] Network Error: ${options.method || 'GET'} ${url}`, e.message);
    throw e;
  }
}

async function getHeaders(userId?: number): Promise<HeadersInit> {
  const h: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (userId) (h as Record<string, string>)['X-User-Id'] = String(userId);
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.detail || err.message || `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(name: string, email: string, password?: string): Promise<User> {
  const res = await fetchWithTimeout(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<User>(res);
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<User>(res);
}

export async function getCurrentUser(userId: number, forceRefresh = false): Promise<User> {
  const key = CacheKey.user(userId);
  if (!forceRefresh) {
    const cached = await cacheGet<User>(key, TTL.USER);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/auth/me`, {
    method: 'GET', headers: await getHeaders(userId),
  });
  const data = await handleResponse<User>(res);
  await cacheSet(key, data);
  return data;
}

export async function logout(userId?: number): Promise<void> {
  try {
    if (userId) {
      const res = await fetchWithTimeout(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: await getHeaders(userId),
      });
      await handleResponse(res);
    }
  } catch (e) {
    console.log('Backend logout error (non-critical):', e);
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    if (allKeys.length > 0) await AsyncStorage.multiRemove(allKeys);
  } catch {
    await AsyncStorage.multiRemove([
      'userId', 'userName', 'userEmail',
      'user', 'userData', 'token', 'authToken',
    ]);
    await clearAllCache();
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPaymentHistory(userId: number, forceRefresh = false): Promise<Payment[]> {
  const key = CacheKey.history(userId);
  if (!forceRefresh) {
    const cached = await cacheGet<Payment[]>(key, TTL.HISTORY);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/payments/history`, {
    method: 'GET', headers: await getHeaders(userId),
  });
  const data = await handleResponse<Payment[]>(res);
  await cacheSet(key, data);
  return data;
}

export async function getMonthlySummary(userId: number, forceRefresh = false): Promise<MonthlySummary> {
  const key = CacheKey.summary(userId);
  if (!forceRefresh) {
    const cached = await cacheGet<MonthlySummary>(key, TTL.SUMMARY);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/payments/summary`, {
    method: 'GET', headers: await getHeaders(userId),
  });
  const data = await handleResponse<MonthlySummary>(res);
  await cacheSet(key, data);
  return data;
}

export async function createOrder(qrData: QRData, userId: number, amount: number): Promise<PaymentOrder> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/create-order`, {
    method: 'POST',
    headers: await getHeaders(userId),
    body: JSON.stringify({
      amount,
      merchant_name: qrData.pn || qrData.pa,
      merchant_upi: qrData.pa,
    }),
  }, 15_000);
  return handleResponse<PaymentOrder>(res);
}

export async function verifyRazorpay(
  razorpay_order_id: string, razorpay_payment_id: string,
  razorpay_signature: string, txn_ref: string, userId: number
): Promise<{ verified: boolean; txn_ref: string; coins_earned: number; total_coins: number }> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/verify-razorpay`, {
    method: 'POST',
    headers: await getHeaders(userId),
    body: JSON.stringify({
      razorpay_order_id, razorpay_payment_id, razorpay_signature, txn_ref, test_mode: true,
    }),
  }, 20_000);
  const data = await handleResponse<{
    verified: boolean; txn_ref: string; coins_earned: number; total_coins: number;
  }>(res);

  await invalidateUserCache(userId);
  Promise.all([
    getPaymentHistory(userId, true),
    getMonthlySummary(userId, true),
    getCurrentUser(userId, true),
    getProfile(userId, true),
  ]).catch(() => {});

  return data;
}

export async function getPaymentStatus(txnRef: string, userId: number): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/status/${txnRef}`, {
    method: 'GET', headers: await getHeaders(userId),
  });
  return handleResponse(res);
}

export async function updatePaymentStatus(txnRef: string, status: string, userId: number): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/status/${txnRef}`, {
    method: 'PATCH', headers: await getHeaders(userId),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function logPayment(txnRef: string, pa: string, pn: string, amount: number, userId: number): Promise<{ message: string; txn_ref: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/log`, {
    method: 'POST', headers: await getHeaders(userId),
    body: JSON.stringify({ txn_ref: txnRef, pa, pn, amount, status: 'pending' }),
  });
  return handleResponse(res);
}

export async function verifyPayment(txnRef: string, txnId: string, userId: number): Promise<{ verified: boolean }> {
  const res = await fetchWithTimeout(`${BASE_URL}/payments/verify`, {
    method: 'POST', headers: await getHeaders(userId),
    body: JSON.stringify({ txn_ref: txnRef, txn_id: txnId }),
  });
  return handleResponse(res);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: number, forceRefresh = false): Promise<ProfileData> {
  const key = CacheKey.profile(userId);
  if (!forceRefresh) {
    const cached = await cacheGet<ProfileData>(key, TTL.PROFILE);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/profile`, {
    method: 'GET', headers: await getHeaders(userId),
  });
  const data = await handleResponse<ProfileData>(res);
  await cacheSet(key, data);
  return data;
}

export async function updateProfile(
  userId: number, data: UpdateProfileRequest
): Promise<Omit<ProfileData, 'member_since' | 'stats' | 'recent_redemptions'>> {
  const res = await fetchWithTimeout(`${BASE_URL}/profile`, {
    method: 'PATCH', headers: await getHeaders(userId),
    body: JSON.stringify(data),
  });
  const updated = await handleResponse<Omit<ProfileData, 'member_since' | 'stats' | 'recent_redemptions'>>(res);
  await cacheDelete(CacheKey.profile(userId));
  return updated;
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function getMerch(forceRefresh = false): Promise<MerchItem[]> {
  const key = 'merch';
  if (!forceRefresh) {
    const cached = await cacheGet<MerchItem[]>(key, TTL.REWARDS);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/collections/merch`, { method: 'GET' });
  const data = await handleResponse<MerchItem[]>(res);
  await cacheSet(key, data);
  return data;
}

export async function getAmazonCoupons(forceRefresh = false): Promise<AmazonCoupon[]> {
  const key = 'amazon_coupons';
  if (!forceRefresh) {
    const cached = await cacheGet<AmazonCoupon[]>(key, TTL.REWARDS);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/collections/amazon`, { method: 'GET' });
  const data = await handleResponse<AmazonCoupon[]>(res);
  await cacheSet(key, data);
  return data;
}

export async function getFlipkartCoupons(forceRefresh = false): Promise<FlipkartCoupon[]> {
  const key = 'flipkart_coupons';
  if (!forceRefresh) {
    const cached = await cacheGet<FlipkartCoupon[]>(key, TTL.REWARDS);
    if (cached) return cached;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/collections/flipkart`, { method: 'GET' });
  const data = await handleResponse<AmazonCoupon[]>(res);
  await cacheSet(key, data);
  return data;
}

export async function purchaseItem(userId: number, request: PurchaseRequest): Promise<PurchaseResult> {
  const res = await fetchWithTimeout(`${BASE_URL}/purchase`, {
    method: 'POST',
    headers: await getHeaders(userId),
    body: JSON.stringify(request),
  });
  const data = await handleResponse<PurchaseResult>(res);

  await Promise.all([
    cacheDelete(CacheKey.user(userId)),
    cacheDelete(CacheKey.profile(userId)),
  ]);

  return data;
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────

export async function withdrawTokens(
  userId: number,
  request: WithdrawRequest,
): Promise<WithdrawResult> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/withdraw`,
    {
      method:  'POST',
      headers: await getHeaders(userId),   // includes ngrok header + X-User-Id
      body:    JSON.stringify(request),
    },
    30_000,   // blockchain broadcast can be slow — give it 30s
  );
  return handleResponse<WithdrawResult>(res);
}