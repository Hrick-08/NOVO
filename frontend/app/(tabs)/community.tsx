import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';
import { getEvents, joinEvent, getEventLeaderboard, Event, EventLeaderboard, getUserBadges, Badge, createSquad, leaveSquad, Squad } from '@/hooks/useApi';
import { notifyCoinsEarned } from '@/utils/notifications';
import EventCard from '@/components/EventCard';
import Leaderboard from '@/components/Leaderboard';
import BadgesDisplay from '@/components/BadgesDisplay';

export default function CommunityTab() {
  const colors = Colors.dark;
  const userId = useAppStore((s) => s.user?.id);
  const updateUserCoins = useAppStore((s) => s.updateUserCoins);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'leaderboard' | 'squads'>('events');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventLeaderboard, setEventLeaderboard] = useState<EventLeaderboard | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  
  // Squad creation state
  const [showCreateSquadForm, setShowCreateSquadForm] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadDescription, setSquadDescription] = useState('');
  const [loadingSquadCreate, setLoadingSquadCreate] = useState(false);
  const [createdSquad, setCreatedSquad] = useState<Squad | null>(null);

  const loadEvents = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getEvents(userId);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const loadBadges = useCallback(async () => {
    if (!userId) return;
    setLoadingBadges(true);
    try {
      const data = await getUserBadges(userId);
      setBadges(data);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  }, [userId]);

  const handleCreateSquad = async () => {
    if (!userId || !squadName.trim()) {
      Alert.alert('Error', 'Please enter a squad name');
      return;
    }

    setLoadingSquadCreate(true);
    try {
      const squad = await createSquad(userId, squadName, squadDescription || undefined);
      setCreatedSquad(squad);
      Alert.alert('Success', `Squad "${squad.name}" created! +50 coins 🎉`);
      updateUserCoins((prev) => (prev ?? 0) + 50);
      
      // Send notification (non-blocking)
      notifyCoinsEarned(50, `creating squad "${squad.name}"`).catch((e) => {
        console.warn('Failed to send notification:', e);
      });
      
      setSquadName('');
      setSquadDescription('');
      setShowCreateSquadForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create squad');
    } finally {
      setLoadingSquadCreate(false);
    }
  };

  const handleLeaveSquad = async () => {
    // Use createdSquad owner_id as fallback if userId is not available
    const currentUserId = userId || createdSquad?.owner_id;
    console.log('Leave squad button pressed');
    console.log('currentUserId:', currentUserId);
    console.log('createdSquad:', createdSquad);
    
    if (!currentUserId || !createdSquad) {
      console.log('Missing currentUserId or createdSquad');
      return;
    }

    const isSingleMember = createdSquad.member_count === 1;
    const actionMessage = isSingleMember 
      ? `This will delete "${createdSquad.name}" (only member)` 
      : `Are you sure you want to leave "${createdSquad.name}"?`;

    Alert.alert(
      'Leave Squad',
      actionMessage,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Leave',
          onPress: async () => {
            try {
              console.log('Calling leaveSquad API');
              await leaveSquad(currentUserId, createdSquad.id);
              console.log('Successfully left squad');
              setCreatedSquad(null);
              setShowCreateSquadForm(false);
              const successMsg = isSingleMember ? 'Squad deleted' : 'You have left the squad';
              Alert.alert('Success', successMsg);
            } catch (error: any) {
              console.error('Leave squad error:', error);
              Alert.alert('Error', error.message || 'Failed to leave squad');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const loadEventLeaderboard = useCallback(async (eventId: number) => {
    if (!userId) return;
    setLoadingLeaderboard(true);
    try {
      const data = await getEventLeaderboard(userId, eventId);
      setEventLeaderboard(data);
      setSelectedEventId(eventId);
    } catch (error) {
      console.error('Failed to load event leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard. Please try again.');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEvents();
    loadBadges();
  }, [loadEvents, loadBadges]);

  const handleJoinEvent = async (event: Event) => {
    if (!userId) return;

    try {
      const result = await joinEvent(userId, event.id);
      Alert.alert('Success', result.message + (result.coins_earned > 0 ? ` +${result.coins_earned} coins!` : ''));
      
      // Update user coins
      if (result.coins_earned > 0) {
        updateUserCoins((prev) => (prev ?? 0) + result.coins_earned);
        // Send notification (non-blocking)
        notifyCoinsEarned(result.coins_earned, `joining "${event.title}"`).catch((e) => {
          console.warn('Failed to send notification:', e);
        });
      }
      
      // Reload events
      loadEvents();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join event');
    }
  };

  const handleViewLeaderboard = (event: Event) => {
    loadEventLeaderboard(event.id);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const topEvents = events.slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEvents} tintColor={colors.tint} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community Events</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>Join challenges & earn coins</Text>
        </View>
        <TouchableOpacity
          style={[styles.createSquadBtn, { backgroundColor: colors.tint }]}
          onPress={() => {
            setActiveTab('squads');
            setShowCreateSquadForm(true);
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
            <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'events' ? colors.tint : colors.icon }]}>
            Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'leaderboard' ? colors.tint : colors.icon }]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'squads' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('squads')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'squads' ? colors.tint : colors.icon }]}>
            Squads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'events' ? (
          <>
            {selectedEventId && eventLeaderboard ? (
              <View>
                {/* Back button to view events */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedEventId(null);
                    setEventLeaderboard(null);
                  }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.tint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={[styles.backText, { color: colors.tint }]}>Back to Events</Text>
                </TouchableOpacity>

                {/* Event leaderboard */}
                <View style={[styles.leaderboardContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
                    {eventLeaderboard.event_title}
                  </Text>
                  <Text style={[styles.leaderboardSubtitle, { color: colors.icon }]}>
                    Event leaderboard rankings
                  </Text>
                  
                  {loadingLeaderboard ? (
                    <ActivityIndicator size="large" color={colors.tint} style={styles.loaderPadding} />
                  ) : eventLeaderboard.entries.length > 0 ? (
                    <Leaderboard entries={eventLeaderboard.entries} title="Rankings" />
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: colors.text }]}>No participants yet</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : topEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={colors.icon} strokeWidth={2} />
                </Svg>
                <Text style={[styles.emptyText, { color: colors.text }]}>No events available</Text>
                <Text style={[styles.emptySubtext, { color: colors.icon }]}>Check back soon!</Text>
              </View>
            ) : (
              <>
                {/* Badges Section */}
                <View style={{ paddingHorizontal: 16 }}>
                  <BadgesDisplay badges={badges} loading={loadingBadges} />
                </View>

                {/* Events List */}
                {topEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onJoin={() => handleJoinEvent(event)}
                    onViewLeaderboard={() => handleViewLeaderboard(event)}
                  />
                ))}
              </>
            )}
          </>
        ) : activeTab === 'leaderboard' ? (
          <View style={[styles.leaderboardContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.leaderboardTitle, { color: colors.text }]}>Weekly Rankings</Text>
            <Text style={[styles.leaderboardSubtitle, { color: colors.icon }]}>
              Top performers earn exclusive badges & multipliers
            </Text>
            
            {/* Mock leaderboard data */}
            <Leaderboard
              entries={topEvents
                .flatMap((event) => event.participant_count > 0 ? [{
                  rank: 1,
                  user_id: Math.random(),
                  user_name: 'You',
                  coins: event.coins_reward,
                  score: event.coins_reward,
                }] : [])
                .slice(0, 5)}
              title="This Week's Top Players"
            />
          </View>
        ) : (
          // Squads Tab
          <>
            {!showCreateSquadForm ? (
              createdSquad ? (
                <View style={{ paddingHorizontal: 16 }}>
                  <View style={[styles.squadCard, { backgroundColor: colors.card }]}>
                    <View style={styles.squadHeader}>
                      <View>
                        <Text style={[styles.squadName, { color: colors.text }]}>{createdSquad.name}</Text>
                        <Text style={[styles.squadMeta, { color: colors.icon }]}>
                          {createdSquad.member_count}/{createdSquad.max_members} members • You&apos;re the captain
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                        <Text style={styles.badgeText}>+50</Text>
                      </View>
                    </View>

                    {createdSquad.description && (
                      <Text style={[styles.squadDescription, { color: colors.icon }]}>
                        {createdSquad.description}
                      </Text>
                    )}

                    <View style={styles.squadActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.tint }]}
                        onPress={() => Alert.alert('Coming Soon', 'Invite friends in Phase 1')}
                      >
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="white">
                          <Path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6-4a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                        </Svg>
                        <Text style={styles.actionButtonText}>Invite Friends</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.border }]}
                        onPress={() => Alert.alert('Coming Soon', 'Shared challenges coming in Phase 1')}
                      >
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill={colors.text}>
                          <Path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                        </Svg>
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Challenges</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.featuresSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Squad Benefits</Text>

                    <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.tint}>
                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </Svg>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>3x Coins</Text>
                        <Text style={[styles.featureDescription, { color: colors.icon }]}>
                          Earn 3x coins in your first week as a squad member
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.tint}>
                        <Path d="M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                      </Svg>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>Private Challenges</Text>
                        <Text style={[styles.featureDescription, { color: colors.icon }]}>
                          Create challenges visible only to your squad members
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.tint}>
                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </Svg>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>Squad Leaderboard</Text>
                        <Text style={[styles.featureDescription, { color: colors.icon }]}>
                          Compete with squad members on a private leaderboard
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.leaveSquadButton]}
                    onPress={handleLeaveSquad}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.leaveSquadButtonText}>Leave Squad</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16 }}>
                  <View style={[styles.squadEmptyCard, { backgroundColor: colors.card }]}>
                    <Svg width={48} height={48} viewBox="0 0 24 24" fill={colors.tint}>
                      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                    </Svg>
                    <Text style={[styles.squadEmptyTitle, { color: colors.text }]}>Create Your First Squad</Text>
                    <Text style={[styles.squadEmptySubtitle, { color: colors.icon }]}>
                      Gather friends, earn 3x coins, and dominate the leaderboard together!
                    </Text>
                    <TouchableOpacity
                      style={[styles.createSquadButtonBig, { backgroundColor: colors.tint }]}
                      onPress={() => setShowCreateSquadForm(true)}
                    >
                      <Text style={styles.createSquadButtonText}>Create Squad</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>Create Squad</Text>

                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Squad name"
                    placeholderTextColor={colors.icon}
                    value={squadName}
                    onChangeText={setSquadName}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      styles.descriptionInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.icon}
                    value={squadDescription}
                    onChangeText={setSquadDescription}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.tint }]}
                      onPress={handleCreateSquad}
                      disabled={loadingSquadCreate}
                    >
                      {loadingSquadCreate ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Create</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.border }]}
                      onPress={() => {
                        setShowCreateSquadForm(false);
                        setSquadName('');
                        setSquadDescription('');
                      }}
                    >
                      <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  createSquadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  leaderboardContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  loaderPadding: {
    paddingVertical: 24,
  },
  squadCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  squadName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  squadMeta: {
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  squadDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  squadActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  squadEmptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
  },
  squadEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  squadEmptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  createSquadButtonBig: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createSquadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  leaveSquadButton: {
    borderWidth: 1.5,
    borderColor: '#FF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  leaveSquadButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
