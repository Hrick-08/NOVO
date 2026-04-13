import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components';
import { Colors } from '@/config/theme';

export default function SuccessScreen() {
  const { txnRef, amount, merchantName, coinsEarned, totalCoins } =
    useLocalSearchParams<{
      txnRef: string;
      amount: string;
      merchantName: string;
      coinsEarned: string;
      totalCoins: string;
    }>();

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={[styles.title, { color: colors.text }]}>Payment Successful</Text>
        <Text style={[styles.amount, { color: colors.tint }]}>₹{amount}</Text>
        <Text style={[styles.merchant, { color: colors.icon }]}>to {merchantName}</Text>

        <View style={[styles.coinsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.coinsLabel, { color: colors.icon }]}>Nova Coins Earned</Text>
          <Text style={[styles.coinsValue, { color: colors.tint }]}>+{coinsEarned} 🪙</Text>
          <Text style={[styles.coinsTotal, { color: colors.icon }]}>
            Total balance: {totalCoins} coins
          </Text>
        </View>

        <Text style={[styles.txnRef, { color: colors.icon }]}>Ref: {txnRef}</Text>

        <Button
          title="Done"
          onPress={() => router.replace('/(tabs)')}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  amount: { fontSize: 40, fontWeight: '800' },
  merchant: { fontSize: 16, marginBottom: 16 },
  coinsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    marginVertical: 16,
  },
  coinsLabel: { fontSize: 13 },
  coinsValue: { fontSize: 32, fontWeight: '700' },
  coinsTotal: { fontSize: 13 },
  txnRef: { fontSize: 11, marginBottom: 24 },
  button: { width: '100%' },
});