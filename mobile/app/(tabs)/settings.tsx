/**
 * Settings Screen
 * App configuration and account management
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTerminalConnection } from '@/hooks/useTerminal';
import { api } from '@/lib/api';

export default function SettingsScreen() {
  const { connectionStatus, connectedReader, batteryLevel } = useTerminalConnection();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await api.clearToken();
            // Navigate to login screen
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Reader Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Reader</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Ionicons
              name={connectionStatus === 'connected' ? 'bluetooth' : 'bluetooth-outline'}
              size={24}
              color={connectionStatus === 'connected' ? '#22c55e' : '#6b7280'}
            />
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Connection Status</Text>
              <Text style={[
                styles.settingValue,
                connectionStatus === 'connected' ? styles.connected : styles.disconnected
              ]}>
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>

          {connectedReader && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <Ionicons name="card-outline" size={24} color="#6b7280" />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Reader</Text>
                  <Text style={styles.settingValue}>
                    {connectedReader.label || 'Stripe Reader M2'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <Ionicons name="barcode-outline" size={24} color="#6b7280" />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Serial Number</Text>
                  <Text style={styles.settingValue}>
                    {connectedReader.serialNumber}
                  </Text>
                </View>
              </View>

              {batteryLevel !== null && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <Ionicons
                      name={batteryLevel >= 50 ? 'battery-half' : 'battery-dead'}
                      size={24}
                      color={batteryLevel < 25 ? '#ef4444' : '#22c55e'}
                    />
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Battery Level</Text>
                      <Text style={styles.settingValue}>{batteryLevel}%</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <Ionicons name="document-text-outline" size={24} color="#6b7280" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#6b7280" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, styles.logoutText]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          BusyBees POS • Powered by Stripe Terminal
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  connected: {
    color: '#22c55e',
  },
  disconnected: {
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 52,
  },
  logoutText: {
    color: '#ef4444',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

