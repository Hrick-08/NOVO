import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input } from '@/components';
import { Colors } from '@/config/theme';
import { DEEPLINK_SCHEME } from '@/config/api';
import { register, login, getCurrentUser } from '@/hooks/useApi';
import { useAppStore } from '@/store/useAppStore';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const params = useLocalSearchParams<{ logout?: string }>();
  const { setUser } = useAppStore();

  useEffect(() => {
    if (params.logout !== 'true') {
      checkUser();
    }
  }, [params.logout]);

  // Re-check user when screen comes into focus (e.g., after logout)
  useFocusEffect(
    React.useCallback(() => {
      const checkOnFocus = async () => {
        const userId = await AsyncStorage.getItem('userId');
        const userName = await AsyncStorage.getItem('userName');
        if (!userId || !userName) {
          // User logged out, reset form
          setName('');
          setEmail('');
          setPassword('');
          setError('');
          setIsLogin(true);
        }
      };
      checkOnFocus();

      // Cleanup function (optional but good practice)
      return () => { };
    }, [])
  );

  const checkUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      if (userId && userName) {
        // Validate user still exists in the database
        try {
          const fullUser = await getCurrentUser(parseInt(userId));
          setUser({ id: fullUser.id, name: fullUser.name, email: fullUser.email, nova_coins: fullUser.nova_coins ?? 0 });
          router.replace('/(tabs)');
        } catch (e) {
          // User doesn't exist in DB anymore, clear the session
          console.log('User session expired or invalid - clearing storage');
          await AsyncStorage.multiRemove(['userId', 'userName', 'userEmail']);
          setUser(null);
        }
      }
    } catch (e) {
      console.log('No user found in storage');
    }
  };

  const handleAuth = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Starting auth with email:', email);
      let user: any;

      if (isLogin) {
        // Login flow
        user = await login(email, password);
      } else {
        // Register flow
        user = await register(name, email, password);
      }

      console.log('Got user:', user);
      const userId = user.user_id ?? user.id;
      await AsyncStorage.setItem('userId', userId.toString());
      await AsyncStorage.setItem('userName', user.name);
      await AsyncStorage.setItem('userEmail', email);

      // Fetch full profile to get nova_coins
      try {
        const fullUser = await getCurrentUser(userId);
        setUser({ id: fullUser.id, name: fullUser.name, email: fullUser.email, nova_coins: fullUser.nova_coins ?? 0 });
      } catch {
        setUser({ id: userId, name: user.name, email: email, nova_coins: 0 });
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Auth error:', e);
      setError(e.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>NOVO</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            )}
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Button
            title={isLogin ? 'Continue' : 'Create Account'}
            onPress={handleAuth}
            loading={loading}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.icon }]}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Button
              title={isLogin ? 'Sign Up' : 'Sign In'}
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
                setEmail('');
                setName('');
              }}
              variant="outline"
              style={styles.toggleButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.dark.tint,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  error: {
    color: Colors.dark.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 12,
  },
  toggleButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});