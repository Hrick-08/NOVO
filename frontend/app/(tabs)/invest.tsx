import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, StatusBar, ActivityIndicator, SafeAreaView, } from 'react-native';
import Svg, { Path, Rect, Circle, Line as SvgLine, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';


type Stock = {
  id: string;
  label: string;
  ticker: string;
};

type Period = {
  id: string;
  label: string;
};

type PricePoint = {
  timestamp: number;
  value: number;
};

type StockMeta = {
  price: number;
  change: number;
  changePct: number;
};

type MarketItem = {
  name: string;
  price: number;
  pct: number;
  up: boolean;
};


const STOCKS: Stock[] = [
  { id: 'RELIANCE', label: 'Reliance', ticker: 'RELIANCE.NS' },
  { id: 'TCS', label: 'TCS', ticker: 'TCS.NS' },
  { id: 'INFY', label: 'Infosys', ticker: 'INFY.NS' },
  { id: 'HDFCBANK', label: 'HDFC Bank', ticker: 'HDFCBANK.NS' },
  { id: 'WIPRO', label: 'Wipro', ticker: 'WIPRO.NS' },
  { id: 'ICICIBANK', label: 'ICICI', ticker: 'ICICIBANK.NS' },
];

const PERIODS: Period[] = [
  { id: '1wk', label: '1W' },
  { id: '3mo', label: '3M' },
  { id: '1y', label: '1Y' },
  { id: '5y', label: '5Y' },
];

const API_BASE = 'http://localhost:8000';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

// ─── Color Tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0D0D12',
  surface: '#15151F',
  surfaceHigh: '#1C1C28',
  border: 'rgba(255,255,255,0.07)',
  purple: '#7C3AED',
  purpleFade: 'rgba(124,58,237,0.15)',
  teal: '#14B8A6',
  tealFade: 'rgba(20,184,166,0.15)',
  amber: '#F59E0B',
  green: '#34D399',
  greenFade: 'rgba(52,211,153,0.12)',
  red: '#F87171',
  redFade: 'rgba(248,113,113,0.12)',
  textPrimary: '#F0F0F0',
  textSecondary: '#888898',
  textMuted: '#55556A',
};


const formatINR = (val: number): string =>
  '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });


// ─── SVG Line Chart Component ────────────────────────────────────────────────

type LineChartSVGProps = {

  data: PricePoint[];
  width: number;
  height: number;
  color: string;
  fadeColor: string;
};

