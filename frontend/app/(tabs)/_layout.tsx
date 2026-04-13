import { Tabs, router } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Svg, Path, Rect, Line, Circle, Polyline, Polygon } from 'react-native-svg';
import { CoinDisplay } from '@/components/CoinDisplay';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';

export default function TabLayout() {
  const colors = Colors.dark;
  const novaCoins = useAppStore((s) => s.user?.nova_coins ?? 0);

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 8 }}>
      {/* Coins — tapping opens rewards */}
      <TouchableOpacity onPress={() => router.push('/(tabs)/rewards')} activeOpacity={0.7}>
        <CoinDisplay coins={novaCoins} />
      </TouchableOpacity>
      {/* Profile icon */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/profile')}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
            stroke={colors.icon}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={12}
            cy={7}
            r={4}
            stroke={colors.icon}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {/* ── Visible tabs ─────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          headerTitle: 'NOVO',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <TabIcon name="scan" color={color} />,
          headerTitle: 'Scan QR',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabIcon name="history" color={color} />,
          headerTitle: 'Transactions',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color }) => <TabIcon name="invest" color={color} />,
          headerTitle: 'Invest',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <TabIcon name="collections" color={color} />,
          headerTitle: 'Collections',
          headerRight: () => <HeaderRight />,
        }}
      />

      {/* ── Hidden tabs (accessible via header icons only) ────────────────── */}
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          headerTitle: 'My Rewards',
          headerRight: () => <HeaderRight />,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          headerRight: () => <HeaderRight />,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, (c: string) => React.ReactElement> = {
    home: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 22V12h6v10" stroke={c} strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    scan: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect x={1} y={4} width={22} height={16} rx={2}
          stroke={c} strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={1} y1={10} x2={23} y2={10} stroke={c} strokeWidth={1.8} />
      </Svg>
    ),
    history: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={10} stroke={c} strokeWidth={1.8} />
        <Polyline points="12 6 12 12 16 14" stroke={c} strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    invest: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="16 7 22 7 22 13"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    collections: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={3} y1={6} x2={21} y2={6} stroke={c} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M16 10a4 4 0 0 1-8 0"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  };
  return icons[name]?.(color) ?? null;
}