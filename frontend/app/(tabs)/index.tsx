import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button, PaymentItem } from '@/components';
import { Colors } from '@/config/theme';
import { getPaymentHistory, getMonthlySummary, getCurrentUser } from '@/hooks/useApi';
import { useAppStore } from '@/store/useAppStore';

export default function HomeScreen() {
  const { user, setUser, updateNovaCoins } = useAppStore();
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const colors = Colors.dark;

  // On focus: load from cache instantly, no spinner needed
  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [])
  );

  const loadData = async (forceRefresh = false) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      const uid = parseInt(userId);

      // All three calls hit cache first — fast on repeat visits
      // forceRefresh=true only on pull-to-refresh
      const [historyData, summaryData, userProfile] = await Promise.all([
        getPaymentHistory(uid, forceRefresh),
        getMonthlySummary(uid, forceRefresh),
        getCurrentUser(uid, forceRefresh),
      ]);

      setHistory(historyData.slice(0, 5));
      setSummary(summaryData);
      updateNovaCoins(userProfile.nova_coins ?? 0);
      if (user) {
        setUser({ ...user, nova_coins: userProfile.nova_coins ?? 0 });
      }
    } catch (e) {
      console.log('Failed to load data:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true); // force fresh from network
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingLabel, { color: colors.icon }]}>Welcome back,</Text>
          <Text style={[styles.greetingName, { color: colors.text }]}>{user?.name || 'User'}</Text>
        </View>

        {/* Monthly Summary */}
        <Card style={[styles.summaryCard, { borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.icon }]}>This Month</Text>
          <Text style={[styles.summaryAmount, { color: colors.tint }]}>
            ₹{(summary?.total_spent_this_month ?? 0).toFixed(2)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Spent</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                🪙 {summary?.total_coins_this_month ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Coins Earned</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.tint }]}>
                {user?.nova_coins?.toLocaleString() ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Total Coins</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={styles.actionBtnIcon}>⬛</Text>
            <Text style={[styles.actionBtnText, { color: '#000' }]}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Text style={styles.actionBtnIcon}>🕐</Text>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/(tabs)/rewards')}
          >
            <Text style={styles.actionBtnIcon}>🪙</Text>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Merchants */}
        {summary?.recent_merchants?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Merchants</Text>
            {summary.recent_merchants.map((m: any, i: number) => (
              <Card key={i} style={styles.merchantCard}>
                <View style={styles.merchantRow}>
                  <View style={[styles.merchantIcon, { backgroundColor: colors.cardElevated }]}>
                    <Text style={{ fontSize: 18 }}>🏪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.merchantName, { color: colors.text }]}>{m.merchant_name}</Text>
                    <Text style={[styles.merchantUpi, { color: colors.icon }]}>{m.merchant_upi}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={[styles.seeAll, { color: colors.tint }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {history.map((item, index) => (
              <PaymentItem
                key={index}
                merchant_name={item.merchant_name}
                amount={item.amount}
                status={item.status}
                created_at={item.created_at}
                onPress={() => router.push({ pathname: '/status', params: { txnRef: item.txn_ref } })}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {history.length === 0 && !refreshing && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📲</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
              Scan a UPI QR code to make your first payment
            </Text>
            <Button
              title="Scan your first QR"
              onPress={() => router.push('/(tabs)/scan')}
              style={{ marginTop: 20 }}
            />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  greeting: { marginBottom: 20 },
  greetingLabel: { fontSize: 14 },
  greetingName: { fontSize: 26, fontWeight: '700', marginTop: 2 },

  summaryCard: {
    marginBottom: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 13, marginBottom: 8 },
  summaryAmount: { fontSize: 38, fontWeight: '800' },
  summaryLabel: { fontSize: 12, marginTop: 2, marginBottom: 16 },
  divider: { height: 1, width: '100%', marginBottom: 16 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: '100%' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 4 },

  actions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnIcon: { fontSize: 20 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  merchantCard: { marginBottom: 8, padding: 12 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  merchantIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  merchantName: { fontSize: 15, fontWeight: '600' },
  merchantUpi: { fontSize: 12, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});