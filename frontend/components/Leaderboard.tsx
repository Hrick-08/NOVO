import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { LeaderboardEntry } from '@/hooks/useApi';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, title = 'Leaderboard' }) => {
  const colors = Colors.dark;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {entries.map((entry, index) => (
          <LeaderboardRow key={entry.user_id} entry={entry} index={index} />
        ))}
      </ScrollView>
    </View>
  );
};

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, index }) => {
  const colors = Colors.dark;
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const medalEmoji = ['🥇', '🥈', '🥉'];

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rankSection}>
        {index < 3 ? (
          <Text style={styles.medal}>{medalEmoji[index]}</Text>
        ) : (
          <Text style={[styles.rank, { color: colors.icon }]}>#{entry.rank}</Text>
        )}
      </View>

      <View style={styles.userSection}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: entry.user_avatar ? 'transparent' : generateColorFromId(entry.user_id),
            },
          ]}
        >
          {!entry.user_avatar && (
            <Text style={styles.avatarText}>
              {entry.user_name.substring(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <View>
          <Text style={[styles.userName, { color: colors.text }]}>{entry.user_name}</Text>
          <Text style={[styles.score, { color: colors.icon }]}>{entry.score.toFixed(0)} pts</Text>
        </View>
      </View>

      <View style={styles.coinsSection}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={10} fill="#FFD700" />
          <Path d="M12 7v10M9 9h6v3H9z" stroke="#333" strokeWidth={1} />
        </Svg>
        <Text style={[styles.coins, { color: colors.text }]}>{entry.coins}</Text>
      </View>

      {entry.rank_change !== undefined && entry.rank_change !== 0 && (
        <View style={[styles.change, { tintColor: entry.rank_change > 0 ? '#22C55E' : '#EF4444' }]}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill={entry.rank_change > 0 ? '#22C55E' : '#EF4444'}>
            {entry.rank_change > 0 ? (
              <Path d="M7 14l5-5 5 5z" />
            ) : (
              <Path d="M7 10l5 5 5-5z" />
            )}
          </Svg>
          <Text style={[styles.changeText, { color: entry.rank_change > 0 ? '#22C55E' : '#EF4444' }]}>
            {Math.abs(entry.rank_change)}
          </Text>
        </View>
      )}
    </View>
  );
};

function generateColorFromId(userId: number): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  return colors[userId % colors.length];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  rankSection: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 12,
    fontWeight: '600',
  },
  medal: {
    fontSize: 18,
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
  },
  score: {
    fontSize: 10,
  },
  coinsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  coins: {
    fontSize: 12,
    fontWeight: '600',
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default Leaderboard;
