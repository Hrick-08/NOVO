import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { Event } from '@/hooks/useApi';

interface EventCardProps {
  event: Event;
  onJoin?: () => void;
  onViewLeaderboard?: () => void;
}

const EventCardComponent: React.FC<EventCardProps> = ({ event, onJoin, onViewLeaderboard }) => {
  const colors = Colors.dark;
  
  const colorMap: Record<string, string> = {
    blue: '#1A56DB',
    purple: '#9333EA',
    green: '#22C55E',
    orange: '#F97316',
  };
  
  const borderColor = colorMap[event.category_color || 'blue'] || '#1A56DB';
  const icon = getEventIcon(event.event_type);
  
  return (
    <View style={[styles.card, { borderLeftColor: borderColor, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: borderColor, alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
            <Text style={[styles.type, { color: colors.icon }]}>{event.event_type}</Text>
          </View>
          <View style={[styles.coinBadge, { backgroundColor: borderColor }]}>
            <Text style={styles.coinText}>{event.coins_reward}</Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.description, { color: colors.icon }]}>{event.description}</Text>
      
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke={colors.icon} strokeWidth={1.5} />
            <Path d="M12 6v6l4 2" stroke={colors.icon} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.info, { color: colors.icon }]}>Ends {getTimeRemaining(event.ends_at)}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {event.user_joined ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: borderColor }]} onPress={onViewLeaderboard}>
              <Text style={styles.buttonText}>Leaderboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, { backgroundColor: borderColor }]} onPress={onJoin}>
              <Text style={styles.buttonText}>Join</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.badge, { backgroundColor: colors.border }]}>
            <Text style={[styles.info, { color: colors.icon }]}>{event.participant_count}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

function getEventIcon(type: string): React.ReactElement {
  const iconProps = { width: 16, height: 16, fill: 'white' };
  
  switch (type) {
    case 'saving':
      return (
        <Svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
          <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </Svg>
      );
    case 'quiz':
      return (
        <Svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
          <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </Svg>
      );
    case 'marathon':
      return (
        <Svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
          <Path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1 6.2h1.6l1-6.2c1.1-.2 2.3-.5 2.3-.5v-2.1c-.2 0-1.6.4-2.4.6l-2.2-4.2c-.2-.3-.5-.5-.8-.5s-.6.2-.8.5l-2.2 4.2c-.8-.2-2.2-.6-2.4-.6V15c0 0 1.2.3 2.3.5l1 6.2h1.6zM12 5.75c1.24 0 2.25-1.01 2.25-2.25S13.24 1.25 12 1.25 9.75 2.26 9.75 3.5 10.76 5.75 12 5.75z" />
        </Svg>
      );
    case 'prediction':
      return (
        <Svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
          <Path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </Svg>
      );
    default:
      return <Svg width={16} height={16} />;
  }
}

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  type: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  coinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coinText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    fontSize: 11,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
});

export default EventCardComponent;