const LineChartSVG = ({ data, width, height, color, fadeColor }: LineChartSVGProps) => {
  if (data.length < 2) return null;

  // Find min and max values
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Padding
  const paddingLeft = 0;
  const paddingRight = 0;
  const paddingTop = 20;
  const paddingBottom = 0;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Generate path data
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const normalizedValue = (d.value - minValue) / valueRange;
    const y = paddingTop + chartHeight - normalizedValue * chartHeight;
    return { x, y, value: d.value };
  });

  // Create SVG path
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Create gradient path for fill
  const fillPathData = `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={fadeColor} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={fadeColor} stopOpacity="0" />
        </SvgGradient>
      </Defs>

      {/* Gradient fill */}
      <Path d={fillPathData} fill="url(#lineGradient)" />

      {/* Path line */}
      <Path d={pathData} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          fill={color}
          opacity={i === 0 || i === points.length - 1 ? 1 : 0}
        />
      ))}
    </Svg>
  );
};


type StockChipProps = {
  stock: Stock;
  isActive: boolean;
  onPress: () => void;
};

const StockChip = ({ stock, isActive, onPress }: StockChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.stockChip, isActive && styles.stockChipActive]}
  >
    <Text style={[styles.stockChipText, isActive && styles.stockChipTextActive]}>
      {stock.label}
    </Text>
  </TouchableOpacity>
);

type TimeSelectorProps = {
  periods: Period[];
  selected: string;
  onSelect: (id: string) => void;
};

const TimeSelector = ({ periods, selected, onSelect }: TimeSelectorProps) => (
  <View style={styles.timeSelector}>
    {periods.map((p) => (
      <TouchableOpacity
        key={p.id}
        onPress={() => onSelect(p.id)}
        activeOpacity={0.75}
        style={[styles.timeChip, selected === p.id && styles.timeChipActive]}
      >
        <Text style={[styles.timeChipText, selected === p.id && styles.timeChipTextActive]}>
          {p.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

type NavRowProps = {
  icon: string;
  title: string;
  subtitle: string;
  accentColor: string;
  accentFade: string;
  badge?: string;
  onPress: () => void;
};

const NavRow = ({ icon, title, subtitle, accentColor, accentFade, badge, onPress }: NavRowProps) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.navRow}>
    <View style={[styles.navIcon, { backgroundColor: accentFade }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </View>
    <View style={styles.navText}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.navTitle}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: accentFade }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.navSubtitle}>{subtitle}</Text>
    </View>
    <Text style={[styles.navArrow, { color: accentColor }]}>›</Text>
  </TouchableOpacity>
);


export default function HomeScreen() {
  const router = useRouter();
  const [selectedStock, setSelectedStock] = useState<Stock>(STOCKS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1y');
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [meta, setMeta] = useState<StockMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketPulse, setMarketPulse] = useState<MarketItem[]>([]);

  useEffect(() => {
    fetchStockData();
  }, [selectedStock, selectedPeriod]);


  useEffect(() => {
    fetchMarketPulse();
  }, []);

  const fetchMarketPulse = async () => {
    try {
      const res = await fetch(`${API_BASE}/market_pulse`);
      const data = await res.json();
      console.log(data)
      setMarketPulse(data);
    } catch (e) {
      console.log('Market pulse error', e);
    }
  };


  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/stock?ticker=${selectedStock.ticker}&period=${selectedPeriod}`
      );
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();

      // json shape: { dates: string[], closes: number[], price: number, change: number, change_pct: number }
      const points: PricePoint[] = json.dates.map((d: string, i: number) => ({
        timestamp: new Date(d).getTime(),
        value: json.closes[i],
      }));

      setChartData(points);
      setMeta({
        price: json.price,
        change: json.change,
        changePct: json.change_pct,
      });
    } catch (e) {
      setError('Could not load data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const isUp = meta ? meta.change >= 0 : true;
  const chartColor = isUp ? C.green : C.red;
  const chartFade = isUp ? C.greenFade : C.redFade;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >


        {/* ── Stock Selector ── */}
        <FlatList
          data={STOCKS}
          keyExtractor={(s) => s.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stockList}
          renderItem={({ item }) => (
            <StockChip
              stock={item}
              isActive={item.id === selectedStock.id}
              onPress={() => setSelectedStock(item)}
            />
          )}
        />

        {/* ── Price Header ── */}
        <View style={styles.priceSection}>
          {meta ? (
            <>
              <Text style={styles.priceMain}>{formatINR(meta.price)}</Text>
              <Text style={[styles.priceChange, { color: isUp ? C.green : C.red }]}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}
                {formatINR(meta.change)} ({isUp ? '+' : ''}
                {meta.changePct.toFixed(2)}%) today
              </Text>
            </>
          ) : (
            <View style={{ height: 54 }} />
          )}
        </View>

        {/* ── Time Selector ── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <TimeSelector
            periods={PERIODS}
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
          />
        </View>

        {/* ── Chart ── */}
        <View style={styles.chartContainer}>
          {loading ? (
            <View style={styles.chartPlaceholder}>
              <ActivityIndicator color={C.purple} />
            </View>
          ) : error ? (
            <View style={styles.chartPlaceholder}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>{error}</Text>
            </View>
          ) : chartData.length > 0 ? (
            <LineChartSVG
              data={chartData}
              width={CHART_WIDTH}
              height={180}
              color={chartColor}
              fadeColor={chartFade}
            />
          ) : null}
        </View>

        <View style={styles.navCard}>
          <Text style={styles.navCardLabel}>My Investments</Text>

          <NavRow
            icon="💼"
            title="View Portfolio"
            subtitle="₹1,24,500 · 3 holdings"
            accentColor={C.purple}
            accentFade={C.purpleFade}
            onPress={() => router.push('/(tabs)/portfolio' as any)}
          />

          <View style={styles.navDivider} />

          <NavRow
            icon="✦"
            title="Create New Portfolio"
            subtitle="Answer a few questions to start"
            accentColor={C.teal}
            accentFade={C.tealFade}
            onPress={() => router.push('/(tabs)/createportfolio' as any)}
          />
        </View>

        {/* ── Market Pulse (Watchlist) ── */}
        <View style={styles.watchlistSection}>
          <Text style={styles.sectionTitle}>Market Pulse</Text>

          {marketPulse.map((item) => (
            <View key={item.name} style={styles.watchlistRow}>
              <View style={styles.watchlistLeft}>
                <View style={[
                  styles.watchlistDot,
                  { backgroundColor: item.up ? C.green : C.red }
                ]} />
                <Text style={styles.watchlistName}>{item.name}</Text>
              </View>

              <View style={styles.watchlistRight}>
                <Text style={styles.watchlistPrice}>
                  ₹{item.price}
                </Text>

                <View style={[
                  styles.pctBadge,
                  { backgroundColor: item.up ? C.greenFade : C.redFade }
                ]}>
                  <Text style={[
                    styles.pctText,
                    { color: item.up ? C.green : C.red }
                  ]}>
                    {item.up ? '+' : ''}{item.pct}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  appTagline: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purpleFade,
    borderWidth: 1,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.purple,
  },

  // Stock Chips
  stockList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  stockChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  stockChipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  stockChipText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  stockChipTextActive: {
    color: '#fff',
  },

  // Price
  priceSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  priceMain: {
    fontSize: 30,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  priceChange: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },

  // Time Selector
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 3,
  },
  timeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeChipActive: {
    backgroundColor: C.surfaceHigh,
  },
  timeChipText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },
  timeChipTextActive: {
    color: C.textPrimary,
  },

  // Chart
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
  },

  // Navigation Card
  navCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  navCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    flex: 1,
  },
  navTitle: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  navSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  navArrow: {
    fontSize: 20,
    fontWeight: '300',
    marginTop: -2,
  },
  navDivider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 66, // aligns under the text, not the icon
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.06,
  },

  // Watchlist
  watchlistSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 10,
  },
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  watchlistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  watchlistDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  watchlistName: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  watchlistRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchlistPrice: {
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: '500',
  },
  pctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '600',
  },
});