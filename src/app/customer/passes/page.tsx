/**
 * Customer Passes Page
 * View and manage active passes
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { usePurchases } from '@/hooks/usePurchases';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function PassesContent() {
  const { user, profile } = useUser();
  const { purchases, isLoading } = usePurchases(user?.id);

  const passes = purchases?.filter(
    (p: any) => ['day_pass', 'weekly_pass', 'monthly_pass'].includes(p.type)
  ) || [];

  const activePasses = passes.filter((p: any) => p.status === 'active');
  const expiredPasses = passes.filter((p: any) => p.status !== 'active');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Passes</h1>
          <p className="text-gray-600">Manage your play passes and memberships</p>
        </div>

        {/* Active Passes */}
        {activePasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Active Passes ({activePasses.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activePasses.map((pass: any) => {
                const usagePercent = (pass.used_sessions / pass.total_sessions) * 100;

                return (
                  <Card key={pass.id} className="p-6 border-2 border-green-300">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{pass.name}</h3>
                        <p className="text-sm text-gray-600">${pass.price.toFixed(2)}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Usage Bar */}
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Sessions Used</span>
                          <span>
                            {pass.used_sessions} / {pass.total_sessions === 999 ? 'Unlimited' : pass.total_sessions}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📅 Purchased: {new Date(pass.purchase_date).toLocaleDateString()}</p>
                        {pass.first_use_date && (
                          <p>🎮 First Used: {new Date(pass.first_use_date).toLocaleDateString()}</p>
                        )}
                        {pass.expiry_date && (
                          <p>⏰ Expires: {new Date(pass.expiry_date).toLocaleDateString()}</p>
                        )}
                        {pass.auto_renew && (
                          <p className="text-purple-600 font-medium">
                            🔄 Auto-renews on {new Date(pass.next_renewal_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Expired Passes */}
        {expiredPasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Past Passes ({expiredPasses.length})
            </h2>
            <div className="space-y-3">
              {expiredPasses.map((pass: any) => (
                <Card key={pass.id} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{pass.name}</p>
                      <p className="text-sm text-gray-600">
                        {pass.used_sessions} / {pass.total_sessions === 999 ? 'Unlimited' : pass.total_sessions} sessions used
                      </p>
                    </div>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {pass.status === 'used' ? 'Used Up' : 'Expired'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Passes CTA */}
        {activePasses.length === 0 && (
          <Card className="p-12 text-center">
            <span className="text-6xl mb-4 block">🎫</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Active Passes
            </h3>
            <p className="text-gray-600 mb-6">
              Purchase a pass to start playing at Busy Bees!
            </p>
            <Link href="/">
              <Button size="lg">
                Browse Passes & Memberships
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function PassesPage() {
  return (
    <AuthGuard requireRole="customer">
      <PassesContent />
    </AuthGuard>
  );
}

