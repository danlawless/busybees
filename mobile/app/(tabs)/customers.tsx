/**
 * Customers Screen
 * Customer lookup and management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api, Customer } from '@/lib/api';

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: () => api.searchCustomers(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  const customers = data?.customers || [];

  const renderCustomer = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity style={styles.customerCard}>
      <View style={styles.customerAvatar}>
        <Ionicons name="person" size={24} color="#f59e0b" />
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerPhone}>{customer.phone}</Text>
        {customer.email && (
          <Text style={styles.customerEmail}>{customer.email}</Text>
        )}
        {customer.children.length > 0 && (
          <View style={styles.childrenRow}>
            <Ionicons name="people-outline" size={14} color="#6b7280" />
            <Text style={styles.childrenText}>
              {customer.children.length} child
              {customer.children.length > 1 ? 'ren' : ''}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by phone or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to search customers</Text>
        </View>
      ) : searchQuery.length < 3 ? (
        <View style={styles.centerContent}>
          <Ionicons name="search-outline" size={64} color="#d1d5db" />
          <Text style={styles.hintText}>
            Enter at least 3 characters to search
          </Text>
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="person-outline" size={64} color="#d1d5db" />
          <Text style={styles.hintText}>No customers found</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  hintText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  childrenText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

