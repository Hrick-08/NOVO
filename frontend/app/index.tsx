import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input } from '@/components';
import { Colors } from '@/config/theme';
import { DEEPLINK_SCHEME } from '@/config/api';
import { register, getCurrentUser } from '@/hooks/useApi';
import { useAppStore } from '@/store/useAppStore';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAppStore();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName');
      if (userId && userName) {
        // Fetch full user profile (includes nova_coins)
        try {
          const fullUser = await getCurrentUser(parseInt(userId));
          setUser({ id: fullUser.id, name: fullUser.name, email: fullUser.email, nova_coins: fullUser.nova_coins ?? 0 });
        } catch {
          setUser({ id: parseInt(userId), name: userName, email: '', nova_coins: 0 });
        }
        router.replace('/(tabs)');
      }
    } catch (e) {
      console.log('No user found');
    }
  };

  const handleAuth = async () => {
    if (!email) {
      setError('Please enter your email');
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
      const user = await register(isLogin ? 'User' : name, email);
      console.log('Got user:', user);
      const userId = user.user_id ?? user.id;
      await AsyncStorage.setItem('userId', userId.toString());
      await AsyncStorage.setItem('userName', user.name);
      // Fetch full profile to get nova_coins
      try {
        const fullUser = await getCurrentUser(userId);
        setUser({ id: fullUser.id, name: fullUser.name, email, nova_coins: fullUser.nova_coins ?? 0 });
      } catch {
        setUser({ id: userId, name: user.name, email, nova_coins: 0 });
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Auth error:', e);
      setError('Cannot connect to server. Make sure backend is running.');
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
            <Text style={[styles.title, { color: colors.text }]}>PayScan</Text>
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
              onPress={() => { setIsLogin(!isLogin); setError(''); }}
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