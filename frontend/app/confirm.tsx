import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, Alert, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Loading } from '@/components';
import { Colors } from '@/config/theme';
import { createOrder, verifyRazorpay } from '@/hooks/useApi';
import type { QRData } from '@/hooks/useApi';

// ─── Test-mode simulated checkout ────────────────────────────────────────────
// Razorpay RN SDK not available in Expo Go.
// Returns a deterministic fake payment_id so backend can log the full flow.
function simulateCheckout(orderId: string): Promise<{ payment_id: string; signature: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        payment_id: `pay_test_${Math.random().toString(36).slice(2, 11)}`,
        signature: 'test_signature', // backend skips HMAC when test_mode=true
      });
    }, 800);
  });
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ data: string }>();
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (params.data) {
      try {
        const decoded: QRData = JSON.parse(decodeURIComponent(params.data));
        setQrData(decoded);
        if (decoded.am) setAmount(decoded.am);
      } catch {
        Alert.alert('Error', 'Invalid QR data');
        router.back();
      }
    }
  }, [params.data]);

  const handlePay = async () => {
    if (!qrData) return;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // 1. Get user
      const userIdStr = await AsyncStorage.getItem('userId');
      const userId = parseInt(userIdStr || '0');
      if (!userId) throw new Error('User not logged in');
      console.log('[PAY] 1. userId =', userId);

      // 2. Create order on backend
      const order = await createOrder(qrData, userId, parsedAmount);
      console.log('[PAY] 2. order =', order.order_id, '| txn_ref =', order.txn_ref);

      // 3. Await checkout result synchronously — payment_id guaranteed before verify
      const { payment_id, signature } = await simulateCheckout(order.order_id);
      console.log('[PAY] 3. payment_id =', payment_id);

      // 4. Verify on backend — also busts cache so home/profile show fresh data
      const result = await verifyRazorpay(
        order.order_id,
        payment_id,
        signature,
        order.txn_ref,
        userId
      );
      console.log('[PAY] 4. coins_earned =', result.coins_earned);

      // 5. Navigate to success
      router.replace({
        pathname: '/success',
        params: {
          txnRef: order.txn_ref,
          amount: String(parsedAmount),
          merchantName: qrData.pn || qrData.pa,
          coinsEarned: String(result.coins_earned),
          totalCoins: String(result.total_coins),
        },
      });
    } catch (e: any) {
      console.log('[PAY] ERROR:', e.message);
      Alert.alert('Payment Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!qrData) return <Loading message="Loading payment details..." />;

  const colors = Colors.dark;
  const previewCoins = amount && parseFloat(amount) > 0 ? Math.floor(parseFloat(amount) / 10) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.header, { color: colors.text }]}>Confirm Payment</Text>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Merchant</Text>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
              {qrData.pn || qrData.pa}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>UPI ID</Text>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{qrData.pa}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.rupee, { color: colors.tint }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.tint, borderBottomColor: colors.tint }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.icon}
                editable={!qrData.am}
              />
            </View>
          </View>

          {previewCoins > 0 && (
            <View style={[styles.coinsPreview, { backgroundColor: colors.card }]}>
              <Text style={[styles.coinsText, { color: colors.tint }]}>
                🪙 You'll earn ~{previewCoins} Nova Coins
              </Text>
            </View>
          )}
        </Card>

        <View style={[styles.testBanner, { backgroundColor: '#1a2a1a', borderColor: '#2d5a2d' }]}>
          <Text style={styles.testBannerTitle}>🧪 Test Mode</Text>
          <Text style={styles.testBannerText}>Payment is simulated — no real money moves</Text>
          <Text style={styles.testBannerText}>Backend receives test_mode: true</Text>
        </View>

        <Button
          title={loading ? 'Processing…' : `Pay ₹${amount || '0'}`}
          onPress={handlePay}
          loading={loading}
          style={styles.payButton}
        />
        <Button title="Cancel" onPress={() => router.back()} variant="outline" style={styles.cancelButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right', maxWidth: '65%' },
  divider: { height: 1, marginVertical: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rupee: { fontSize: 24, fontWeight: '700' },
  amountInput: { fontSize: 28, fontWeight: '700', minWidth: 100, textAlign: 'right', borderBottomWidth: 1, paddingBottom: 2 },
  coinsPreview: { marginTop: 12, padding: 10, borderRadius: 8, alignItems: 'center' },
  coinsText: { fontSize: 14, fontWeight: '600' },
  testBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, gap: 4 },
  testBannerTitle: { color: '#4caf50', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  testBannerText: { color: '#81c784', fontSize: 12, fontFamily: 'monospace' },
  payButton: { marginBottom: 12 },
  cancelButton: { marginTop: 4 },
});