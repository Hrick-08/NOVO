import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Button } from '@/components';
import { Colors } from '@/config/theme';



export default function ScanScreen() {}

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