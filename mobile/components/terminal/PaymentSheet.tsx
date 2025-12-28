/**
 * Payment Sheet Component
 * Handles the payment collection flow on M2 reader
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentIntent } from '@stripe/stripe-terminal-react-native';
import { useTerminalConnection } from '@/hooks/useTerminal';
import { api, Product, Customer } from '@/lib/api';

type PaymentState = 'ready' | 'collecting' | 'processing' | 'success' | 'error';

interface PaymentSheetProps {
  customer: Customer;
  product: Product;
  quantity?: number;
  childId?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export function PaymentSheet({
  customer,
  product,
  quantity = 1,
  childId,
  onSuccess,
  onCancel,
}: PaymentSheetProps) {
  const { connectionStatus, collectPayment, cancelPayment } = useTerminalConnection();

  const [paymentState, setPaymentState] = useState<PaymentState>('ready');
  const [error, setError] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  const totalAmount = product.price * quantity;

  // Pulse animation for collecting state
  React.useEffect(() => {
    if (paymentState === 'collecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [paymentState, pulseAnim]);

  const handleCollect = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      setError('Reader not connected');
      return;
    }

    setPaymentState('collecting');
    setError(null);

    try {
      const paymentIntent = await collectPayment({
        amount: totalAmount,
        customerId: customer.id,
        description: `${product.name} x${quantity}`,
        metadata: {
          product_id: product.id,
          product_type: product.type,
          child_id: childId || '',
        },
      });

      setPaymentState('processing');

      // Save the purchase to our backend
      await api.createPurchase({
        customer_id: customer.id,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        purchase_type: product.type,
        child_id: childId,
        quantity,
        payment_method: 'terminal',
        terminal_payment_intent_id: paymentIntent.id,
      });

      setPaymentState('success');
      setTimeout(() => onSuccess(paymentIntent.id), 1500);
    } catch (err) {
      setPaymentState('error');
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  }, [
    connectionStatus,
    collectPayment,
    totalAmount,
    customer,
    product,
    quantity,
    childId,
    onSuccess,
  ]);

  const handleCancel = useCallback(async () => {
    if (paymentState === 'collecting') {
      await cancelPayment();
    }
    onCancel();
  }, [paymentState, cancelPayment, onCancel]);

  const handleRetry = useCallback(() => {
    setPaymentState('ready');
    setError(null);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Amount Display */}
      <View style={styles.amountSection}>
        <Text style={styles.productName}>{product.name}</Text>
        {quantity > 1 && (
          <Text style={styles.quantity}>Qty: {quantity}</Text>
        )}
        <Text style={styles.amount}>{formatCurrency(totalAmount)}</Text>
      </View>

      {/* Customer Info */}
      <View style={styles.customerInfo}>
        <Ionicons name="person-circle-outline" size={24} color="#6b7280" />
        <Text style={styles.customerName}>{customer.name}</Text>
      </View>

      {/* Payment State Display */}
      <View style={styles.stateContainer}>
        {paymentState === 'ready' && (
          <>
            <View style={styles.readyIcon}>
              <Ionicons name="card-outline" size={64} color="#f59e0b" />
            </View>
            <Text style={styles.stateTitle}>Ready to Collect Payment</Text>
            <Text style={styles.stateText}>
              Tap the button below to start payment collection
            </Text>
          </>
        )}

        {paymentState === 'collecting' && (
          <>
            <Animated.View
              style={[styles.collectingIcon, { transform: [{ scale: pulseAnim }] }]}
            >
              <Ionicons name="card" size={64} color="#f59e0b" />
            </Animated.View>
            <Text style={styles.stateTitle}>Present Card</Text>
            <Text style={styles.stateText}>
              Tap, insert, or swipe card on reader
            </Text>
            <View style={styles.paymentMethods}>
              <View style={styles.paymentMethod}>
                <Ionicons name="wifi" size={24} color="#6b7280" />
                <Text style={styles.paymentMethodText}>Tap</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Ionicons name="enter-outline" size={24} color="#6b7280" />
                <Text style={styles.paymentMethodText}>Insert</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Ionicons name="swap-horizontal" size={24} color="#6b7280" />
                <Text style={styles.paymentMethodText}>Swipe</Text>
              </View>
            </View>
          </>
        )}

        {paymentState === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={[styles.stateTitle, { marginTop: 24 }]}>
              Processing Payment...
            </Text>
          </>
        )}

        {paymentState === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
            </View>
            <Text style={styles.stateTitle}>Payment Successful!</Text>
            <Text style={styles.stateText}>
              {formatCurrency(totalAmount)} charged
            </Text>
          </>
        )}

        {paymentState === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color="#ef4444" />
            </View>
            <Text style={styles.stateTitle}>Payment Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {paymentState === 'ready' && (
          <TouchableOpacity style={styles.collectButton} onPress={handleCollect}>
            <Ionicons name="card" size={24} color="#fff" />
            <Text style={styles.collectButtonText}>Collect Payment</Text>
          </TouchableOpacity>
        )}

        {paymentState === 'collecting' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {paymentState === 'error' && (
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  productName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
  },
  quantity: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  customerName: {
    fontSize: 16,
    color: '#374151',
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  readyIcon: {
    marginBottom: 24,
  },
  collectingIcon: {
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  paymentMethods: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 32,
  },
  paymentMethod: {
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  collectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  collectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  errorActions: {
    gap: 8,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    padding: 18,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

