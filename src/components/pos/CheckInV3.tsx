/**
 * CheckIn Component V3 - Fully Supabase Integrated
 * Handles customer check-in using APIs and real-time data hooks
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCustomer } from '@/hooks/useCustomers';
import { usePurchases } from '@/hooks/usePurchases';
import { useSessions, useCustomerSessions } from '@/hooks/useSessions';
import { logger } from '@/lib/logger';

interface CheckInV3Props {
  customerId: string | null;
  isStaffMode: boolean;
}

export function CheckInV3({ customerId, isStaffMode }: CheckInV3Props) {
  const { customer, mutate: mutateCustomer } = useCustomer(customerId, true);
  const { purchases, mutate: mutatePurchases } = usePurchases(customerId || undefined);
  const { sessions, mutate: mutateSessions } = useCustomerSessions(customerId || '');

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!customer) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Get active, available passes
  const availablePasses = purchases?.filter((p: any) =>
    p.status === 'active' &&
    (p.total_sessions === 999 || p.used_sessions < p.total_sessions) &&
    ['day_pass', 'weekly_pass', 'monthly_pass'].includes(p.type)
  ) || [];

  const activeSessions = sessions?.filter((s: any) => !s.end_time) || [];

  const handleCheckIn = async (purchaseId: string) => {
    setIsCheckingIn(true);
    setError('');
    setSuccess('');

    try {
      // Calculate auto-checkout time (12 hours from now)
      const now = new Date();
      const autoCheckoutTime = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

      // Create session via API
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          purchase_id: purchaseId,
          auto_checkout_time: autoCheckoutTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check in');
      }

      const newSession = await response.json();

      logger.info({
        sessionId: newSession.id,
        customerId,
        purchaseId
      }, '✅ Check-in successful');

      setSuccess('Check-in successful! Have fun!');

      // Revalidate data
      await mutateSessions();
      await mutatePurchases();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      logger.error({ error: err, customerId, purchaseId }, 'Check-in failed');
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to check out');
      }

      logger.info({ sessionId }, '👋 Check-out successful');

      // Revalidate data
      await mutateSessions();
      await mutatePurchases();
    } catch (err) {
      logger.error({ error: err, sessionId }, 'Check-out failed');
      setError(err instanceof Error ? err.message : 'Check-out failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {customer.name}! 🐝
        </h2>
        <p className="text-gray-600">
          Check in to start playing
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="p-6 bg-green-50 border-2 border-green-300">
          <h3 className="text-xl font-bold text-green-900 mb-4">
            🎮 Currently Playing ({activeSessions.length})
          </h3>
          <div className="space-y-3">
            {activeSessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                <div>
                  <p className="font-semibold text-gray-900">Active Session</p>
                  <p className="text-sm text-gray-600">
                    Started: {new Date(session.start_time).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Auto checkout: {new Date(session.auto_checkout_time).toLocaleTimeString()}
                  </p>
                </div>
                {isStaffMode && (
                  <Button
                    onClick={() => handleCheckOut(session.id)}
                    size="sm"
                    variant="outline"
                  >
                    Check Out
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Passes */}
      {availablePasses.length > 0 ? (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Available Passes ({availablePasses.length})
          </h3>
          <div className="space-y-3">
            {availablePasses.map((pass: any) => {
              const usagePercent = (pass.used_sessions / pass.total_sessions) * 100;
              const canCheckIn = activeSessions.length === 0; // One active session at a time

              return (
                <div key={pass.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{pass.name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Sessions Used:</span>
                        <span className="font-medium">
                          {pass.used_sessions} / {pass.total_sessions === 999 ? 'Unlimited' : pass.total_sessions}
                        </span>
                      </div>
                      {pass.total_sessions !== 999 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      )}
                      {pass.expiry_date && (
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(pass.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCheckIn(pass.id)}
                    disabled={!canCheckIn || isCheckingIn}
                    size="sm"
                    className="ml-4"
                  >
                    {isCheckingIn ? '⏳' : '✅ Check In'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <span className="text-6xl mb-4 block">🎫</span>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No Available Passes
          </h3>
          <p className="text-gray-600 mb-6">
            Purchase a pass to start playing!
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Browse Passes
          </Button>
        </Card>
      )}

      {activeSessions.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-900">
            ℹ️ You already have an active session. Please check out before starting a new one.
          </p>
        </div>
      )}
    </div>
  );
}


