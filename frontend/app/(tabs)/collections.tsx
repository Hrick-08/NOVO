import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { BASE_URL } from '@/config/api';
import { useAppStore } from '@/store/useAppStore';
import {
  getMerch,
  getAmazonCoupons,
  getFlipkartCoupons,
  purchaseItem,
  MerchItem,
  AmazonCoupon,
  FlipkartCoupon,
} from '@/hooks/useApi';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type CollectionItem = (MerchItem | AmazonCoupon | FlipkartCoupon) & { type: 'merch' | 'amazon' | 'flipkart' };

const getImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  // If it's already an absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Otherwise prepend BASE_URL
  return `${BASE_URL}${imageUrl}`;
};

export default function CollectionsScreen() {
  const colors = Colors.dark;
  const { user, updateNovaCoins } = useAppStore();
  const userId = user?.id;

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<'all' | 'merch' | 'coupons'>('all');
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const fetchCollections = useCallback(async (forceRefresh = false) => {
    try {
      forceRefresh ? setRefreshing(true) : setLoading(true);
      const [merch, amazon, flipkart] = await Promise.all([
        getMerch(forceRefresh),
        getAmazonCoupons(forceRefresh),
        getFlipkartCoupons(forceRefresh),
      ]);

      const allItems: CollectionItem[] = [
        ...merch.map(i => ({ ...i, type: 'merch' as const })),
        ...amazon.map(i => ({ ...i, type: 'amazon' as const })),
        ...flipkart.map(i => ({ ...i, type: 'flipkart' as const })),
      ];

      setItems(allItems);
    } catch (e: any) {
      console.error('[Collections] Fetch error:', e);
      Alert.alert('Error', 'Failed to load collections. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handlePurchase = async (item: CollectionItem) => {
    if (!userId) return;
    if (user.nova_coins < item.coin_price) {
      Alert.alert('Insufficient Coins', `You need ${item.coin_price - user.nova_coins} more Nova Coins to redeem this.`);
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Are you sure you want to redeem "${'name' in item ? item.name : item.title}" for ${item.coin_price} Nova Coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setPurchasing(item.id);
            try {
              const res = await purchaseItem(userId, {
                item_type: item.type,
                item_id: item.id,
                delivery_address: item.type === 'merch' ? 'Default Address' : undefined,
              });
              updateNovaCoins(res.remaining_coins);
              Alert.alert(
                'Success!',
                item.type === 'merch' 
                  ? 'Your order has been placed successfully.' 
                  : `Voucher redeemed! Code: ${res.coupon_code || 'Sent to email'}`
              );
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Purchase failed');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter(i => {
    if (category === 'all') return true;
    if (category === 'merch') return i.type === 'merch';
    return i.type === 'amazon' || i.type === 'flipkart';
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View style={styles.categories}>
          {(['all', 'merch', 'coupons'] as const).map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.categoryBtn,
                { backgroundColor: category === c ? colors.tint : colors.card },
              ]}
            >
              <Text style={[styles.categoryText, { color: category === c ? '#000' : colors.text }]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCollections(true)} tintColor={colors.tint} />}
      >
        <View style={styles.grid}>
          {filteredItems.map(item => {
            const title = 'name' in item ? item.name : item.title;
            const isAffordable = user ? user.nova_coins >= item.coin_price : false;

            return (
              <View key={`${item.type}-${item.id}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.imageContainer}>
                  {item.image_url ? (
                    <Image source={{ uri: getImageUrl(item.image_url) }} style={styles.image} />
                  ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: colors.border }]}>
                      <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={colors.icon} strokeWidth={1.5} />
                        <Circle cx={12} cy={7} r={4} stroke={colors.icon} strokeWidth={1.5} />
                      </Svg>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: item.type === 'merch' ? colors.tintSecondary : colors.warning }]}>
                    <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.info}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                    {title}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: colors.tint }]}>🪙 {item.coin_price}</Text>
                    {item.stock !== -1 && (
                      <Text style={[styles.stock, { color: item.stock < 10 ? colors.error : colors.icon }]}>
                        {item.stock} left
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handlePurchase(item)}
                    disabled={purchasing === item.id || (item.stock === 0)}
                    style={[
                      styles.redeemBtn,
                      { 
                        backgroundColor: item.stock === 0 ? colors.border : (isAffordable ? colors.tint : colors.cardElevated),
                        opacity: purchasing === item.id ? 0.7 : 1
                      },
                    ]}
                  >
                    {purchasing === item.id ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={[styles.redeemText, { color: isAffordable && item.stock !== 0 ? '#000' : colors.icon }]}>
                        {item.stock === 0 ? 'Out of Stock' : 'Redeem'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingTop: 8 },
  categories: { flexDirection: 'row', gap: 8 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: COLUMN_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: { height: COLUMN_WIDTH, width: '100%', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#000' },
  info: { padding: 12, gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', height: 40 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '700' },
  stock: { fontSize: 11 },
  redeemBtn: {
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  redeemText: { fontSize: 13, fontWeight: '700' },
});