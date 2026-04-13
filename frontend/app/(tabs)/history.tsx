import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loading } from '@/components';
import { Colors } from '@/config/theme';
import { getPaymentHistory } from '@/hooks/useApi';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const colors = Colors.dark;

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      const data = await getPaymentHistory(parseInt(userId));
      setHistory(data);
    } catch (e) {
      console.log('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'pending': return colors.warning;
      case 'failed': return colors.error;
      default: return colors.icon;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/status', params: { txnRef: item.txn_ref } })}
    >
      {/* Left: icon + details */}
      <View style={[styles.iconWrap, { backgroundColor: colors.cardElevated }]}>
        <Text style={{ fontSize: 20 }}>🏪</Text>
      </View>
      <View style={styles.details}>
        <Text style={[styles.merchant, { color: colors.text }]} numberOfLines={1}>
          {item.merchant_name}
        </Text>
        <Text style={[styles.upi, { color: colors.icon }]} numberOfLines={1}>
          {item.merchant_upi}
        </Text>
        <Text style={[styles.date, { color: colors.icon }]}>
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}{' '}
          {new Date(item.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Right: amount + status + coins */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>
          ₹{item.amount.toFixed(2)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
        {item.coins_earned > 0 && (
          <Text style={styles.coins}>+{item.coins_earned} 🪙</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) return <Loading message="Loading transactions..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {history.length} total • ₹
            {history
              .filter((h) => h.status === 'completed')
              .reduce((sum, h) => sum + h.amount, 0)
              .toFixed(2)}{' '}
            spent
          </Text>
        </View>
        <View style={styles.coinsTotal}>
          <Text style={styles.coinsTotalText}>
            🪙 {history.reduce((sum, h) => sum + (h.coins_earned ?? 0), 0)}
          </Text>
          <Text style={[styles.coinsTotalLabel, { color: colors.icon }]}>earned</Text>
        </View>
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.txn_ref}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>No transactions yet</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  coinsTotal: { alignItems: 'flex-end' },
  coinsTotalText: { fontSize: 18, fontWeight: '700', color: '#f59e0b' },
  coinsTotalLabel: { fontSize: 11, marginTop: 2 },

  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1 },
  merchant: { fontSize: 14, fontWeight: '600' },
  upi: { fontSize: 11, marginTop: 2 },
  date: { fontSize: 11, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  coins: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16 },
});