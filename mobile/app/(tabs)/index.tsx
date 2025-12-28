/**
 * POS Screen
 * Main point-of-sale interface for staff
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api, Product, Customer } from '@/lib/api';
import { useTerminalConnection } from '@/hooks/useTerminal';
import { PaymentSheet } from '@/components/terminal/PaymentSheet';

export default function POSScreen() {
  const router = useRouter();
  const { connectionStatus, connectedReader } = useTerminalConnection();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.listProducts(),
  });

  // Search customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: () => api.searchCustomers(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
  }, []);

  const handleSelectProduct = useCallback((product: Product) => {
    if (!selectedCustomer) {
      Alert.alert('Select Customer', 'Please select a customer first');
      return;
    }

    if (connectionStatus !== 'connected') {
      Alert.alert(
        'Reader Not Connected',
        'Please connect to the M2 reader first',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Reader', onPress: () => router.push('/reader') },
        ]
      );
      return;
    }

    setSelectedProduct(product);
    setShowPaymentSheet(true);
  }, [selectedCustomer, connectionStatus, router]);

  const handlePaymentSuccess = useCallback((paymentIntentId: string) => {
    setShowPaymentSheet(false);
    setSelectedProduct(null);
    Alert.alert(
      'Payment Successful! 🎉',
      `${selectedProduct?.name} purchased for ${selectedCustomer?.name}`,
      [{ text: 'OK' }]
    );
  }, [selectedProduct, selectedCustomer]);

  const handlePaymentCancel = useCallback(() => {
    setShowPaymentSheet(false);
    setSelectedProduct(null);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const products = productsData?.products || [];
  const customers = customersData?.customers || [];

  return (
    <View style={styles.container}>
      {/* Reader Status Banner */}
      <TouchableOpacity
        style={[
          styles.readerBanner,
          connectionStatus === 'connected'
            ? styles.readerConnected
            : styles.readerDisconnected,
        ]}
        onPress={() => router.push('/reader')}
      >
        <Ionicons
          name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'}
          size={20}
          color={connectionStatus === 'connected' ? '#22c55e' : '#6b7280'}
        />
        <Text style={styles.readerBannerText}>
          {connectionStatus === 'connected'
            ? `Connected: ${connectedReader?.label || 'M2 Reader'}`
            : 'Tap to connect reader'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>

      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>

        {selectedCustomer ? (
          <View style={styles.selectedCustomer}>
            <View style={styles.customerInfo}>
              <Ionicons name="person-circle" size={48} color="#f59e0b" />
              <View>
                <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setSelectedCustomer(null)}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="phone-pad"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Customer Search Results */}
            {customers.length > 0 && (
              <View style={styles.searchResults}>
                {customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectCustomer(customer)}
                  >
                    <Ionicons name="person-outline" size={24} color="#6b7280" />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{customer.name}</Text>
                      <Text style={styles.searchResultPhone}>{customer.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.productScroll}
        >
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleSelectProduct(product)}
            >
              <View style={styles.productIcon}>
                <Ionicons
                  name={
                    product.type === 'day_pass'
                      ? 'ticket-outline'
                      : product.type === 'food_beverage'
                      ? 'restaurant-outline'
                      : 'star-outline'
                  }
                  size={32}
                  color="#f59e0b"
                />
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                {formatCurrency(product.price)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Payment Sheet Modal */}
      <Modal
        visible={showPaymentSheet}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedCustomer && selectedProduct && (
          <PaymentSheet
            customer={selectedCustomer}
            product={selectedProduct}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  readerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  readerConnected: {
    backgroundColor: '#f0fdf4',
  },
  readerDisconnected: {
    backgroundColor: '#fef3c7',
  },
  readerBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  searchResultPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  productScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
    width: 140,
    alignItems: 'center',
  },
  productIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
  },
});

