import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Button } from '@/components';
import { Colors } from '@/config/theme';
import { BASE_URL } from '@/config/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QRData {
  pa: string;
  pn: string;
  am: string;
  tn: string;
}

// ---------------------------------------------------------------------------
// Razorpay Web Checkout (Works with Expo Go)
// ---------------------------------------------------------------------------

export interface PaymentOrder {
  order_id: string;
  txn_ref: string;
  amount: number;
  key: string;
}

export async function initiateRazorpayPayment(
  qrData: QRData,
  userId: number,
  amount: number
): Promise<PaymentOrder> {
  try {
    const res = await fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(userId),
      },
      body: JSON.stringify({
        amount,
        merchant_name: qrData.pn || qrData.pa,
        merchant_upi: qrData.pa,
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error(`Invalid server Response: ${text.substring(0, 100)}`);
    }

    if (!res.ok) {
      throw new Error(data.detail || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (e: any) {
    console.error('[initiateRazorpayPayment] Error:', e.message);
    throw e;
  }
}

export async function openRazorpayCheckout(
  order: PaymentOrder,
  userId: number,
  onSuccess?: (paymentId: string) => void,
  onFailure?: (error: string) => void
): Promise<string> {
  // In test mode, simulate payment success automatically
  // In production, this would open a real Razorpay checkout
  console.log('Opening payment with order:', order);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
        if (onSuccess) onSuccess(paymentId);
        resolve(paymentId); // resolve WITH the paymentId
      } catch (e: any) {
        if (onFailure) onFailure(e.message);
        reject(e);
      }
    }, 1500); // reduced to 1.5s
  });
}

export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  txn_ref: string,
  userId: number
): Promise<{ coins_earned: number; total_coins: number }> {
  console.log('[VERIFY] Starting verification with:', {
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    txn_ref,
    user_id: userId,
    url: `${BASE_URL}/payments/verify-razorpay`,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s — dev tunnel needs more headroom

    const res = await fetch(`${BASE_URL}/payments/verify-razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(userId),
      },
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        txn_ref,
        test_mode: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log('[VERIFY] Response status:', res.status);

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.log('[VERIFY] Invalid JSON response:', text.substring(0, 100));
      throw new Error(`Invalid server response`);
    }

    if (!res.ok) {
      console.log('[VERIFY] Error response:', data);
      throw new Error(data.detail || `Verification failed: ${res.status}`);
    }

    console.log('[VERIFY] Success:', data);
    return data;
  } catch (e: any) {
    console.log('[VERIFY] Error:', e.message);
    if (e.name === 'AbortError') {
      throw new Error('Verification request timed out. Please try again.');
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Web QR decoder
// ---------------------------------------------------------------------------

async function decodeQRWeb(imageUri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        detector
          .detect(canvas)
          .then((codes: any[]) => resolve(codes.length > 0 ? codes[0].rawValue : null))
          .catch(() => resolve(null));
      } else {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        import('jsqr')
          .then(({ default: jsQR }) => {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            resolve(code ? code.data : null);
          })
          .catch(() => resolve(null));
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUri;
  });
}

// ---------------------------------------------------------------------------
// UPI QR parser
// ---------------------------------------------------------------------------

export function parseUpiQrData(data: string): QRData | null {
  try {
    const parseParams = (query: string): Record<string, string> => {
      const params: Record<string, string> = {};
      query.split('&').forEach((pair) => {
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) return;
        const key = pair.substring(0, eqIndex);
        const value = pair.substring(eqIndex + 1);
        if (key) params[key] = decodeURIComponent(value || '');
      });
      return params;
    };

    if (data.startsWith('upi://')) {
      const qIndex = data.indexOf('?');
      const query = qIndex !== -1 ? data.substring(qIndex + 1) : '';
      const params = parseParams(query);
      if (params.pa) {
        return {
          pa: params.pa || '',
          pn: params.pn || '',
          am: params.am || '',
          tn: params.tn || '',
        };
      }
    }

    if (data.includes('@')) {
      const qIndex = data.indexOf('?');
      const pa = qIndex !== -1 ? data.substring(0, qIndex) : data;
      const params = qIndex !== -1 ? parseParams(data.substring(qIndex + 1)) : {};
      return {
        pa,
        pn: params.pn || '',
        am: params.am || '',
        tn: params.tn || '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const qrData = parseUpiQrData(data);
    if (qrData && qrData.pa) {
      router.push({
        pathname: '/confirm',
        params: { data: encodeURIComponent(JSON.stringify(qrData)) },
      });
    } else {
      Alert.alert('Invalid QR', 'This QR code is not a valid UPI payment QR');
      setScanned(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      try {
        let rawData: string | null = null;

        if (Platform.OS === 'web') {
          rawData = await decodeQRWeb(imageUri);
        } else {
          const scannedCodes = await Camera.scanFromURLAsync(imageUri, ['qr']);
          rawData = scannedCodes.length > 0 ? scannedCodes[0].data : null;
        }

        if (rawData) {
          const qrData = parseUpiQrData(rawData);
          if (qrData && qrData.pa) {
            router.push({
              pathname: '/confirm',
              params: { data: encodeURIComponent(JSON.stringify(qrData)) },
            });
          } else {
            Alert.alert('Invalid QR', 'No valid UPI QR code found in the image');
          }
        } else {
          Alert.alert('Invalid QR', 'No QR code found in the image');
        }
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to parse QR code');
      }
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
        <Text style={[styles.text, { color: Colors.dark.text }]}>
          Requesting camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.text, { color: Colors.dark.text }]}>
            Camera permission required
          </Text>
          <Text style={[styles.subtext, { color: Colors.dark.icon }]}>
            We need camera access to scan QR codes
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} />
          <Button
            title="Pick from Gallery"
            onPress={handlePickImage}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />
        {/* Overlay positioned absolutely above camera */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.hint, { color: Colors.dark.icon }]}>
          Position the QR code within the frame
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: Colors.dark.card }]}
            onPress={handlePickImage}
          >
            <Text style={[styles.actionText, { color: Colors.dark.text }]}>📷 Gallery</Text>
          </TouchableOpacity>
          {scanned && (
            <Button
              title="Scan Again"
              onPress={() => setScanned(false)}
              variant="outline"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.dark.tint,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  footer: { padding: 20, backgroundColor: Colors.dark.background },
  hint: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  action: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  actionText: { fontSize: 16, fontWeight: '500' },
  secondaryButton: { marginTop: 12 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtext: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
});