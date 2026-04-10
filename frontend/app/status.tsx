import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card } from '@/components';
import { Colors } from '@/config/theme';
import { getPaymentStatus, updatePaymentStatus } from '@/hooks/useApi';

export default function StatusScreen() {
  const params = useLocalSearchParams<{ txnRef: string }>();
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (params.txnRef) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [params.txnRef]);

  const checkStatus = async () => {
    if (!params.txnRef) return;
    try {
      const userId = await AsyncStorage.getItem('userId');
      const result = await getPaymentStatus(params.txnRef, parseInt(userId || '0'));
      setStatus(result.status);
    } catch (e) {
      console.log('Status check failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualConfirm = async () => {
    if (!params.txnRef) return;
    setChecking(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      await updatePaymentStatus(params.txnRef, 'completed', parseInt(userId || '0'));
      setStatus('completed');
    } catch (e: any) {
      console.log(e.message);
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return Colors.dark.success;
      case 'pending': return Colors.dark.warning;
      case 'failed': return Colors.dark.error;
      default: return Colors.dark.icon;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return '✓';
      case 'pending': return '⟳';
      case 'failed': return '✕';
      default: return '?';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={[styles.loadingText, { color: Colors.dark.icon }]}>Checking payment status...</Text>
      </SafeAreaView>
    );
  }

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { borderColor: getStatusColor() }]}>
          <Text style={[styles.icon, { color: getStatusColor() }]}>{getStatusIcon()}</Text>
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {status === 'completed' ? 'Payment Successful' : status === 'failed' ? 'Payment Failed' : 'Payment Pending'}
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {status === 'completed' 
            ? 'Your payment has been processed' 
            : status === 'failed' 
            ? 'Please try again' 
            : 'Waiting for payment confirmation...'}
        </Text>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Transaction ID</Text>
            <Text style={[styles.value, { color: colors.text }]}>{params.txnRef}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Status</Text>
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>{status}</Text>
          </View>
        </Card>

        {status === 'pending' && (
          <View style={styles.actions}>
            <Button
              title="Refresh Status"
              onPress={checkStatus}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title="Manually Confirm Payment"
              onPress={handleManualConfirm}
              loading={checking}
              style={styles.button}
            />
          </View>
        )}

        <Button
          title="Go to Home"
          onPress={() => router.replace('/(tabs)')}
          style={styles.homeButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  homeButton: {
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
});