'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  // Inactivity timeout states
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const [inactivityCountdown, setInactivityCountdown] = useState(30); // Tracks time until warning appears
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);

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
    setCurrentView('checkin'); // Automatically go to Check In screen
  };

  const handleLogout = () => {
    setCurrentCustomer(null);
    setCurrentView('login');
  };

  const handleStaffToggle = () => {
    if (isStaffMode) {
      // Exit staff mode immediately
      setIsStaffMode(false);
      setCurrentView('login');
    } else {
      // Show PIN modal to enter staff mode
      setShowPinModal(true);
      setPin('');
      setPinError('');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      setIsStaffMode(true);
      setCurrentView('admin');
      setShowPinModal(false);
      setPin('');
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPin('');
    setPinError('');
  };

  // Handle auto-logout
  const handleAutoLogout = () => {
    setCurrentCustomer(null);
    setCurrentView('login');
    setShowInactivityWarning(false);
    setCountdownSeconds(30);
    setInactivityCountdown(30);
  };

  // Resume session (dismiss warning and restart timer)
  const handleResumeSession = () => {
    setShowInactivityWarning(false);
    setCountdownSeconds(30);
    setInactivityCountdown(30);
  };

  // Inactivity management
  useEffect(() => {
    // Only track inactivity for logged-in customers (not staff mode)
    if (!currentCustomer || isStaffMode) {
      // Clear any existing timers
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
      if (countdownTimer) clearTimeout(countdownTimer);
      setInactivityTimer(null);
      setWarningTimer(null);
      setCountdownTimer(null);
      setShowInactivityWarning(false);
      setCountdownSeconds(30);
      setInactivityCountdown(30);
      return;
    }

    let activityTimer: NodeJS.Timeout;
    let warningCountdown: NodeJS.Timeout;
    let inactivityCountdownTimer: NodeJS.Timeout;

    const startInactivityTimer = () => {
      // Clear any existing timers
      if (activityTimer) clearTimeout(activityTimer);
      if (warningCountdown) clearTimeout(warningCountdown);
      if (inactivityCountdownTimer) clearTimeout(inactivityCountdownTimer);

      // Start inactivity countdown from 30 seconds
      let inactivitySeconds = 30;
      setInactivityCountdown(inactivitySeconds);
      
      inactivityCountdownTimer = setInterval(() => {
        inactivitySeconds--;
        setInactivityCountdown(inactivitySeconds);
        
        if (inactivitySeconds <= 0) {
          clearInterval(inactivityCountdownTimer);
        }
      }, 1000);

      // Set 30-second timer for warning
      activityTimer = setTimeout(() => {
        setShowInactivityWarning(true);
        
        // Start logout countdown immediately when warning shows
        let seconds = 30;
        setCountdownSeconds(seconds);
        
        // Start countdown immediately - first tick happens right away
        const countdownTick = () => {
          seconds--;
          setCountdownSeconds(seconds);
          
          if (seconds <= 0) {
            handleAutoLogout();
            return;
          }
          
          // Schedule next tick
          setTimeout(countdownTick, 1000);
        };
        
        // Start first tick immediately
        setTimeout(countdownTick, 0);
        
      }, 30000); // 30 seconds
    };

    const handleActivity = () => {
      if (!showInactivityWarning) {
        startInactivityTimer();
      }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start initial timer
    startInactivityTimer();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (activityTimer) clearTimeout(activityTimer);
      if (warningCountdown) clearInterval(warningCountdown);
      if (inactivityCountdownTimer) clearInterval(inactivityCountdownTimer);
    };
  }, [currentCustomer, isStaffMode, showInactivityWarning]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSettingsDropdown && !target.closest('.settings-dropdown')) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 pos-page-static">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={handleStaffToggle}
              className="flex items-center space-x-4 hover:bg-gray-50 rounded-lg p-2 transition-colors group"
              title={isStaffMode ? "Exit Staff Mode" : "Click to enable Staff Mode"}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isStaffMode 
                  ? 'bg-red-400 group-hover:bg-red-500' 
                  : 'bg-yellow-400 group-hover:bg-yellow-500'
              }`}>
                <span className="text-2xl">{isStaffMode ? '👨‍💼' : '🐝'}</span>
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors ${
                  isStaffMode ? 'text-red-700' : 'text-gray-900'
                }`}>
                  Busy Bees POS {isStaffMode && '(Staff Mode)'}
                </h1>
                <p className={`text-sm transition-colors ${
                  isStaffMode ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {isStaffMode ? 'Staff Management System' : 'Point of Sale & Check-in System'}
                </p>
              </div>
            </button>
            
            <div className="flex items-center space-x-4">
              
              {currentCustomer && !isStaffMode && (
                <div className="relative settings-dropdown">
                  <div className="text-center">
                    <button
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                      <span className={`transform transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                      {inactivityCountdown}s
                    </div>
                  </div>
                  
                  {/* Settings Dropdown */}
                  {showSettingsDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setCurrentView('checkin');
                            setShowSettingsDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                            currentView === 'checkin' 
                              ? 'text-yellow-700 bg-yellow-50 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span>✅</span>
                          <span>Check In</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('customer');
                            setShowSettingsDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                            currentView === 'customer' 
                              ? 'text-yellow-700 bg-yellow-50 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span>👤</span>
                          <span>My Account</span>
                        </button>
                        <hr className="my-1 border-gray-200" />
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowSettingsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>🚪</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Hidden for customer mode, only show admin panel for staff */}
      {isStaffMode && (
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 py-3">
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

      {/* PIN Authentication Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Access Required</h2>
              <p className="text-gray-600">Enter PIN to access Staff Mode</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 tracking-widest"
                  maxLength={4}
                  autoFocus
                />
              </div>
              
              {pinError && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">
                  {pinError}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePinCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Enter
                </button>
              </div>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Staff members only • Authorized access required
            </div>
          </div>
        </div>
      )}

      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-orange-400">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⏰</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Timeout Warning</h2>
              <p className="text-gray-600 mb-4">
                Your session will automatically end due to inactivity.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 font-bold text-lg">
                  Auto-logout in: <span className="text-2xl text-orange-600">{countdownSeconds}</span> seconds
                </p>
              </div>
              <p className="text-sm text-gray-500">
                This helps ensure the next customer can use the system.
              </p>
            </div>

                              <div className="flex space-x-3">
                    <button
                      onClick={handleAutoLogout}
                      className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      🏠 Start New Session
                    </button>
                    <button
                      onClick={handleResumeSession}
                      className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      ⚡ Resume Session
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-xs text-gray-400 font-mono">
                      {countdownSeconds}s remaining
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Self-serve mode • Automatic session management
                  </div>
          </div>
        </div>
      )}
    </div>
  );
}
