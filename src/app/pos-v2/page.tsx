/**
 * POS Page - Supabase Version
 * Complete rewrite using Supabase for all data operations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneLoginV2 } from '@/components/pos/PhoneLoginV2';
import { CustomerDashboard } from '@/components/pos/CustomerDashboard';
import { CheckIn } from '@/components/pos/CheckIn';
import { AdminPanel } from '@/components/pos/AdminPanel';
import { useUser } from '@/hooks/useUser';
import { useCustomers, useCustomer } from '@/hooks/useCustomers';
import { usePurchases } from '@/hooks/usePurchases';
import { useSessions } from '@/hooks/useSessions';
import { usePasses, useAllPasses } from '@/hooks/usePasses';
import { usePromos, useAllPromos } from '@/hooks/usePromos';

type ViewMode = 'login' | 'customer' | 'checkin' | 'admin';

export default function POSPageV2() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useUser();
  
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [isStaffMode, setIsStaffMode] = useState(false);

  // Fetch data using our hooks
  const { customers } = useCustomers();
  const { customer: currentCustomerData } = useCustomer(user?.id || null, true);
  const { purchases } = usePurchases();
  const { sessions } = useSessions();
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
    }
  }, [profile, user]);

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentView('login');
    setIsStaffMode(false);
    router.push('/pos-v2');
  };

  const handleAdminAccess = () => {
    setCurrentView('admin');
  };

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
      {/* Header - Hidden on login screen */}
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
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setCurrentView('checkin')}
                      variant={currentView === 'checkin' ? 'default' : 'outline'}
                      size="sm"
                    >
                      ✅ Check In
                    </Button>
                    <Button
                      onClick={() => setCurrentView('customer')}
                      variant={currentView === 'customer' ? 'default' : 'outline'}
                      size="sm"
                    >
                      👤 My Account
                    </Button>
                  </div>
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

        {currentView === 'customer' && currentCustomerData && (
          <CustomerDashboard
            customer={currentCustomerData}
            onUpdateCustomer={() => {
              // Data will auto-refresh via SWR
            }}
          />
        )}

        {currentView === 'checkin' && (
          <CheckIn
            customers={customers || []}
            currentCustomer={currentCustomerData || null}
            isStaffMode={isStaffMode}
            onUpdateCustomer={() => {
              // Data will auto-refresh via SWR
            }}
          />
        )}

        {currentView === 'admin' && isStaffMode && (
          <AdminPanel
            customers={customers || []}
            onUpdateCustomers={() => {}}
            promos={promos || []}
            onUpdatePromos={() => {}}
            passes={passes || []}
            onUpdatePasses={() => {}}
            parties={[]}
            onUpdateParties={() => {}}
            products={[]}
            onUpdateProducts={() => {}}
            volumeDiscounts={[]}
            onUpdateVolumeDiscounts={() => {}}
          />
        )}
      </div>
    </div>
  );
}

// Import Button component for the file
import { Button } from '@/components/ui/Button';

