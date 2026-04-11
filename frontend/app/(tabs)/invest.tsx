import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Button } from '@/components';
import { Colors } from '@/config/theme';



export default function InvestmentScreen() {
  
  }

//   const colors = Colors.dark;

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
//       <View style={styles.cameraContainer}>
//         <CameraView
//           style={styles.camera}
//           facing="back"
//           barcodeScannerSettings={{
//             barcodeTypes: ['qr'],
//           }}
//           onBarcodeScanned={handleBarCodeScanned}
//         >
//           <View style={styles.overlay}>
//             <View style={styles.scanArea}>
//               <View style={[styles.corner, styles.topLeft]} />
//               <View style={[styles.corner, styles.topRight]} />
//               <View style={[styles.corner, styles.bottomLeft]} />
//               <View style={[styles.corner, styles.bottomRight]} />
//             </View>
//           </View>
//         </CameraView>
//       </View>

//       <View style={styles.footer}>
//         <Text style={[styles.hint, { color: colors.icon }]}>
//           Position the QR code within the frame
//         </Text>

//         <View style={styles.actions}>
//           <TouchableOpacity
//             style={[styles.action, { backgroundColor: colors.card }]}
//             onPress={handlePickImage}
//           >
//             <Text style={[styles.actionText, { color: colors.text }]}>📷 Gallery</Text>
//           </TouchableOpacity>

//           {scanned && (
//             <Button
//               title="Scan Again"
//               onPress={() => setScanned(false)}
//               variant="outline"
//             />
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   cameraContainer: {
//     flex: 1,
//   },
//   camera: {
//     flex: 1,
//   },
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   scanArea: {
//     width: 250,
//     height: 250,
//     backgroundColor: 'transparent',
//     position: 'relative',
//   },
//   corner: {
//     position: 'absolute',
//     width: 30,
//     height: 30,
//     borderColor: Colors.dark.tint,
//   },
//   topLeft: {
//     top: 0,
//     left: 0,
//     borderTopWidth: 3,
//     borderLeftWidth: 3,
//   },
//   topRight: {
//     top: 0,
//     right: 0,
//     borderTopWidth: 3,
//     borderRightWidth: 3,
//   },
//   bottomLeft: {
//     bottom: 0,
//     left: 0,
//     borderBottomWidth: 3,
//     borderLeftWidth: 3,
//   },
//   bottomRight: {
//     bottom: 0,
//     right: 0,
//     borderBottomWidth: 3,
//     borderRightWidth: 3,
//   },
//   footer: {
//     padding: 20,
//     backgroundColor: Colors.dark.background,
//   },
//   hint: {
//     fontSize: 14,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   actions: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 12,
//   },
//   action: {
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 12,
//   },
//   actionText: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   secondaryButton: {
//     marginTop: 12,
//   },
//   permissionContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 24,
//   },
//   text: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   subtext: {
//     fontSize: 14,
//     textAlign: 'center',
//     marginBottom: 24,
//   },
// });