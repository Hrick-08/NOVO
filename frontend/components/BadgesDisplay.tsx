import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { Badge } from '@/hooks/useApi';

interface BadgesDisplayProps {
  badges: Badge[];
  loading?: boolean;
}

const BadgesDisplay: React.FC<BadgesDisplayProps> = ({ badges, loading = false }) => {
  const colors = Colors.dark;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Your Badges</Text>
        <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your Badges</Text>
        <View style={[styles.badgeCount, { backgroundColor: colors.tint }]}>
          <Text style={styles.badgeCountText}>{badges.length}</Text>
        </View>
      </View>

      {badges.length === 0 ? (
        <View style={styles.emptyState}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
              stroke={colors.icon} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={[styles.emptyText, { color: colors.text }]}>No badges yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.icon }]}>Join events and complete challenges to earn badges!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
          {badges.map((badge) => (
            <BadgeItem key={badge.id} badge={badge} colors={colors} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

interface BadgeItemProps {
  badge: Badge;
  colors: any;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge, colors }) => {
  return (
    <View style={[styles.badgeItem, { backgroundColor: colors.background }]}>
      <View style={[styles.badgeIconContainer, { borderColor: colors.border }]}>
        {getBadgeIcon(badge.name)}
      </View>
      <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={2}>
        {badge.name}
      </Text>
      {badge.earned_at && (
        <Text style={[styles.badgeDate, { color: colors.icon }]}>
          {new Date(badge.earned_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

function getBadgeIcon(badgeName: string): React.ReactElement {
  const size = 40;
  switch (badgeName) {
    case 'First Event Hero':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD700">
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case 'Quiz Master':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#9333EA">
          <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </Svg>
      );
    case 'Saving Champion':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#22C55E">
          <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </Svg>
      );
    case 'Leaderboard Topper':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1A56DB">
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case 'Squad Captain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F97316">
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m6-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6-12a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm3 5h-6v3h6v-3z" />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD700">
          <Circle cx={12} cy={12} r={10} stroke="#FFD700" fill="none" strokeWidth={2} />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  loader: {
    marginVertical: 24,
  },
});

export default BadgesDisplay;
