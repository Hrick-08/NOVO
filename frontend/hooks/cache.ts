/**
 * cache.ts — AsyncStorage-backed cache with TTL
 * All API data goes through here so the app works instantly on re-open.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── TTL constants (ms) ───────────────────────────────────────────────────────
export const TTL = {
  USER:            5  * 60 * 1000,  // 5 min  — coins change after payments
  HISTORY:         2  * 60 * 1000,  // 2 min  — new txns show quickly
  SUMMARY:         2  * 60 * 1000,  // 2 min
  PROFILE:         5  * 60 * 1000,  // 5 min
  REWARDS:        10  * 60 * 1000,  // 10 min — merch/coupons rarely change
} as const;

interface CacheEntry<T> {
  data: T;
  ts: number;  // timestamp stored
}

// ─── Core get/set ─────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string, ttl: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > ttl) return null;  // expired
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch {
    // cache write failure is non-fatal
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`cache:${key}`);
  } catch {}
}

// ─── Typed cache keys ─────────────────────────────────────────────────────────

export const CacheKey = {
  user:    (uid: number) => `user:${uid}`,
  history: (uid: number) => `history:${uid}`,
  summary: (uid: number) => `summary:${uid}`,
  profile: (uid: number) => `profile:${uid}`,
  rewards: ()            => `rewards`,
} as const;

// ─── Clear ALL cache (for logout) ─────────────────────────────────────────────

export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('cache:'));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {}
}

// ─── Invalidate a specific user's cached data (after payment) ─────────────────

export async function invalidateUserCache(uid: number): Promise<void> {
  await Promise.all([
    cacheDelete(CacheKey.user(uid)),
    cacheDelete(CacheKey.history(uid)),
    cacheDelete(CacheKey.summary(uid)),
    cacheDelete(CacheKey.profile(uid)),
  ]);
}