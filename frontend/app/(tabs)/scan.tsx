import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Button } from '@/components';
import { Colors } from '@/config/theme';

// Web-only: decode QR from image using browser BarcodeDetector API (Chrome/Edge/Android WebView)
// with jsQR as fallback for Firefox/Safari — install with: npm install jsqr
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
        detector.detect(canvas)
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

function parseUpiQrData(data: string): { pa: string; pn: string; am: string; tn: string } | null {
  try {
    const parseParams = (query: string): Record<string, string> => {
      const params: Record<string, string> = {};
      query.split('&').forEach(pair => {
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
  } catch (e) {
    return null;
  }
}

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
          // expo-camera native — no separate module needed
          const scannedCodes = await Camera.scanFromURLAsync(imageUri, ['qr']);
          rawData = scannedCodes.length > 0 ? scannedCodes[0].data : null;
        }

        console.log('[ScanScreen] decoded QR:', rawData);

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
        <Text style={[styles.text, { color: Colors.dark.text }]}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const colors = Colors.dark;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.text, { color: colors.text }]}>Camera permission required</Text>
          <Text style={[styles.subtext, { color: colors.icon }]}>
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

  const colors = Colors.dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.hint, { color: colors.icon }]}>
          Position the QR code within the frame
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.card }]}
            onPress={handlePickImage}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>📷 Gallery</Text>
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
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
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
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  action: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 12,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
});