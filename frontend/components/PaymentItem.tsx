import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/config/theme';

interface PaymentItemProps {
  merchant_name: string;
  amount: number;
  status: string;
  created_at: string;
  onPress?: () => void;
}

export function PaymentItem({ merchant_name, amount, status, created_at, onPress }: PaymentItemProps) {
  const colors = Colors.dark;
  const date = new Date(created_at);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return colors.success;
      case 'pending': return colors.warning;
      case 'failed': return colors.error;
      default: return colors.icon;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <Text style={[styles.merchant, { color: colors.text }]}>{merchant_name}</Text>
        <Text style={[styles.date, { color: colors.icon }]}>{formattedDate}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>₹{amount.toFixed(2)}</Text>
        <Text style={[styles.status, { color: getStatusColor() }]}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
  },
});
