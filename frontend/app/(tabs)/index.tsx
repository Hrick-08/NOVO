import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button, PaymentItem } from '@/src/components';
import { Colors } from '@/src/config';
import { getPaymentHistory, getMonthlySummary } from '@/src/hooks/useApi';
import { useAppStore } from '@/src/store/useAppStore';

export default function HomeScreen() {
  const { user } = useAppStore();
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      
      const [historyData, summaryData] = await Promise.all([
        getPaymentHistory(parseInt(userId)),
        getMonthlySummary(parseInt(userId)),
      ]);
      setHistory(historyData.slice(0, 5));
      setSummary(summaryData);
    } catch (e) {
      console.log('Failed to load data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'User'}</Text>
        </View>

        <Card style={styles.summaryCard}>
          <Text style={[styles.cardLabel, { color: colors.icon }]}>This Month</Text>
          <Text style={[styles.amount, { color: colors.tint }]}>
            ₹{summary?.total_spent_this_month?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.icon }]}>Total Spent</Text>
        </Card>

        <View style={styles.quickActions}>
          <Button
            title="Scan QR"
            onPress={() => router.push('/(tabs)/scan')}
            style={styles.actionButton}
          />
          <Button
            title="History"
            onPress={() => router.push('/(tabs)/history')}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>

        {summary?.recent_merchants?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Merchants</Text>
            {summary.recent_merchants.map((merchant: any, index: number) => (
              <Card key={index} style={styles.merchantCard}>
                <Text style={[styles.merchantName, { color: colors.text }]}>{merchant.merchant_name}</Text>
                <Text style={[styles.merchantUpi, { color: colors.icon }]}>{merchant.merchant_upi}</Text>
              </Card>
            ))}
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
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

        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>No transactions yet</Text>
            <Button
              title="Scan your first QR"
              onPress={() => router.push('/(tabs)/scan')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
  },
  cardSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  merchantCard: {
    marginBottom: 8,
    padding: 12,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  merchantUpi: {
    fontSize: 12,
    marginTop: 4,
    color: Colors.dark.icon,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
});