import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Loading } from '@/components';
import { Colors } from '@/config/theme';
import { UPI_APPS, DEEPLINK_SCHEME } from '@/config/api';
import { logPayment } from '@/hooks/useApi';

import * as IntentLauncher from 'expo-intent-launcher';

interface QRData {
  pa: string;
  pn: string;
  am?: string;
  tn?: string;
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ data: string }>();
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);

  useEffect(() => {
    if (params.data) {
      try {
        const decoded = JSON.parse(decodeURIComponent(params.data));
        setQrData(decoded);
      } catch (e) {
        Alert.alert('Error', 'Invalid QR data');
        router.back();
      }
    }
  }, [params.data]);

  const handlePay = async (appScheme: string) => {
    if (!qrData) return;

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const txnRef = `TXN${Date.now()}`;
      
      await logPayment(
        txnRef,
        qrData.pa,
        qrData.pn,
        parseFloat(qrData.am || '0'),
        parseInt(userId || '0')
      );

      // const upiLink = `${appScheme}pa=${encodeURIComponent(qrData.pa)}&pn=${encodeURIComponent(qrData.pn || '')}&am=${qrData.am || ''}&tn=${encodeURIComponent(txnRef)}`;

      // const upiLink =
      // `upi://pay?pa=${encodeURIComponent(qrData.pa)}` +
      // `&pn=${encodeURIComponent(qrData.pn || '')}` +
      // `&cu=INR`;

  //     const upiLink =
  // `intent://pay?pa=${encodeURIComponent(qrData.pa)}&pn=${encodeURIComponent(qrData.pn || '')}&cu=INR#Intent;` +
  // `scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;

  //     await Linking.openURL(upiLink);

  

const uri =
  `upi://pay?pa=${encodeURIComponent(qrData.pa)}` +
  `&pn=${encodeURIComponent(qrData.pn || '')}` +
  `&cu=INR`;

await IntentLauncher.startActivityAsync(
  'android.intent.action.VIEW',
  {
    data: uri,
    packageName: 'com.google.android.apps.nbu.paisa.user',
  }
);
      // const canOpen = await Linking.canOpenURL(upiLink);

      // if (canOpen) {
      //   await Linking.openURL(upiLink);
      // } else {
      //   await Linking.openURL(upiLink);
      // }

      router.replace({
        pathname: '/status',
        params: { txnRef },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!qrData) {
    return <Loading message="Loading payment details..." />;
  }

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.header, { color: colors.text }]}>Confirm Payment</Text>
        
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Merchant</Text>
            <Text style={[styles.value, { color: colors.text }]}>{qrData.pn || qrData.pa}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>UPI ID</Text>
            <Text style={[styles.value, { color: colors.text }]}>{qrData.pa}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.icon }]}>Amount</Text>
            <Text style={[styles.amount, { color: colors.tint }]}>₹{qrData.am || '0.00'}</Text>
          </View>
        </Card>

        <Text style={[styles.subtitle, { color: colors.text }]}>Pay with</Text>
        
        <View style={styles.apps}>
          {UPI_APPS.map((app) => (
            <Button
              key={app.name}
              title={app.name}
              onPress={() => handlePay(app.scheme)}
              variant="secondary"
              style={styles.appButton}
              loading={loading}
            />
          ))}
        </View>

        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="outline"
          style={styles.cancelButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  apps: {
    gap: 12,
  },
  appButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 24,
  },
});