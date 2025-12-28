/**
 * Root Layout
 * Sets up providers and navigation
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TerminalProvider } from '@/hooks/useTerminal';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <TerminalProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FCD34D',
            },
            headerTintColor: '#1f2937',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="payment"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </TerminalProvider>
    </QueryClientProvider>
  );
}

