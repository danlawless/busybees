/**
 * Customer Dashboard Page
 * Main dashboard for customer portal
 */

'use client';

export const dynamic = 'force-dynamic';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { useCustomer } from '@/hooks/useCustomers';
import { usePurchases } from '@/hooks/usePurchases';
import { useSessions } from '@/hooks/useSessions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function DashboardContent() {
  const { user, profile } = useUser();
  const { customer } = useCustomer(user?.id || null, true);
  const { purchases } = usePurchases(user?.id);
  const { sessions } = useSessions(user?.id);

  const activePurchases = purchases?.filter((p: any) => p.status === 'active') || [];
  const activeSessions = sessions?.filter((s: any) => !s.end_time) || [];

  if (!customer) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.name}! 🐝
          </h1>
          <p className="text-gray-600">
            Here's your Busy Bees account overview
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Passes</p>
                <p className="text-2xl font-bold text-gray-900">{activePurchases.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👶</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Children</p>
                <p className="text-2xl font-bold text-gray-900">{customer.children?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Link href="/customer/passes">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <span className="text-4xl mb-2 block">🎟️</span>
                <p className="font-semibold text-gray-900">My Passes</p>
              </div>
            </Card>
          </Link>

          <Link href="/customer/purchases">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <span className="text-4xl mb-2 block">📋</span>
                <p className="font-semibold text-gray-900">Purchase History</p>
              </div>
            </Card>
          </Link>

          <Link href="/customer/children">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <span className="text-4xl mb-2 block">👨‍👩‍👧‍👦</span>
                <p className="font-semibold text-gray-900">My Children</p>
              </div>
            </Card>
          </Link>

          <Link href="/customer/payments">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <span className="text-4xl mb-2 block">💳</span>
                <p className="font-semibold text-gray-900">Payment Methods</p>
              </div>
            </Card>
          </Link>

          <Link href="/customer/profile">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <span className="text-4xl mb-2 block">⚙️</span>
                <p className="font-semibold text-gray-900">Account Settings</p>
              </div>
            </Card>
          </Link>
        </div>

        {/* Active Passes */}
        {activePurchases.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Passes</h2>
            <div className="space-y-3">
              {activePurchases.map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{purchase.name}</p>
                    <p className="text-sm text-gray-600">
                      {purchase.used_sessions} / {purchase.total_sessions === 999 ? 'Unlimited' : purchase.total_sessions} sessions used
                    </p>
                    {purchase.expiry_date && (
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(purchase.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Playing</h2>
            <div className="space-y-3">
              {activeSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">Session Active</p>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(session.start_time).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Auto checkout: {new Date(session.auto_checkout_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Playing
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Call to Action */}
        {activePurchases.length === 0 && (
          <Card className="p-8 text-center">
            <span className="text-6xl mb-4 block">🎫</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No Active Passes
            </h3>
            <p className="text-gray-600 mb-6">
              Purchase a pass to start playing at Busy Bees!
            </p>
            <Link href="/parties">
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

export default function CustomerDashboardPage() {
  return (
    <AuthGuard requireRole="customer">
      <DashboardContent />
    </AuthGuard>
  );
}

