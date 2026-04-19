import { Platform } from 'react-native';

// Notifications not available in Expo Go on Android with SDK 53+
// Use development builds for full notifications support

let Notifications: any = null;

try {
  // Try to load expo-notifications - this will fail gracefully in Expo Go
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('Notifications not available in this environment');
  // Provide stub interface
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ status: 'denied' }),
    requestPermissionsAsync: async () => ({ status: 'denied' }),
    setNotificationChannelAsync: async () => {},
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    scheduleNotificationAsync: async () => {},
    AndroidImportance: { HIGH: 4 },
  };
}

// Configure notification handler - only if notifications are available
try {
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (error) {
  console.warn('Failed to configure notifications handler:', error);
}

/**
 * Initialize notifications - call this during app startup
 */
export async function initializeNotifications(): Promise<void> {
  try {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get notification permissions');
      return;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('events', {
          name: 'Events',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('squads', {
          name: 'Squads',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        console.warn('Failed to configure Android notification channels:', error);
      }
    }

    console.log('Notifications initialized successfully');
  } catch (error) {
    console.warn('Notifications not fully available in this environment:', error);
  }
}

/**
 * Show a local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  delayInSeconds: number = 0
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: {
        seconds: Math.max(1, delayInSeconds),
      },
    });
  } catch (error) {
    console.warn('Failed to send notification (may not be available in this environment):', error);
  }
}

/**
 * Setup notification response listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (notification: Notifications.Notification) => void
): () => void {
  try {
    // Listen for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listen for notifications tapped by user
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response.notification);
      onNotificationTapped?.(response.notification);
    });

    // Return cleanup function
    return () => {
      try {
        notificationListener.remove();
        responseListener.remove();
      } catch (error) {
        console.warn('Failed to remove notification listeners:', error);
      }
    };
  } catch (error) {
    console.warn('Failed to setup notification listeners:', error);
    // Return no-op cleanup function
    return () => {};
  }
}

/**
 * Event notification helpers
 */
export async function notifyEventStarting(eventTitle: string, minutesUntilStart: number): Promise<void> {
  await sendLocalNotification(
    '🎉 Event Starting Soon',
    `${eventTitle} starts in ${minutesUntilStart} minutes!`,
    { eventType: 'event_starting', action: 'open_events' },
    Math.max(1, (minutesUntilStart - 5) * 60)
  );
}

export async function notifyEventEnded(eventTitle: string): Promise<void> {
  await sendLocalNotification(
    '⏰ Event Ended',
    `${eventTitle} has ended. Check the leaderboard!`,
    { eventType: 'event_ended', action: 'open_leaderboard' }
  );
}

/**
 * Squad notification helpers
 */
export async function notifySquadInvite(squadName: string, inviterName: string): Promise<void> {
  await sendLocalNotification(
    '👥 Squad Invite',
    `${inviterName} invited you to join ${squadName}!`,
    { eventType: 'squad_invite', action: 'open_squads' }
  );
}

export async function notifySquadMemberJoined(squadName: string, memberName: string): Promise<void> {
  await sendLocalNotification(
    '👥 New Squad Member',
    `${memberName} joined ${squadName}!`,
    { eventType: 'squad_member_joined', action: 'open_squads' }
  );
}

/**
 * Achievement notification helpers
 */
export async function notifyBadgeEarned(badgeName: string, badgeDescription: string): Promise<void> {
  await sendLocalNotification(
    '🏆 Badge Unlocked!',
    `${badgeName}: ${badgeDescription}`,
    { eventType: 'badge_earned', action: 'open_badges' }
  );
}

export async function notifyLeaderboardRankChange(
  newRank: number,
  previousRank: number,
  eventTitle: string
): Promise<void> {
  const rankChange = previousRank - newRank;
  if (rankChange > 0) {
    await sendLocalNotification(
      '📈 Leaderboard Update',
      `You moved up ${rankChange} positions in ${eventTitle}!`,
      { eventType: 'rank_improved', action: 'open_leaderboard' }
    );
  } else if (rankChange < 0) {
    await sendLocalNotification(
      '📉 Leaderboard Update',
      `You moved down ${Math.abs(rankChange)} positions in ${eventTitle}`,
      { eventType: 'rank_declined', action: 'open_leaderboard' }
    );
  }
}

/**
 * Coin reward notification
 */
export async function notifyCoinsEarned(coins: number, reason: string): Promise<void> {
  await sendLocalNotification(
    '💰 Coins Earned!',
    `You earned ${coins} coins from ${reason}!`,
    { eventType: 'coins_earned', coins }
  );
}
