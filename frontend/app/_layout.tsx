import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/config/theme';
import { initializeNotifications, setupNotificationListeners } from '@/utils/notifications';

export default function RootLayout() {
  const colors = Colors.dark;

  // Initialize notifications on app startup
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeNotifications();
        
        // Setup notification listeners
        const cleanup = setupNotificationListeners(
          (notification) => {
            // Handle notification received
            console.log('Notification received:', notification);
          },
          (notification) => {
            // Handle notification tapped
            console.log('Notification tapped:', notification);
            // Could use notification.request.content.data to navigate to relevant screen
          }
        );

        return cleanup;
      } catch (error) {
        console.warn('Notifications initialization failed (may not be available in this environment):', error);
        return () => {};
      }
    };

    initNotifications();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="confirm"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="success"
          options={{
            headerShown: false,
            gestureEnabled: false, // prevent swipe-back after payment
          }}
        />
        <Stack.Screen
          name="status"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}