/**
 * Reader Connection Component
 * UI for discovering and connecting to Stripe Terminal readers
 *
 * Supports:
 * - Simulated readers (development/testing)
 * - Internet-connected readers (S700, WisePOS E)
 *
 * For Bluetooth readers (M2), a React Native companion app is needed.
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTerminalContext } from './TerminalProvider';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CreditCard,
  Check,
  AlertCircle,
  Smartphone,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Reader = {
  id: string;
  object: string;
  device_sw_version: string | null;
  device_type: string;
  label: string | null;
  location: string | null;
  serial_number: string;
  status: string;
};

interface ReaderConnectionProps {
  className?: string;
  onConnectionChange?: (connected: boolean, reader: Reader | null) => void;
}

export function ReaderConnection({
  className,
  onConnectionChange,
}: ReaderConnectionProps) {
  const {
    isInitialized,
    isConnected,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    error,
    isSimulated,
    initializeTerminal,
    discoverReaders,
    connectToReader,
    disconnectFromReader,
    clearError,
  } = useTerminalContext();

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleInitialize = useCallback(async () => {
    try {
      await initializeTerminal();
    } catch {
      // Error is handled by the context
    }
  }, [initializeTerminal]);

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      await discoverReaders();
    } catch {
      // Error is handled by the context
    } finally {
      setIsDiscovering(false);
    }
  }, [discoverReaders]);

  const handleConnect = useCallback(
    async (reader: Reader) => {
      setIsConnecting(reader.id);
      try {
        await connectToReader(reader);
        onConnectionChange?.(true, reader);
      } catch {
        // Error is handled by the context
      } finally {
        setIsConnecting(null);
      }
    },
    [connectToReader, onConnectionChange]
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectFromReader();
      onConnectionChange?.(false, null);
    } catch {
      // Error is handled by the context
    }
  }, [disconnectFromReader, onConnectionChange]);

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType.includes('simulated')) {
      return <Radio className="h-5 w-5" />;
    }
    if (deviceType.includes('mobile') || deviceType.includes('m2')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'connecting':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-gray-400" />
          )}
          <h3 className="font-semibold text-gray-900">Card Reader</h3>
          {isSimulated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              Simulated
            </span>
          )}
        </div>

        <div
          className={cn(
            'text-xs px-2 py-1 rounded-full border font-medium',
            getStatusColor()
          )}
        >
          {connectionStatus === 'connected'
            ? 'Connected'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-600 hover:text-red-800 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Not Initialized */}
      {!isInitialized && (
        <div className="text-center py-6">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 mb-4">
            Initialize the card reader to accept in-person payments
          </p>
          <Button onClick={handleInitialize} variant="primary">
            Initialize Reader
          </Button>
        </div>
      )}

      {/* Connected Reader */}
      {isInitialized && isConnected && connectedReader && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            {getDeviceIcon(connectedReader.device_type)}
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {connectedReader.label || 'Card Reader'}
              </p>
              <p className="text-xs text-gray-500">
                {connectedReader.device_type} • {connectedReader.serial_number}
              </p>
            </div>
            <Check className="h-5 w-5 text-green-600" />
          </div>

          <Button
            onClick={handleDisconnect}
            variant="secondary"
            className="w-full"
          >
            Disconnect Reader
          </Button>
        </div>
      )}

      {/* Reader Discovery */}
      {isInitialized && !isConnected && (
        <div className="space-y-4">
          <Button
            onClick={handleDiscover}
            variant="secondary"
            className="w-full"
            disabled={isDiscovering}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isDiscovering && 'animate-spin')}
            />
            {isDiscovering ? 'Discovering...' : 'Discover Readers'}
          </Button>

          {/* Discovered Readers List */}
          {discoveredReaders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Available Readers ({discoveredReaders.length})
              </p>
              {discoveredReaders.map((reader) => (
                <div
                  key={reader.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {getDeviceIcon(reader.device_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {reader.label || 'Card Reader'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {reader.device_type}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleConnect(reader)}
                    disabled={isConnecting === reader.id}
                  >
                    {isConnecting === reader.id ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No Readers Found */}
          {discoveredReaders.length === 0 && !isDiscovering && (
            <p className="text-sm text-gray-500 text-center py-4">
              No readers found. Make sure your reader is powered on and nearby.
            </p>
          )}
        </div>
      )}

      {/* M2 Notice */}
      {isInitialized && !isSimulated && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> The Stripe Reader M2 (Bluetooth) requires a
            mobile app. This web interface supports internet-connected readers
            (S700, WisePOS E) or simulated readers for testing.
          </p>
        </div>
      )}
    </Card>
  );
}

