/**
 * Reader Discovery Component
 * Discovers and connects to M2 Bluetooth readers
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Reader } from '@stripe/stripe-terminal-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTerminalConnection } from '@/hooks/useTerminal';

interface ReaderDiscoveryProps {
  onConnected?: (reader: Reader) => void;
}

export function ReaderDiscovery({ onConnected }: ReaderDiscoveryProps) {
  const {
    isInitialized,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    batteryLevel,
    error,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    clearError,
  } = useTerminalConnection();

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectingReaderId, setConnectingReaderId] = useState<string | null>(null);

  const handleInitialize = useCallback(async () => {
    try {
      await initialize();
    } catch {
      Alert.alert('Error', 'Failed to initialize Terminal SDK');
    }
  }, [initialize]);

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      await discoverReaders();
    } catch {
      Alert.alert('Error', 'Failed to discover readers. Make sure Bluetooth is enabled.');
    } finally {
      setIsDiscovering(false);
    }
  }, [discoverReaders]);

  const handleConnect = useCallback(
    async (reader: Reader) => {
      setConnectingReaderId(reader.serialNumber);
      try {
        await connectReader(reader);
        onConnected?.(reader);
      } catch {
        Alert.alert('Connection Failed', 'Could not connect to the reader. Try again.');
      } finally {
        setConnectingReaderId(null);
      }
    },
    [connectReader, onConnected]
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectReader();
    } catch {
      Alert.alert('Error', 'Failed to disconnect from reader');
    }
  }, [disconnectReader]);

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return 'battery-dead';
    if (level >= 75) return 'battery-full';
    if (level >= 50) return 'battery-half';
    if (level >= 25) return 'battery-half';
    return 'battery-dead';
  };

  const renderReader = ({ item: reader }: { item: Reader }) => {
    const isConnecting = connectingReaderId === reader.serialNumber;
    const isConnected = connectedReader?.serialNumber === reader.serialNumber;

    return (
      <TouchableOpacity
        style={[styles.readerItem, isConnected && styles.readerItemConnected]}
        onPress={() => !isConnected && handleConnect(reader)}
        disabled={isConnecting || isConnected}
      >
        <View style={styles.readerIcon}>
          <Ionicons
            name="card-outline"
            size={32}
            color={isConnected ? '#22c55e' : '#6b7280'}
          />
        </View>
        <View style={styles.readerInfo}>
          <Text style={styles.readerLabel}>
            {reader.label || 'Stripe Reader M2'}
          </Text>
          <Text style={styles.readerSerial}>{reader.serialNumber}</Text>
          {reader.deviceSoftwareVersion && (
            <Text style={styles.readerVersion}>
              v{reader.deviceSoftwareVersion}
            </Text>
          )}
        </View>
        <View style={styles.readerAction}>
          {isConnecting ? (
            <ActivityIndicator size="small" color="#f59e0b" />
          ) : isConnected ? (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <Text style={styles.connectText}>Tap to connect</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Not initialized
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Card Reader Setup</Text>
          <Text style={styles.emptyText}>
            Initialize the Terminal SDK to connect to your M2 reader
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleInitialize}>
            <Text style={styles.primaryButtonText}>Initialize</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Connected state
  if (connectionStatus === 'connected' && connectedReader) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <View style={styles.connectedHeader}>
            <View style={styles.statusIndicator} />
            <Text style={styles.connectedTitle}>Reader Connected</Text>
          </View>

          <View style={styles.readerDetails}>
            <Ionicons name="card" size={48} color="#f59e0b" />
            <Text style={styles.connectedReaderName}>
              {connectedReader.label || 'Stripe Reader M2'}
            </Text>
            <Text style={styles.connectedReaderSerial}>
              {connectedReader.serialNumber}
            </Text>

            {batteryLevel !== null && (
              <View style={styles.batteryRow}>
                <Ionicons
                  name={getBatteryIcon(batteryLevel)}
                  size={20}
                  color={batteryLevel < 25 ? '#ef4444' : '#22c55e'}
                />
                <Text style={styles.batteryText}>{batteryLevel}%</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDisconnect}
          >
            <Text style={styles.secondaryButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Discovery state
  return (
    <View style={styles.container}>
      {/* Error banner */}
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Ionicons name="close" size={20} color="#ef4444" />
        </TouchableOpacity>
      )}

      {/* Discover button */}
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={handleDiscover}
        disabled={isDiscovering}
      >
        {isDiscovering ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.discoverButtonText}>Searching...</Text>
          </>
        ) : (
          <>
            <Ionicons name="bluetooth" size={24} color="#fff" />
            <Text style={styles.discoverButtonText}>Find Readers</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Reader list */}
      {discoveredReaders.length > 0 ? (
        <FlatList
          data={discoveredReaders}
          renderItem={renderReader}
          keyExtractor={(item) => item.serialNumber}
          style={styles.readerList}
          contentContainerStyle={styles.readerListContent}
        />
      ) : (
        <View style={styles.emptyList}>
          <Ionicons name="bluetooth-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyListText}>
            {isDiscovering
              ? 'Searching for nearby readers...'
              : 'Tap "Find Readers" to discover M2 readers'}
          </Text>
          <Text style={styles.emptyListHint}>
            Make sure your M2 is powered on and nearby
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  readerList: {
    flex: 1,
  },
  readerListContent: {
    padding: 16,
    gap: 12,
  },
  readerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  readerItemConnected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  readerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerInfo: {
    flex: 1,
  },
  readerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  readerSerial: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  readerVersion: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  readerAction: {
    alignItems: 'flex-end',
  },
  connectText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  connectedBadge: {
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyListText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyListHint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  connectedCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  readerDetails: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  connectedReaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  connectedReaderSerial: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  batteryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

