import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components';

const MOCK_STOCKS = [
  { name: 'RELIANCE', fullName: 'Reliance Industries', price: 2947.5, change: +1.23, changeAmt: +35.7 },
  { name: 'TCS', fullName: 'Tata Consultancy Services', price: 3812.0, change: -0.54, changeAmt: -20.8 },
  { name: 'INFY', fullName: 'Infosys Ltd', price: 1432.3, change: +0.89, changeAmt: +12.6 },
  { name: 'HDFC', fullName: 'HDFC Bank', price: 1654.8, change: +2.1, changeAmt: +34.1 },
  { name: 'WIPRO', fullName: 'Wipro Ltd', price: 467.2, change: -1.02, changeAmt: -4.8 },
];

export default function InvestScreen() {
  const colors = Colors.dark;
  const novaCoins = useAppStore((s) => s.user?.nova_coins ?? 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Nova Coins balance */}
        <Card style={[styles.coinsCard, { borderColor: '#f59e0b44' }]}>
          <View style={styles.coinsRow}>
            <Text style={{ fontSize: 32 }}>🪙</Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.coinsAmount, { color: '#f59e0b' }]}>
                {novaCoins.toLocaleString()} Nova Coins
              </Text>
              <Text style={[styles.coinsDesc, { color: colors.icon }]}>
                Earn coins by paying — redeem soon!
              </Text>
            </View>
          </View>
        </Card>

        {/* Coming soon banner */}
        <View style={[styles.comingSoon, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📈</Text>
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            Invest with Nova Coins
          </Text>
          <Text style={[styles.comingSoonDesc, { color: colors.icon }]}>
            Soon you'll be able to use your Nova Coins to invest in top Indian stocks directly from PayScan.
          </Text>
          <View style={[styles.comingSoonBadge, { backgroundColor: '#1a2a1a' }]}>
            <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 13 }}>🚀 Coming Soon</Text>
          </View>
        </View>

        {/* Stock preview (read-only) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Market Preview</Text>
        {MOCK_STOCKS.map((stock) => {
          const isGain = stock.change >= 0;
          const color = isGain ? colors.success : colors.error;
          return (
            <View
              key={stock.name}
              style={[styles.stockRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.stockBadge, { backgroundColor: isGain ? '#0d2a1a' : '#2a0d0d' }]}>
                <Text style={[styles.stockTicker, { color }]}>{stock.name}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.stockFullName, { color: colors.text }]}>{stock.fullName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.stockPrice, { color: colors.text }]}>
                  ₹{stock.price.toFixed(1)}
                </Text>
                <Text style={[styles.stockChange, { color }]}>
                  {isGain ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },

  coinsCard: {
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
  },
  coinsRow: { flexDirection: 'row', alignItems: 'center' },
  coinsAmount: { fontSize: 20, fontWeight: '700' },
  coinsDesc: { fontSize: 12, marginTop: 4 },

  comingSoon: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  comingSoonTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  comingSoonDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  comingSoonBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockTicker: { fontSize: 12, fontWeight: '700' },
  stockFullName: { fontSize: 13, fontWeight: '500' },
  stockPrice: { fontSize: 14, fontWeight: '700' },
  stockChange: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});