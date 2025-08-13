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
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentSuccessDetails, setPaymentSuccessDetails] = useState({ cardBrand: '', last4: '', saved: false });
  
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
    // Clear the warning modal and reset counters
    setShowInactivityWarning(false);
    setCountdownSeconds(30);
    setInactivityCountdown(30);
    
    // Trigger a synthetic activity event after the warning is cleared
    // This will cause handleActivity to restart the timer since warning is now false
    // The startInactivityTimer function will clear all existing timers including warningCountdown
    setTimeout(() => {
      const syntheticEvent = new MouseEvent('mousedown', { bubbles: true });
      document.dispatchEvent(syntheticEvent);
    }, 50); // Slightly longer delay to ensure state update
  };

  // Payment method management
  const handleAddPaymentMethod = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      alert('Please fill in all card details.');
      return;
    }

    if (!currentCustomer) return;

    setProcessingPayment(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const cardBrand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'Card';
      const last4 = cardNumber.slice(-4);

      if (saveCard) {
        // Create new saved card
        const newCard = {
          id: `card_${Date.now()}`,
          last4: last4,
          brand: cardBrand,
          expiryMonth: parseInt(expiryDate.split('/')[0]),
          expiryYear: parseInt('20' + expiryDate.split('/')[1]),
          isDefault: currentCustomer.savedCards.length === 0, // Make it default if it's the first card
        };

        const updatedCustomer = {
          ...currentCustomer,
          savedCards: [...currentCustomer.savedCards, newCard]
        };

        setCurrentCustomer(updatedCustomer);
      }

      // Set success details for modal
      setPaymentSuccessDetails({
        cardBrand: cardBrand,
        last4: last4,
        saved: saveCard
      });

      // Reset form
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardholderName('');
      setShowPaymentModal(false);
      setProcessingPayment(false);

      // Show success modal
      setShowPaymentSuccessModal(true);

    } catch (error) {
      setProcessingPayment(false);
      alert('Error processing payment method. Please try again.');
    }
  };

  const handleSetDefaultCard = (cardId: string) => {
    if (!currentCustomer) return;

    const updatedCards = currentCustomer.savedCards.map(card => ({
      ...card,
      isDefault: card.id === cardId
    }));

    const updatedCustomer = {
      ...currentCustomer,
      savedCards: updatedCards
    };

    setCurrentCustomer(updatedCustomer);
    setShowPaymentDropdown(false);
  };

  const handleClosePaymentModal = () => {
    if (processingPayment) return; // Prevent closing during processing
    
    setShowPaymentModal(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setSaveCard(true);
  };

  const getDefaultCard = () => {
    if (!currentCustomer) return null;
    return currentCustomer.savedCards.find(card => card.isDefault) || currentCustomer.savedCards[0] || null;
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
        
        // Use a proper interval that can be cleared
        warningCountdown = setInterval(() => {
          seconds--;
          setCountdownSeconds(seconds);
          
          if (seconds <= 0) {
            clearInterval(warningCountdown);
            handleAutoLogout();
          }
        }, 1000);
        
      }, 30000); // 30 seconds
    };

    const handleActivity = () => {
      // Only restart the timer if the warning is not currently showing
      // When warning is showing, user must explicitly click Resume or Start New Session
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSettingsDropdown && !target.closest('.settings-dropdown')) {
        setShowSettingsDropdown(false);
      }
      if (showPaymentDropdown && !target.closest('.payment-dropdown')) {
        setShowPaymentDropdown(false);
      }
    };

    if (showSettingsDropdown || showPaymentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown, showPaymentDropdown]);

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
                <>
                  {/* Inactivity Timer */}
                  <div className="text-xs text-gray-400 font-mono">
                    {inactivityCountdown}s
                  </div>

                  {/* Payment Method Selector */}
                  <div className="relative payment-dropdown">
                    <button
                      onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <span>💳</span>
                      <span>
                        {(() => {
                          const defaultCard = getDefaultCard();
                          return defaultCard 
                            ? `${defaultCard.brand} •••• ${defaultCard.last4}`
                            : 'Add Payment';
                        })()}
                      </span>
                      <span className={`transform transition-transform ${showPaymentDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {/* Payment Dropdown */}
                    {showPaymentDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-2">
                          {/* Existing Cards */}
                          {currentCustomer.savedCards.length > 0 && (
                            <>
                              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Saved Cards
                              </div>
                              {currentCustomer.savedCards.map((card) => (
                                <button
                                  key={card.id}
                                  onClick={() => handleSetDefaultCard(card.id)}
                                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center justify-between ${
                                    card.isDefault ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <span>💳</span>
                                    <div>
                                      <div className="font-medium">
                                        {card.brand} •••• {card.last4}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Expires {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear.toString().slice(-2)}
                                      </div>
                                    </div>
                                  </div>
                                  {card.isDefault && (
                                    <span className="text-blue-600 text-xs font-medium">DEFAULT</span>
                                  )}
                                </button>
                              ))}
                              <hr className="my-2 border-gray-200" />
                            </>
                          )}
                          
                          {/* Add New Card */}
                          <button
                            onClick={() => {
                              setShowPaymentDropdown(false);
                              setShowPaymentModal(true);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                          >
                            <span>➕</span>
                            <span>Add New Payment Method</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings Dropdown */}
                  <div className="relative settings-dropdown">
                    <button
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                      <span className={`transform transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                  
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
                </>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Payment Method</h2>
              <p className="text-gray-600">Enter your card details to make purchases</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddPaymentMethod(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={processingPayment}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 16) {
                      setCardNumber(value);
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  disabled={processingPayment}
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 4);
                      }
                      if (value.length <= 5) {
                        setExpiryDate(value);
                      }
                    }}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    disabled={processingPayment}
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        setCvv(value);
                      }
                    }}
                    placeholder="123"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    disabled={processingPayment}
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="saveCard"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={processingPayment}
                />
                <label htmlFor="saveCard" className="text-sm text-gray-700">
                  I'd like to store this card for future payments
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  disabled={processingPayment}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment || !cardNumber || !expiryDate || !cvv || !cardholderName}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {processingPayment ? '💳 Processing...' : saveCard ? '💾 Save Card' : '✓ Add Payment'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-xs text-gray-500 text-center">
              🔒 Your payment information is secure and encrypted
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✅</span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {paymentSuccessDetails.saved ? 'Payment Method Added!' : 'Payment Processed!'}
              </h2>
              
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center space-x-2 text-blue-800">
                    <span className="text-xl">💳</span>
                    <span className="font-medium">
                      {paymentSuccessDetails.cardBrand} •••• {paymentSuccessDetails.last4}
                    </span>
                  </div>
                  {paymentSuccessDetails.saved && (
                    <p className="text-sm text-blue-600 mt-2">
                      Saved as {currentCustomer?.savedCards.length === 1 ? 'your default' : 'a new'} payment method
                    </p>
                  )}
                </div>
                
                <p className="text-gray-600 mb-2">
                  {paymentSuccessDetails.saved 
                    ? 'Thank you for adding your payment method! You can now make purchases quickly and easily.'
                    : 'Thank you for your payment! Your transaction has been processed successfully.'
                  }
                </p>
                
                <p className="text-sm text-gray-500">
                  🐝 We appreciate your business at Busy Bees!
                </p>
              </div>

              <button
                onClick={() => setShowPaymentSuccessModal(false)}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Welcome to Busy Bees!
              </button>
              
              <div className="mt-4 text-xs text-gray-400 text-center">
                🔒 Your payment information is secure and encrypted
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
