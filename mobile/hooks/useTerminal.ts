/**
 * Stripe Terminal Hook for React Native
 * Manages M2 reader connection and payment collection
 */

import { useState, useCallback, useEffect } from 'react';
import {
  StripeTerminalProvider,
  useStripeTerminal,
  Reader,
  PaymentIntent,
  DiscoveryMethod,
} from '@stripe/stripe-terminal-react-native';
import { api } from '@/lib/api';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type PaymentStatus = 'idle' | 'collecting' | 'processing' | 'success' | 'error';

interface UseTerminalReturn {
  // State
  isInitialized: boolean;
  connectionStatus: ConnectionStatus;
  connectedReader: Reader | null;
  discoveredReaders: Reader[];
  paymentStatus: PaymentStatus;
  error: string | null;
  batteryLevel: number | null;

  // Actions
  initialize: () => Promise<void>;
  discoverReaders: () => Promise<void>;
  connectReader: (reader: Reader) => Promise<void>;
  disconnectReader: () => Promise<void>;
  collectPayment: (params: {
    amount: number;
    customerId: string;
    description?: string;
    metadata?: Record<string, string>;
  }) => Promise<PaymentIntent>;
  cancelPayment: () => Promise<void>;
  clearError: () => void;
}

export function useTerminalConnection(): UseTerminalReturn {
  const {
    initialize: initializeTerminal,
    discoverReaders: discoverReadersSDK,
    connectBluetoothReader,
    disconnectReader: disconnectReaderSDK,
    collectPaymentMethod,
    confirmPaymentIntent,
    cancelCollectPaymentMethod,
  } = useStripeTerminal();

  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  /**
   * Fetch connection token from our backend
   */
  const fetchConnectionToken = useCallback(async (): Promise<string> => {
    const { secret } = await api.getConnectionToken();
    return secret;
  }, []);

  /**
   * Initialize the Terminal SDK
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);

      const { error: initError } = await initializeTerminal();

      if (initError) {
        throw new Error(initError.message);
      }

      setIsInitialized(true);
      console.log('✅ Terminal SDK initialized');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Terminal';
      setError(message);
      console.error('❌ Terminal initialization failed:', err);
      throw err;
    }
  }, [initializeTerminal]);

  /**
   * Discover M2 readers via Bluetooth
   */
  const discoverReaders = useCallback(async () => {
    try {
      setError(null);
      setDiscoveredReaders([]);

      const { error: discoverError, readers } = await discoverReadersSDK({
        discoveryMethod: DiscoveryMethod.BluetoothScan,
        simulated: __DEV__, // Use simulated in development
      });

      if (discoverError) {
        throw new Error(discoverError.message);
      }

      setDiscoveredReaders(readers || []);
      console.log(`📱 Found ${readers?.length || 0} readers`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover readers';
      setError(message);
      console.error('❌ Reader discovery failed:', err);
      throw err;
    }
  }, [discoverReadersSDK]);

  /**
   * Connect to an M2 reader
   */
  const connectReader = useCallback(
    async (reader: Reader) => {
      try {
        setError(null);
        setConnectionStatus('connecting');

        const { error: connectError, reader: connectedR } = await connectBluetoothReader({
          reader,
          locationId: reader.locationId || undefined,
        });

        if (connectError) {
          throw new Error(connectError.message);
        }

        setConnectedReader(connectedR || null);
        setConnectionStatus('connected');

        // Get battery level if available
        if (connectedR?.batteryLevel) {
          setBatteryLevel(connectedR.batteryLevel);
        }

        console.log('✅ Connected to reader:', connectedR?.serialNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect to reader';
        setError(message);
        setConnectionStatus('disconnected');
        console.error('❌ Reader connection failed:', err);
        throw err;
      }
    },
    [connectBluetoothReader]
  );

  /**
   * Disconnect from current reader
   */
  const disconnectReader = useCallback(async () => {
    try {
      setError(null);

      await disconnectReaderSDK();

      setConnectedReader(null);
      setConnectionStatus('disconnected');
      setBatteryLevel(null);

      console.log('📱 Disconnected from reader');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      console.error('❌ Disconnect failed:', err);
      throw err;
    }
  }, [disconnectReaderSDK]);

  /**
   * Collect a payment
   */
  const collectPayment = useCallback(
    async (params: {
      amount: number;
      customerId: string;
      description?: string;
      metadata?: Record<string, string>;
    }): Promise<PaymentIntent> => {
      if (!connectedReader) {
        throw new Error('No reader connected');
      }

      try {
        setError(null);
        setPaymentStatus('collecting');

        // 1. Create PaymentIntent via our backend
        const { client_secret } = await api.createTerminalPayment({
          amount: Math.round(params.amount * 100), // Convert to cents
          customer_id: params.customerId,
          description: params.description,
          metadata: params.metadata,
        });

        // 2. Collect payment method (card tap/insert/swipe)
        const { error: collectError, paymentIntent: collectedPI } =
          await collectPaymentMethod({ paymentIntentClientSecret: client_secret });

        if (collectError) {
          throw new Error(collectError.message);
        }

        if (!collectedPI) {
          throw new Error('No payment intent returned');
        }

        // 3. Confirm the payment
        setPaymentStatus('processing');

        const { error: confirmError, paymentIntent: confirmedPI } =
          await confirmPaymentIntent({ paymentIntent: collectedPI });

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (!confirmedPI) {
          throw new Error('Payment confirmation failed');
        }

        setPaymentStatus('success');
        console.log('✅ Payment successful:', confirmedPI.id);

        return confirmedPI;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        setError(message);
        setPaymentStatus('error');
        console.error('❌ Payment failed:', err);
        throw err;
      }
    },
    [connectedReader, collectPaymentMethod, confirmPaymentIntent]
  );

  /**
   * Cancel in-progress payment collection
   */
  const cancelPayment = useCallback(async () => {
    try {
      await cancelCollectPaymentMethod();
      setPaymentStatus('idle');
      console.log('❌ Payment cancelled');
    } catch (err) {
      console.error('❌ Cancel failed:', err);
    }
  }, [cancelCollectPaymentMethod]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isInitialized,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    paymentStatus,
    error,
    batteryLevel,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    clearError,
  };
}

/**
 * Terminal Provider wrapper component
 */
interface TerminalProviderProps {
  children: React.ReactNode;
}

export function TerminalProvider({ children }: TerminalProviderProps) {
  const fetchToken = useCallback(async () => {
    const { secret } = await api.getConnectionToken();
    return secret;
  }, []);

  return (
    <StripeTerminalProvider
      logLevel="verbose"
      tokenProvider={fetchToken}
    >
      {children}
    </StripeTerminalProvider>
  );
}

