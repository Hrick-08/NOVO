import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentItem, Loading } from '@/src/components';
import { Colors } from '@/src/config';
import { getPaymentHistory } from '@/src/hooks/useApi';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      const data = await getPaymentHistory(parseInt(userId));
      setHistory(data);
    } catch (e) {
      console.log('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <PaymentItem
      merchant_name={item.merchant_name}
      amount={item.amount}
      status={item.status}
      created_at={item.created_at}
      onPress={() => router.push({ pathname: '/status', params: { txnRef: item.txn_ref } })}
    />
  );

  const colors = Colors.dark;

  if (loading) {
    return <Loading message="Loading history..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transaction History</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {history.length} transaction{history.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.txn_ref || index.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>No transactions yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});