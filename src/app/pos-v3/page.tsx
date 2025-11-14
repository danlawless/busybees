/**
 * POS Page V3 - Fully Integrated with Supabase
 * Complete implementation with all components using APIs
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneLoginV2 } from '@/components/pos/PhoneLoginV2';
import { CheckInV3 } from '@/components/pos/CheckInV3';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { SettingsManager } from '@/components/admin/SettingsManager';
import { StripeProductManager } from '@/components/admin/StripeProductManager';
import { StripeCouponManager } from '@/components/admin/StripeCouponManager';
import { useCustomers } from '@/hooks/useCustomers';
import { usePurchases, useTodayPurchases } from '@/hooks/usePurchases';
import { useActiveSessions } from '@/hooks/useSessions';
import { useAllPasses } from '@/hooks/usePasses';
import { useAllPromos } from '@/hooks/usePromos';
import { Card } from '@/components/ui/Card';

type ViewMode = 'login' | 'checkin' | 'admin';
type AdminTab = 'dashboard' | 'customers' | 'sales' | 'marketing' | 'stripe' | 'settings';

export default function POSV3Page() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useUser();

  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isStaffMode, setIsStaffMode] = useState(false);

  // Fetch data using hooks
  const { customers } = useCustomers();
  const { purchases: allPurchases } = usePurchases();
  const { purchases: todayPurchases } = useTodayPurchases();
  const { sessions: activeSessions } = useActiveSessions();
  const { passes } = useAllPasses();
  const { promos } = useAllPromos();

  // Determine staff mode based on user role
  useEffect(() => {
    if (profile) {
      const isStaff = ['staff', 'admin'].includes(profile.role);
      setIsStaffMode(isStaff);

      if (isStaff) {
        setCurrentView('admin');
      } else if (user) {
        setCurrentView('checkin');
      }
    } else if (!user) {
      setCurrentView('login');
    }
  }, [profile, user]);

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentView('login');
    setIsStaffMode(false);
    router.push('/pos-v3');
  };

  const handleAdminAccess = () => {
    setCurrentView('admin');
  };

  // Calculate analytics
  const totalRevenue = allPurchases?.reduce((sum: number, p: any) => sum + p.price, 0) || 0;
  const todayRevenue = todayPurchases?.reduce((sum: number, p: any) => sum + p.price, 0) || 0;
  const activeSessionCount = activeSessions?.length || 0;
  const customerCount = customers?.length || 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
      {/* Header */}
      {currentView !== 'login' && user && (
        <div className="bg-white shadow-lg border-b-4 border-yellow-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isStaffMode ? 'bg-red-400' : 'bg-yellow-400'
                }`}>
                  <span className="text-2xl">{isStaffMode ? '👨‍💼' : '🐝'}</span>
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${isStaffMode ? 'text-red-700' : 'text-gray-900'}`}>
                    Busy Bees POS {isStaffMode && '(Staff Mode)'}
                  </h1>
                  <p className={`text-sm ${isStaffMode ? 'text-red-600' : 'text-gray-600'}`}>
                    {profile?.name || 'Point of Sale System'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {!isStaffMode && (
                  <Button
                    onClick={() => setCurrentView('checkin')}
                    variant={currentView === 'checkin' ? 'default' : 'outline'}
                    size="sm"
                  >
                    ✅ Check In
                  </Button>
                )}

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  🚪 Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'login' && !user && (
          <PhoneLoginV2 onAdminAccess={handleAdminAccess} />
        )}

        {currentView === 'checkin' && user && (
          <CheckInV3 customerId={user.id} isStaffMode={isStaffMode} />
        )}

        {currentView === 'admin' && isStaffMode && (
          <div className="space-y-6">
            {/* Admin Navigation */}
            <Card className="p-4">
              <nav className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setAdminTab('dashboard')}
                  variant={adminTab === 'dashboard' ? 'default' : 'outline'}
                  size="sm"
                >
                  📊 Dashboard
                </Button>
                <Button
                  onClick={() => setAdminTab('customers')}
                  variant={adminTab === 'customers' ? 'default' : 'outline'}
                  size="sm"
                >
                  👥 Customers
                </Button>
                <Button
                  onClick={() => setAdminTab('sales')}
                  variant={adminTab === 'sales' ? 'default' : 'outline'}
                  size="sm"
                >
                  💰 Sales
                </Button>
                <Button
                  onClick={() => setAdminTab('marketing')}
                  variant={adminTab === 'marketing' ? 'default' : 'outline'}
                  size="sm"
                >
                  📢 Marketing
                </Button>
                <Button
                  onClick={() => setAdminTab('stripe')}
                  variant={adminTab === 'stripe' ? 'default' : 'outline'}
                  size="sm"
                >
                  💳 Stripe
                </Button>
                <Button
                  onClick={() => setAdminTab('settings')}
                  variant={adminTab === 'settings' ? 'default' : 'outline'}
                  size="sm"
                >
                  ⚙️ Settings
                </Button>
              </nav>
            </Card>

            {/* Admin Content */}
            {adminTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">{activeSessionCount}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Customers</p>
                        <p className="text-2xl font-bold text-gray-900">{customerCount}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">${todayRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📈</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Today's Purchases */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Today's Purchases ({todayPurchases?.length || 0})
                  </h3>
                  {todayPurchases && todayPurchases.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {todayPurchases.map((purchase: any) => {
                        const customer = customers?.find((c: any) => c.id === purchase.customer_id);
                        return (
                          <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{purchase.name}</p>
                              <p className="text-sm text-gray-600">
                                {customer?.name || 'Unknown'} • {new Date(purchase.purchase_date).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${purchase.price.toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No purchases today</p>
                  )}
                </Card>
              </div>
            )}

            {adminTab === 'customers' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  All Customers ({customerCount})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {customers?.map((customer: any) => (
                    <div key={customer.id} className="p-4 border border-gray-200 rounded-lg">
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                      {customer.email && (
                        <p className="text-xs text-gray-500">{customer.email}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {adminTab === 'sales' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Sales Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Today's Sales</p>
                    <p className="text-2xl font-bold text-green-600">${todayRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transactions Today</p>
                    <p className="text-2xl font-bold text-purple-600">{todayPurchases?.length || 0}</p>
                  </div>
                </div>
              </Card>
            )}

            {adminTab === 'marketing' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Active Promotions</h3>
                {promos && promos.length > 0 ? (
                  <div className="space-y-3">
                    {promos.map((promo: any) => (
                      <div key={promo.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-semibold">{promo.name}</p>
                        <p className="text-sm text-gray-600">{promo.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Code: {promo.stripe_coupon_code} • {promo.discount_percent}% OFF
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No active promotions</p>
                )}
              </Card>
            )}

            {adminTab === 'stripe' && (
              <div className="space-y-6">
                <StripeProductManager onProductCreated={() => {}} />
                <StripeCouponManager onCouponCreated={() => {}} />
              </div>
            )}

            {adminTab === 'settings' && (
              <SettingsManager />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


