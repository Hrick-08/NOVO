import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Svg, Path, Rect, Line, Circle, Polyline, Polygon } from 'react-native-svg';
import { CoinDisplay } from '@/components/CoinDisplay';

// In your component, fetch coins from your store/context:
// const coins = useCoinsStore((s) => s.total);

const coins = 1204

import { Colors } from '@/config/theme';

export default function TabLayout() {
  const colors = Colors.dark;

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
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          headerTitle: 'PayScan',
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <CoinDisplay coins={coins} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <TabIcon name="scan" color={color} />,
          headerTitle: 'Scan QR',
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <CoinDisplay coins={coins} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabIcon name="history" color={color} />,
          headerTitle: 'Transactions',
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <CoinDisplay coins={coins} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color }) => <TabIcon name="invest" color={color} />,
          headerTitle: 'Stocks',
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <CoinDisplay coins={coins} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color }) => <TabIcon name="rewards" color={color} />,
          headerTitle: 'Rewards',
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <CoinDisplay coins={coins} />
            </View>
          ),
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
    rewards: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  };
  return icons[name]?.(color) ?? null;
}
