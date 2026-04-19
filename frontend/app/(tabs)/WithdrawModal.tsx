// components/WithdrawModal.tsx

import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView,
  Platform, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withdrawTokens } from '@/hooks/useApi';

interface Props {
  visible:   boolean;
  onClose:   () => void;
  maxCoins?: number;
}

type Step = 'form' | 'loading' | 'success' | 'error';

export function WithdrawModal({ visible, onClose, maxCoins }: Props) {
  const [address, setAddress] = useState('');
  const [amount,  setAmount]  = useState('');
  const [step,    setStep]    = useState<Step>('form');
  const [txHash,  setTxHash]  = useState('');
  const [errMsg,  setErrMsg]  = useState('');

  const reset = () => {
    setAddress('');
    setAmount('');
    setStep('form');
    setTxHash('');
    setErrMsg('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleWithdraw = async () => {
    if (!address.trim() || !amount.trim()) return;
    setStep('loading');
    try {
      const userId = await AsyncStorage.getItem('userId');
      const data = await withdrawTokens(Number(userId), {
        to_address: address.trim(),
        amount:     parseFloat(amount),
      });
      setTxHash(data.tx_hash);
      setStep('success');
    } catch (e: any) {
      setErrMsg(e.message || 'Something went wrong');
      setStep('error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kvWrapper}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />

            {step === 'form' && (
              <>
                <Text style={styles.title}>Withdraw Tokens</Text>
                <Text style={styles.subtitle}>Send tokens from the platform wallet to any address</Text>

                <Text style={styles.label}>Recipient Wallet Address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="0x..."
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>
                  Amount{maxCoins !== undefined ? ` (you have ${maxCoins.toLocaleString()} coins)` : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#555"
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity
                  style={[styles.btn, (!address.trim() || !amount.trim()) && styles.btnDisabled]}
                  onPress={handleWithdraw}
                  disabled={!address.trim() || !amount.trim()}
                >
                  <Text style={styles.btnText}>Confirm Withdraw</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'loading' && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4ade80" />
                <Text style={styles.loadingText}>Broadcasting transaction...</Text>
                <Text style={styles.loadingSub}>This may take a few seconds</Text>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centered}>
                <Text style={styles.icon}>✅</Text>
                <Text style={styles.successTitle}>Transaction Sent!</Text>
                <Text style={styles.txLabel}>TX Hash</Text>
                <Text style={styles.txHash} numberOfLines={2} selectable>{txHash}</Text>
                <TouchableOpacity style={styles.btn} onPress={handleClose}>
                  <Text style={styles.btnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centered}>
                <Text style={styles.icon}>❌</Text>
                <Text style={styles.errorTitle}>Transaction Failed</Text>
                <Text style={styles.errorMsg}>{errMsg}</Text>
                <TouchableOpacity style={styles.btn} onPress={() => setStep('form')}>
                  <Text style={styles.btnText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  kvWrapper:    { justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:       { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:        { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle:     { color: '#666', fontSize: 13, marginBottom: 24, lineHeight: 18 },
  label:        { color: '#888', fontSize: 13, marginBottom: 8 },
  input:        { backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 0.5, borderColor: '#333', paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, marginBottom: 16 },
  btn:          { backgroundColor: '#4ade80', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled:  { opacity: 0.4 },
  btnText:      { color: '#052e16', fontSize: 16, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText:   { color: '#666', fontSize: 14 },
  centered:     { alignItems: 'center', paddingVertical: 16 },
  loadingText:  { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 20 },
  loadingSub:   { color: '#666', fontSize: 13, marginTop: 6 },
  icon:         { fontSize: 48, marginBottom: 12 },
  successTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  txLabel:      { color: '#888', fontSize: 12, marginBottom: 6 },
  txHash:       { color: '#4ade80', fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18, paddingHorizontal: 8 },
  errorTitle:   { color: '#f87171', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  errorMsg:     { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
});