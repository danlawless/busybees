'use client';

import { useState, useEffect } from 'react';
import { PhoneLogin } from '@/components/pos/PhoneLogin';
import { CustomerDashboard } from '@/components/pos/CustomerDashboard';
import { CheckIn } from '@/components/pos/CheckIn';
import { AdminPanel } from '@/components/pos/AdminPanel';

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  purchases: Purchase[];
  activeSessions: Session[];
  savedCards: SavedCard[];
  createdAt: string;
  lastVisit?: string;
}

interface Purchase {
  id: string;
  type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate?: string;
  firstUseDate?: string; // When the pass was first used
  actualExpiryDate?: string; // Calculated expiry from first use
  usedSessions: number;
  totalSessions: number;
  status: 'active' | 'expired' | 'used';
}

interface Session {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  autoCheckoutTime: string;
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

type ViewMode = 'login' | 'customer' | 'checkin' | 'admin';

export default function POSPage() {
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isStaffMode, setIsStaffMode] = useState(false);

  // Mock data - in production, this would come from your backend
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '1',
      phone: '5551234567',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      purchases: [
        {
          id: 'p1',
          type: 'monthly_pass',
          name: 'Monthly Unlimited Pass',
          price: 89.99,
          purchaseDate: '2024-01-01',
          expiryDate: '2024-02-01',
          usedSessions: 8,
          totalSessions: 999,
          status: 'active'
        },
        {
          id: 'p2',
          type: 'day_pass',
          name: 'Single Day Pass',
          price: 15.99,
          purchaseDate: '2023-12-15',
          usedSessions: 1,
          totalSessions: 1,
          status: 'used'
        }
      ],
      activeSessions: [],
      savedCards: [],
      createdAt: '2023-11-01',
      lastVisit: '2024-01-15'
    }
  ]);

  const handleLogin = (customer: Customer) => {
    setCurrentCustomer(customer);
    setCurrentView('customer');
  };

  const handleLogout = () => {
    setCurrentCustomer(null);
    setCurrentView('login');
  };

  const handleStaffToggle = () => {
    setIsStaffMode(!isStaffMode);
    if (!isStaffMode) {
      setCurrentView('admin');
    } else {
      setCurrentView('login');
    }
  };

  const handleCheckIn = () => {
    setCurrentView('checkin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 pos-page-static">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-2xl">🐝</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Busy Bees POS</h1>
                <p className="text-sm text-gray-600">Point of Sale & Check-in System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleStaffToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isStaffMode 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isStaffMode ? 'Exit Staff Mode' : 'Staff Mode'}
              </button>
              
              {currentCustomer && !isStaffMode && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {(currentCustomer || isStaffMode) && (
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 py-3">
              {!isStaffMode && (
                <button
                  onClick={() => setCurrentView('customer')}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'customer'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Account
                </button>
              )}
              
              <button
                onClick={() => setCurrentView('checkin')}
                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'checkin'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Check In
              </button>
              
              {isStaffMode && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'admin'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'login' && !isStaffMode && (
          <PhoneLogin 
            customers={customers}
            onLogin={handleLogin}
            onNewCustomer={(customer) => {
              setCustomers([...customers, customer]);
              handleLogin(customer);
            }}
          />
        )}

        {currentView === 'customer' && currentCustomer && (
          <CustomerDashboard 
            customer={currentCustomer}
            onUpdateCustomer={(updatedCustomer) => {
              setCurrentCustomer(updatedCustomer);
              setCustomers(customers.map(c => 
                c.id === updatedCustomer.id ? updatedCustomer : c
              ));
            }}
          />
        )}

        {currentView === 'checkin' && (
          <CheckIn 
            customers={customers}
            currentCustomer={currentCustomer}
            isStaffMode={isStaffMode}
            onUpdateCustomer={(updatedCustomer) => {
              if (currentCustomer?.id === updatedCustomer.id) {
                setCurrentCustomer(updatedCustomer);
              }
              setCustomers(customers.map(c => 
                c.id === updatedCustomer.id ? updatedCustomer : c
              ));
            }}
          />
        )}

        {currentView === 'admin' && isStaffMode && (
          <AdminPanel 
            customers={customers}
            onUpdateCustomers={setCustomers}
          />
        )}
      </div>
    </div>
  );
}
