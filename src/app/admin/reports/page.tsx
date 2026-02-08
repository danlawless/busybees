/**
 * Admin Reports Dashboard Page
 * PIN-protected reporting page with 7 analytics tabs
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReportsDashboard } from '@/components/admin/reports/ReportsDashboard';
import { logger } from '@/lib/client-logger';

export default function AdminReportsPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;

    setIsAuthenticating(true);
    setPinError('');

    try {
      const response = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (response.ok) {
        setIsUnlocked(true);
        setPinError('');
      } else {
        const data = await response.json();
        setPinError(data.error || 'Invalid PIN. Please try again.');
        setPinInput('');
      }
    } catch (err) {
      logger.error({ error: err }, 'Staff login failed');
      setPinError('Authentication failed. Please try again.');
      setPinInput('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit();
    }
  };

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white flex items-center justify-center p-8 pos-page-static">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">🔒 Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-center text-neutral-600">
                Enter the admin PIN to access Reports Dashboard
              </p>
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={handlePinKeyDown}
                  placeholder="Enter PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 disabled:opacity-50"
                  autoFocus
                  disabled={isAuthenticating}
                />
              </div>
              {pinError && (
                <p className="text-red-600 text-sm text-center">{pinError}</p>
              )}
              <Button
                onClick={handlePinSubmit}
                className="w-full"
                disabled={pinInput.length < 4 || isAuthenticating}
              >
                {isAuthenticating ? 'Authenticating...' : 'Unlock'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-4 sm:p-8 pos-page-static">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-2">
            Reports Dashboard
          </h1>
          <p className="text-neutral-600">
            Business analytics and performance metrics
          </p>
        </div>

        <ReportsDashboard />
      </div>
    </div>
  );
}
