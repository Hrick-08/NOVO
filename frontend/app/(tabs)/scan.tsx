import { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Button } from '@/components';
import { Colors } from '@/config/theme';

// ─── Types (re-exported so confirm.tsx can import them) ───────────────────────

export interface QRData {
  pa: string;
  pn: string;
  am: string;
  tn: string;
}

// ─── UPI QR parser ────────────────────────────────────────────────────────────

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

// ─── Web QR decoder ───────────────────────────────────────────────────────────

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

// ─── Navigate helper ──────────────────────────────────────────────────────────

function navigateToConfirm(qrData: QRData) {
  router.push({
    pathname: '/confirm',
    params: { data: encodeURIComponent(JSON.stringify(qrData)) },
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  // Reset scanned state every time the screen comes back into focus
  // so the camera is always ready after returning from confirm
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, [])
  );

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // ── Camera scan ──────────────────────────────────────────────────────────────
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || pickingImage) return;
    setScanned(true);

    const qrData = parseUpiQrData(data);
    if (qrData && qrData.pa) {
      navigateToConfirm(qrData);
    } else {
      Alert.alert('Invalid QR', 'This QR code is not a valid UPI payment QR', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  // ── Gallery pick ─────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    if (pickingImage) return;
    setPickingImage(true);

    try {
      // Request media library permission if needed
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to pick a QR code.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1, // full quality for better QR detection
      });

      if (result.canceled || !result.assets[0]) return;

      const imageUri = result.assets[0].uri;
      let rawData: string | null = null;

      if (Platform.OS === 'web') {
        rawData = await decodeQRWeb(imageUri);
      } else {
        const scannedCodes = await Camera.scanFromURLAsync(imageUri, ['qr']);
        rawData = scannedCodes.length > 0 ? scannedCodes[0].data : null;
      }

      if (!rawData) {
        Alert.alert('No QR Found', 'Could not detect a QR code in the selected image. Try a clearer photo.');
        return;
      }

      const qrData = parseUpiQrData(rawData);
      if (qrData && qrData.pa) {
        navigateToConfirm(qrData);
      } else {
        Alert.alert('Invalid QR', 'The QR code found is not a valid UPI payment QR.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to read QR from image.');
    } finally {
      setPickingImage(false);
    }
  };

  // ── Permission screens ───────────────────────────────────────────────────────

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
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
          <Text style={[styles.text, { color: Colors.dark.text }]}>Camera access needed</Text>
          <Text style={[styles.subtext, { color: Colors.dark.icon }]}>
            We need camera access to scan QR codes
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} />
          <Button
            title="Pick from Gallery instead"
            onPress={handlePickImage}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Main scan UI ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Dark overlay with transparent scan window */}
        <View style={styles.overlay} pointerEvents="none">
          {/* top dark band */}
          <View style={[styles.overlayBand, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />

          {/* middle row: dark | clear window | dark */}
          <View style={styles.overlayMiddle}>
            <View style={[styles.overlaySide, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
            <View style={styles.scanWindow}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft, { borderColor: Colors.dark.tint }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: Colors.dark.tint }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: Colors.dark.tint }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: Colors.dark.tint }]} />
            </View>
            <View style={[styles.overlaySide, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
          </View>

          {/* bottom dark band */}
          <View style={[styles.overlayBand, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: Colors.dark.background }]}>
        <Text style={[styles.hint, { color: Colors.dark.icon }]}>
          Point the camera at a UPI QR code
        </Text>

        <View style={styles.actions}>
          {/* Gallery button — always visible */}
          <TouchableOpacity
            style={[
              styles.galleryBtn,
              {
                backgroundColor: Colors.dark.card,
                borderColor: Colors.dark.border,
                opacity: pickingImage ? 0.5 : 1,
              },
            ]}
            onPress={handlePickImage}
            disabled={pickingImage}
            activeOpacity={0.7}
          >
            {/* <Text style={styles.galleryIcon}>🖼️</Text> */}
            <Text style={[styles.galleryText, { color: Colors.dark.text }]}>
              {pickingImage ? 'Opening…' : 'Upload from Gallery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan again — only shown if scanned and something went wrong */}
        {scanned && (
          <Button
            title="Tap to Scan Again"
            onPress={() => setScanned(false)}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },

  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'column',
  },
  overlayBand: { flex: 1 },
  overlayMiddle: { flexDirection: 'row', height: 260 },
  overlaySide: { flex: 1 },
  scanWindow: {
    width: 260,
    height: 260,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  topLeft:    { top: 0,    left: 0,   borderTopWidth: 3,    borderLeftWidth: 3   },
  topRight:   { top: 0,    right: 0,  borderTopWidth: 3,    borderRightWidth: 3  },
  bottomLeft: { bottom: 0, left: 0,   borderBottomWidth: 3, borderLeftWidth: 3   },
  bottomRight:{ bottom: 0, right: 0,  borderBottomWidth: 3, borderRightWidth: 3  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90, // Increased to sit above the absolute tab bar and OS home indicator
    gap: 12,
  },
  hint: { fontSize: 14, textAlign: 'center' },

  actions: { flexDirection: 'row', justifyContent: 'center' },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  galleryIcon: { fontSize: 20 },
  galleryText: { fontSize: 15, fontWeight: '600' },

  // Permission screen
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12,
  },
  text: { fontSize: 18, fontWeight: '600' },
  subtext: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  secondaryButton: { marginTop: 4 },
});