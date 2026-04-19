// app/(tabs)/rewards.tsx

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components';
import { Colors } from '@/config/theme';
import { getCurrentUser, getPaymentHistory, getMonthlySummary } from '@/hooks/useApi';
import { BASE_URL } from '@/config/api';
import { useAppStore } from '@/store/useAppStore';
import { WithdrawModal } from './WithdrawModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseHistoryItem {
  purchase_id: number;
  item_type: string;
  item_name: string;
  coins_spent: number;
  status: string;
  coupon_code: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const itemTypeEmoji = (type: string) => {
  switch (type) {
    case 'amazon':   return '📦';
    case 'flipkart': return '🛒';
    case 'merch':    return '🎁';
    default:         return '🏷️';
  }
};

const purchaseStatusColor = (s: string) =>
  s === 'delivered' || s === 'confirmed' ? '#4ADE80' :
  s === 'shipped'   ? '#60A5FA' :
  s === 'cancelled' ? '#F87171' : '#FACC15';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const { user, setUser } = useAppStore();
  const [history,          setHistory]          = useState<any[]>([]);
  const [summary,          setSummary]          = useState<any>(null);
  const [purchases,        setPurchases]        = useState<PurchaseHistoryItem[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [refreshing,       setRefreshing]       = useState(false);
  const [showWithdraw,     setShowWithdraw]     = useState(false);
  const colors = Colors.dark;

  useFocusEffect(
    useCallback(() => { loadData(false); }, [])
  );

  const loadData = async (forceRefresh = false) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      const uid = parseInt(userId);

      const [profileData, historyData, summaryData] = await Promise.all([
        getCurrentUser(uid, forceRefresh),
        getPaymentHistory(uid, forceRefresh),
        getMonthlySummary(uid, forceRefresh),
      ]);

      if (user) setUser({ ...user, nova_coins: profileData.nova_coins ?? 0 });
      setHistory(historyData.filter((h: any) => h.coins_earned > 0));
      setSummary(summaryData);
      fetchPurchaseHistory(uid);
    } catch (e) {
      console.log('Failed to load rewards:', e);
    }
  };

  const fetchPurchaseHistory = async (uid: number) => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`${BASE_URL}/purchase/history`, {
        headers: {
          'Content-Type':               'application/json',
          'X-User-Id':                  String(uid),
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (res.ok) {
        const data: PurchaseHistoryItem[] = await res.json();
        setPurchases(data);
      }
    } catch (e) {
      console.log('Failed to load purchase history:', e);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const completedCount = history.length;

  const getStreakInfo = () => {
    if (completedCount >= 20) return { label: '🔥 2× Streak', desc: '20+ payments — you get 2× coins!', color: '#f59e0b' };
    if (completedCount >= 10) return { label: '⚡ 1.5× Streak', desc: `${completedCount}/20 payments — next milestone: 2×`, color: '#a78bfa' };
    return { label: '🌱 1× Base', desc: `${completedCount}/10 payments — reach 10 for 1.5×`, color: colors.tint };
  };

  const streak    = getStreakInfo();
  const totalCoins = user?.nova_coins ?? 0;
  const monthCoins = summary?.total_coins_this_month ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {/* ── Coins hero ── */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={[styles.heroAmount, { color: '#f59e0b' }]}>{totalCoins.toLocaleString()}</Text>
          <Text style={[styles.heroLabel, { color: colors.icon }]}>Nova Coins Balance</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.tint }]}>{monthCoins}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>This Month</Text>
            </View>
            <View style={[styles.statBar, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.text }]}>
                {history.reduce((acc: number, h: any) => acc + (h.coins_earned ?? 0), 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>All Time Earned</Text>
            </View>
          </View>
        </View>

        {/* ── Withdraw Button ── */}
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdraw(true)}>
          <Text style={styles.withdrawBtnText}>↑  Withdraw Tokens</Text>
        </TouchableOpacity>

        {/* ── Streak multiplier ── */}
        <Card style={[styles.streakCard, { borderColor: streak.color + '44' }]}>
          <View style={styles.streakHeader}>
            <Text style={[styles.streakLabel, { color: streak.color }]}>{streak.label}</Text>
          </View>
          <Text style={[styles.streakDesc, { color: colors.icon }]}>{streak.desc}</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBar, {
              backgroundColor: streak.color,
              width: `${Math.min((completedCount % 10) / 10 * 100, 100)}%`,
            }]} />
          </View>
        </Card>

        {/* ── How coins work ── */}
        <Card style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>How Nova Coins Work</Text>
          {[
            { left: '₹10 spent',    right: '1 coin (base)',   color: colors.tint },
            { left: '10+ payments', right: '1.5× multiplier', color: '#a78bfa'   },
            { left: '20+ payments', right: '2× multiplier',   color: '#f59e0b'   },
          ].map((row) => (
            <View key={row.left} style={styles.infoRow}>
              <Text style={[styles.infoBullet, { color: colors.icon }]}>{row.left}</Text>
              <Text style={[styles.infoArrow,  { color: colors.tint }]}>→</Text>
              <Text style={[styles.infoValue,  { color: row.color   }]}>{row.right}</Text>
            </View>
          ))}
        </Card>

        {/* ── Purchase / Redemption History ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Redemption History</Text>

          {loadingPurchases && purchases.length === 0 ? (
            <ActivityIndicator color={colors.tint} style={{ marginVertical: 16 }} />
          ) : purchases.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🛍️</Text>
              <Text style={[styles.emptyBoxText, { color: colors.icon }]}>No redemptions yet</Text>
              <Text style={[styles.emptyBoxSub,  { color: colors.icon }]}>Spend your coins in the Shop tab!</Text>
            </View>
          ) : (
            purchases.map((p) => (
              <View
                key={p.purchase_id}
                style={[styles.purchaseRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.purchaseIcon, { backgroundColor: colors.cardElevated }]}>
                  <Text style={{ fontSize: 20 }}>{itemTypeEmoji(p.item_type)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.purchaseName, { color: colors.text }]} numberOfLines={1}>
                    {p.item_name}
                  </Text>
                  <Text style={[styles.purchaseMeta, { color: colors.icon }]}>
                    {p.item_type} · {formatDate(p.created_at)}
                  </Text>
                  {p.coupon_code ? (
                    <Text style={[styles.couponCode, { color: colors.tint }]}>
                      Code: {p.coupon_code}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.purchaseRight}>
                  <Text style={[styles.purchaseCoins,  { color: '#f59e0b' }]}>-{p.coins_spent} 🪙</Text>
                  <Text style={[styles.purchaseStatus, { color: purchaseStatusColor(p.status) }]}>{p.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Coins earned per payment ── */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Coins Earned Per Payment</Text>
            {history.map((item, i) => (
              <View
                key={i}
                style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyMerchant, { color: colors.text }]}>{item.merchant_name}</Text>
                  <Text style={[styles.historyDate,     { color: colors.icon }]}>
                    ₹{item.amount.toFixed(2)} · {formatDate(item.created_at)}
                  </Text>
                </View>
                <Text style={[styles.historyCoins, { color: '#f59e0b' }]}>+{item.coins_earned} 🪙</Text>
              </View>
            ))}
          </View>
        )}

        {history.length === 0 && !refreshing && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No coins yet</Text>
            <Text style={[styles.emptyDesc,  { color: colors.icon }]}>
              Complete a payment to start earning Nova Coins!
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Modal lives OUTSIDE ScrollView to avoid Android clipping ── */}
      <WithdrawModal
        visible={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        maxCoins={totalCoins}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1 },
  content:    { padding: 20 },

  heroCard:   { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  coinEmoji:  { fontSize: 48, marginBottom: 8 },
  heroAmount: { fontSize: 48, fontWeight: '800' },
  heroLabel:  { fontSize: 13, marginTop: 4, marginBottom: 20 },
  divider:    { height: 1, width: '100%', marginBottom: 16 },
  statsRow:   { flexDirection: 'row', width: '100%' },
  stat:       { flex: 1, alignItems: 'center' },
  statBar:    { width: 1 },
  statVal:    { fontSize: 22, fontWeight: '700' },
  statLabel:  { fontSize: 11, marginTop: 4 },

  withdrawBtn:     { backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  withdrawBtnText: { color: '#052e16', fontSize: 16, fontWeight: '700' },

  streakCard:    { marginBottom: 16, padding: 16, borderWidth: 1 },
  streakHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  streakLabel:   { fontSize: 16, fontWeight: '700' },
  streakDesc:    { fontSize: 13, marginBottom: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBar:   { height: '100%', borderRadius: 3 },

  infoCard:   { marginBottom: 24, padding: 16 },
  infoTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  infoRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoBullet: { fontSize: 13, flex: 1 },
  infoArrow:  { fontSize: 13, fontWeight: '700' },
  infoValue:  { fontSize: 13, fontWeight: '600' },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  emptyBox:    { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyBoxText:{ fontSize: 14, fontWeight: '600' },
  emptyBoxSub: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  purchaseRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  purchaseIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  purchaseName:  { fontSize: 14, fontWeight: '600' },
  purchaseMeta:  { fontSize: 12, marginTop: 2 },
  couponCode:    { fontSize: 12, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  purchaseRight: { alignItems: 'flex-end', gap: 4 },
  purchaseCoins: { fontSize: 14, fontWeight: '700' },
  purchaseStatus:{ fontSize: 11, textTransform: 'capitalize' },

  historyRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  historyMerchant: { fontSize: 14, fontWeight: '600' },
  historyDate:     { fontSize: 12, marginTop: 2 },
  historyCoins:    { fontSize: 15, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyDesc:  { fontSize: 13, textAlign: 'center' },
});