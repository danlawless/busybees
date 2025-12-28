/**
 * Stripe Terminal Hook
 * Provides Terminal SDK functionality for the web app
 *
 * This hook supports:
 * - Simulated readers (for development/testing)
 * - Internet-connected readers (S700, WisePOS E) via web
 *
 * For Bluetooth readers (M2), use the React Native SDK in a mobile app.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/client-logger';

// Terminal SDK types (dynamic import to avoid SSR issues)
type TerminalType = typeof import('@stripe/terminal-js').default;
type Terminal = Awaited<ReturnType<Awaited<ReturnType<TerminalType['create']>>['then']>>;
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

type PaymentStatus =
  | 'not_ready'
  | 'ready'
  | 'waiting_for_input'
  | 'processing';

interface UseTerminalOptions {
  locationId?: string;
  simulated?: boolean;
}

interface UseTerminalReturn {
  // State
  terminal: Terminal | null;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  connectedReader: Reader | null;
  discoveredReaders: Reader[];
  paymentStatus: PaymentStatus;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  discoverReaders: () => Promise<Reader[]>;
  connectReader: (reader: Reader) => Promise<void>;
  disconnectReader: () => Promise<void>;
  collectPayment: (clientSecret: string) => Promise<{ paymentIntent: unknown }>;
  cancelCollectPayment: () => Promise<void>;
  clearError: () => void;
}

/**
 * Fetch connection token from our API
 */
async function fetchConnectionToken(locationId?: string): Promise<string> {
  const response = await fetch('/api/stripe/terminal/connection-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location_id: locationId }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch connection token');
  }

  const { secret } = await response.json();
  return secret;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const { locationId, simulated = false } = options;

  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('not_ready');
  const [error, setError] = useState<string | null>(null);

  // Track pending operations for cancellation
  const pendingOperationRef = useRef<{ cancel: () => void } | null>(null);

  /**
   * Initialize the Terminal SDK
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);

      // Dynamic import to avoid SSR issues
      const { loadStripeTerminal } = await import('@stripe/terminal-js');

      const StripeTerminal = await loadStripeTerminal();

      if (!StripeTerminal) {
        throw new Error('Failed to load Stripe Terminal');
      }

      const terminalInstance = StripeTerminal.create({
        onFetchConnectionToken: () => fetchConnectionToken(locationId),
        onConnectionStatusChange: (event) => {
          logger.info({ status: event.status }, '🔌 Terminal connection status changed');

          if (event.status === 'connected') {
            setIsConnected(true);
            setConnectionStatus('connected');
          } else if (event.status === 'not_connected') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
            setConnectedReader(null);
          }
        },
        onPaymentStatusChange: (event) => {
          logger.info({ status: event.status }, '💳 Terminal payment status changed');
          setPaymentStatus(event.status as PaymentStatus);
        },
        onUnexpectedReaderDisconnect: () => {
          logger.warn({}, '⚠️ Terminal reader unexpectedly disconnected');
          setIsConnected(false);
          setConnectionStatus('disconnected');
          setConnectedReader(null);
          setError('Reader disconnected unexpectedly');
        },
      });

      setTerminal(terminalInstance);
      setPaymentStatus('ready');

      logger.info({ simulated, locationId }, '✅ Terminal SDK initialized');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Terminal';
      logger.error({ error: err }, '❌ Terminal initialization failed');
      setError(message);
      throw err;
    }
  }, [locationId, simulated]);

  /**
   * Discover available readers
   */
  const discoverReaders = useCallback(async (): Promise<Reader[]> => {
    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    try {
      setError(null);

      const config = simulated
        ? { simulated: true }
        : { location: locationId };

      const discoverResult = await terminal.discoverReaders(config);

      if ('error' in discoverResult && discoverResult.error) {
        throw new Error(discoverResult.error.message);
      }

      const readers = discoverResult.discoveredReaders || [];
      setDiscoveredReaders(readers as Reader[]);

      logger.info({ count: readers.length, simulated }, '📱 Readers discovered');

      return readers as Reader[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover readers';
      logger.error({ error: err }, '❌ Reader discovery failed');
      setError(message);
      throw err;
    }
  }, [terminal, simulated, locationId]);

  /**
   * Connect to a specific reader
   */
  const connectReader = useCallback(async (reader: Reader): Promise<void> => {
    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    try {
      setError(null);
      setConnectionStatus('connecting');

      const connectResult = await terminal.connectReader(reader);

      if ('error' in connectResult && connectResult.error) {
        throw new Error(connectResult.error.message);
      }

      setConnectedReader(connectResult.reader as Reader);
      setIsConnected(true);
      setConnectionStatus('connected');

      logger.info(
        { readerId: reader.id, label: reader.label },
        '✅ Connected to reader'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to reader';
      logger.error({ error: err, readerId: reader.id }, '❌ Reader connection failed');
      setConnectionStatus('disconnected');
      setError(message);
      throw err;
    }
  }, [terminal]);

  /**
   * Disconnect from the current reader
   */
  const disconnectReader = useCallback(async (): Promise<void> => {
    if (!terminal) {
      return;
    }

    try {
      setError(null);

      await terminal.disconnectReader();

      setConnectedReader(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');

      logger.info({}, '📱 Disconnected from reader');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      logger.error({ error: err }, '❌ Reader disconnection failed');
      setError(message);
      throw err;
    }
  }, [terminal]);

  /**
   * Collect a payment using the connected reader
   */
  const collectPayment = useCallback(async (clientSecret: string): Promise<{ paymentIntent: unknown }> => {
    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    if (!isConnected) {
      throw new Error('No reader connected');
    }

    try {
      setError(null);

      const collectResult = await terminal.collectPaymentMethod(clientSecret);

      if ('error' in collectResult && collectResult.error) {
        throw new Error(collectResult.error.message);
      }

      const paymentIntent = collectResult.paymentIntent;

      // Process the payment
      const processResult = await terminal.processPayment(paymentIntent);

      if ('error' in processResult && processResult.error) {
        throw new Error(processResult.error.message);
      }

      logger.info(
        { paymentIntentId: processResult.paymentIntent.id },
        '✅ Payment collected successfully'
      );

      return { paymentIntent: processResult.paymentIntent };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment collection failed';
      logger.error({ error: err }, '❌ Payment collection failed');
      setError(message);
      throw err;
    }
  }, [terminal, isConnected]);

  /**
   * Cancel an in-progress payment collection
   */
  const cancelCollectPayment = useCallback(async (): Promise<void> => {
    if (!terminal) {
      return;
    }

    try {
      await terminal.cancelCollectPaymentMethod();
      logger.info({}, '❌ Payment collection cancelled');
    } catch (err) {
      logger.error({ error: err }, '❌ Failed to cancel payment collection');
    }
  }, [terminal]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingOperationRef.current) {
        pendingOperationRef.current.cancel();
      }
    };
  }, []);

  return {
    terminal,
    isConnected,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    paymentStatus,
    error,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelCollectPayment,
    clearError,
  };
}

