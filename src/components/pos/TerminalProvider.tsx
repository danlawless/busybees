/**
 * Terminal Provider Component
 * Provides Stripe Terminal context to the POS system
 *
 * This provider initializes the Terminal SDK and manages reader connections.
 * For development/testing, it supports simulated readers.
 * For production, use with internet-connected readers (S700) or
 * build a React Native companion app for M2.
 */

'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { useTerminal } from '@/hooks/useTerminal';

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

interface TerminalContextValue {
  // State
  isInitialized: boolean;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  connectedReader: Reader | null;
  discoveredReaders: Reader[];
  error: string | null;
  isSimulated: boolean;

  // Actions
  initializeTerminal: () => Promise<void>;
  discoverReaders: () => Promise<Reader[]>;
  connectToReader: (reader: Reader) => Promise<void>;
  disconnectFromReader: () => Promise<void>;
  processPayment: (clientSecret: string) => Promise<{ paymentIntent: unknown }>;
  cancelPayment: () => Promise<void>;
  clearError: () => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

interface TerminalProviderProps {
  children: ReactNode;
  locationId?: string;
  simulated?: boolean;
}

export function TerminalProvider({
  children,
  locationId,
  simulated = process.env.NODE_ENV === 'development',
}: TerminalProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    isConnected,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    error,
    initialize,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelCollectPayment,
    clearError,
  } = useTerminal({ locationId, simulated });

  const initializeTerminal = useCallback(async () => {
    await initialize();
    setIsInitialized(true);
  }, [initialize]);

  const connectToReader = useCallback(
    async (reader: Reader) => {
      await connectReader(reader);
    },
    [connectReader]
  );

  const disconnectFromReader = useCallback(async () => {
    await disconnectReader();
  }, [disconnectReader]);

  const processPayment = useCallback(
    async (clientSecret: string) => {
      return collectPayment(clientSecret);
    },
    [collectPayment]
  );

  const cancelPayment = useCallback(async () => {
    await cancelCollectPayment();
  }, [cancelCollectPayment]);

  const value: TerminalContextValue = {
    isInitialized,
    isConnected,
    connectionStatus,
    connectedReader,
    discoveredReaders,
    error,
    isSimulated: simulated,
    initializeTerminal,
    discoverReaders,
    connectToReader,
    disconnectFromReader,
    processPayment,
    cancelPayment,
    clearError,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminalContext(): TerminalContextValue {
  const context = useContext(TerminalContext);

  if (!context) {
    throw new Error('useTerminalContext must be used within a TerminalProvider');
  }

  return context;
}

