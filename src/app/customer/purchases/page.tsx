/**
 * Customer Purchases Page
 * View complete purchase history
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { usePurchases } from '@/hooks/usePurchases';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function PurchasesContent() {
  const { user } = useUser();
  const { purchases, isLoading } = usePurchases(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const totalSpent = purchases?.reduce((sum: number, p: any) => sum + p.price, 0) || 0;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase History</h1>
          <p className="text-gray-600">
            All your Busy Bees purchases in one place
          </p>
        </div>

        {/* Summary Card */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-3xl font-bold text-gray-900">{purchases?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-3xl font-bold text-green-600">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Items</p>
              <p className="text-3xl font-bold text-blue-600">
                {purchases?.filter((p: any) => p.status === 'active').length || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Purchase List */}
        {purchases && purchases.length > 0 ? (
          <div className="space-y-4">
            {purchases.map((purchase: any) => {
              const statusColors = {
                active: 'bg-green-100 text-green-800 border-green-300',
                expired: 'bg-gray-100 text-gray-700 border-gray-300',
                used: 'bg-blue-100 text-blue-800 border-blue-300',
              };

              const statusIcons = {
                active: '✅',
                expired: '⏰',
                used: '✓',
              };

              return (
                <Card key={purchase.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{purchase.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[purchase.status as keyof typeof statusColors]}`}>
                          {statusIcons[purchase.status as keyof typeof statusIcons]} {purchase.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-4">
                        <div>
                          <p className="font-medium">Price</p>
                          <p className="text-lg font-bold text-gray-900">${purchase.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Purchase Date</p>
                          <p>{new Date(purchase.purchase_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Sessions</p>
                          <p>{purchase.used_sessions} / {purchase.total_sessions === 999 ? '∞' : purchase.total_sessions}</p>
                        </div>
                        <div>
                          <p className="font-medium">Type</p>
                          <p className="capitalize">{purchase.type.replace('_', ' ')}</p>
                        </div>
                      </div>

                      {purchase.party_date && (
                        <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                          <p className="text-sm font-medium text-pink-900">
                            🎉 Party Scheduled: {new Date(purchase.party_date).toLocaleDateString()}
                          </p>
                          {purchase.party_start_time && (
                            <p className="text-xs text-pink-700">
                              Time: {purchase.party_start_time} - {purchase.party_end_time}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Purchases Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start your Busy Bees adventure today!
            </p>
            <Link href="/">
              <Button size="lg">
                Browse Options
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <AuthGuard requireRole="customer">
      <PurchasesContent />
    </AuthGuard>
  );
}

