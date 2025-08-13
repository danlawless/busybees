'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CountdownTimer } from './CountdownTimer';

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
  autoRenew?: boolean;
  nextRenewalDate?: string;
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

interface CheckInProps {
  customers: Customer[];
  currentCustomer: Customer | null;
  isStaffMode: boolean;
  onUpdateCustomer: (customer: Customer) => void;
}

export function CheckIn({ customers, currentCustomer, isStaffMode, onUpdateCustomer }: CheckInProps) {
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState<Purchase | null>(null);

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const getCleanPhoneNumber = (phone: string) => {
    return phone.replace(/[^\d]/g, '');
  };

  const handlePhoneSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSearchPhone(formatted);
    
    if (formatted.replace(/[^\d]/g, '').length === 10) {
      const cleanPhone = getCleanPhoneNumber(formatted);
      const foundCustomer = customers.find(c => 
        getCleanPhoneNumber(c.phone) === cleanPhone
      );
      setSelectedCustomer(foundCustomer || null);
    } else {
      setSelectedCustomer(null);
    }
  };

  const calculateActualExpiry = (type: Purchase['type'], firstUseDate: string): string => {
    const firstUse = new Date(firstUseDate);
    
    switch (type) {
      case 'day_pass':
        // Expires 12 hours after first use
        return new Date(firstUse.getTime() + 12 * 60 * 60 * 1000).toISOString();
      case 'weekly_pass':
        // Expires 7 days after first use
        return new Date(firstUse.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly_pass':
        // Expires 30 days after first use
        return new Date(firstUse.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'party_package':
        // Party packages are single use, expire immediately
        return firstUseDate;
      default:
        return new Date(firstUse.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const handleCheckIn = (customer: Customer, purchaseId: string) => {
    console.log('Checking in with pass ID:', purchaseId);
    const now = new Date();
    const nowIso = now.toISOString();
    
    // Create new session with 12-hour auto-checkout
    const autoCheckoutTime = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    
    const newSession: Session = {
      id: `s${Date.now()}`,
      customerId: customer.id,
      purchaseId,
      startTime: nowIso,
      autoCheckoutTime
    };

    const updatedPurchases = customer.purchases.map(p => {
      if (p.id === purchaseId) {
        const newUsedSessions = p.usedSessions + 1;
        const isFirstUse = !p.firstUseDate;
        
        console.log(`Check-in with ${p.name}: ${p.usedSessions} -> ${newUsedSessions}`);
        
        // Calculate actual expiry on first use
        let actualExpiryDate = p.actualExpiryDate;
        let firstUseDate = p.firstUseDate;
        let nextRenewalDate = p.nextRenewalDate;
        
        if (isFirstUse) {
          firstUseDate = nowIso;
          actualExpiryDate = calculateActualExpiry(p.type, nowIso);
          console.log(`First use! Expiry set to: ${actualExpiryDate}`);
          
          // If auto-renew is enabled and no renewal date is set, calculate it now
          if (p.autoRenew && (!p.nextRenewalDate || p.nextRenewalDate.trim() === '')) {
            const expiryDate = new Date(actualExpiryDate);
            nextRenewalDate = new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            console.log(`Auto-renew enabled: Next renewal set to ${nextRenewalDate}`);
          }
        }

        const newStatus = p.totalSessions === 999 ? 
          p.status : 
          p.totalSessions === 1 ? 
          p.status : 
          (newUsedSessions >= p.totalSessions ? 'used' as const : p.status);

        return {
          ...p,
          usedSessions: newUsedSessions,
          firstUseDate,
          actualExpiryDate,
          nextRenewalDate,
          status: newStatus
        };
      }
      return p;
    });

    const updatedCustomer = {
      ...customer,
      purchases: updatedPurchases,
      activeSessions: [...(customer.activeSessions || []), newSession]
    };

    console.log('Updated customer with new session:', updatedCustomer);
    onUpdateCustomer(updatedCustomer);
  };

  const handleCheckOut = (customer: Customer, sessionId: string) => {
    console.log('Checking out session:', sessionId);
    const now = new Date().toISOString();
    
    const activeSessions = customer.activeSessions || [];
    const updatedSessions = activeSessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          endTime: now,
          duration: Math.floor((new Date(now).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)) // minutes
        };
      }
      return session;
    }).filter(session => session.id !== sessionId); // Remove the checked-out session

    const updatedCustomer = {
      ...customer,
      activeSessions: updatedSessions
    };

    console.log('Checked out session:', sessionId);
    onUpdateCustomer(updatedCustomer);
  };

  const handleUsePassClick = (customer: Customer, purchaseId: string) => {
    const purchase = customer.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    if (purchase.totalSessions === 1 && !purchase.firstUseDate) {
      // Show confirmation for single-use passes
      setConfirmingPurchase(purchase);
      setShowConfirmDialog(true);
    } else {
      // Directly check in for multi-use passes or already used passes
      handleCheckIn(customer, purchaseId);
    }
  };

  const handleConfirmUse = () => {
    if (confirmingPurchase && (selectedCustomer || currentCustomer)) {
      const customer = selectedCustomer || currentCustomer!;
      handleCheckIn(customer, confirmingPurchase.id);
    }
    setShowConfirmDialog(false);
    setConfirmingPurchase(null);
  };

  const handleCancelUse = () => {
    setShowConfirmDialog(false);
    setConfirmingPurchase(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  // Get currently active sessions
  const activeCustomers = customers.filter(c => c.activeSessions && c.activeSessions.length > 0);

  // Customer to display (selected via search or current logged-in customer)
  const displayCustomer = isStaffMode ? selectedCustomer : (currentCustomer || selectedCustomer);

  return (
    <div className="space-y-8">
      {/* Staff Search */}
      {isStaffMode && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Customer Lookup</h3>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="phone-search" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Customer Phone Number
              </label>
              <input
                type="tel"
                id="phone-search"
                value={searchPhone}
                onChange={handlePhoneSearch}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                maxLength={14}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                disabled={!selectedCustomer}
                variant="outline"
              >
                {showCustomerDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </div>
          
          {selectedCustomer && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✅ Found: <strong>{selectedCustomer.name}</strong> - {formatPhoneNumber(selectedCustomer.phone)}
              </p>
            </div>
          )}
          
          {searchPhone.replace(/[^\d]/g, '').length === 10 && !selectedCustomer && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                ❌ No customer found with this phone number
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Active Sessions Overview */}
      {isStaffMode && activeCustomers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Currently Checked In ({activeCustomers.length})</h3>
          <div className="space-y-3">
            {activeCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatPhoneNumber(customer.phone)} • 
                    Checked in at {formatTime(customer.activeSessions![0].startTime)} • 
                    Duration: {getSessionDuration(customer.activeSessions![0].startTime)}
                    {customer.activeSessions!.length > 1 && (
                      <span className="ml-2 text-blue-600">
                        +{customer.activeSessions!.length - 1} more sessions
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => handleCheckOut(customer, customer.activeSessions![0].id)}
                  size="sm"
                  variant="outline"
                >
                  Check Out
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer Check-in Interface */}
      {displayCustomer && (
        <div className="space-y-6">
          {/* Customer Header */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{displayCustomer.name}</h2>
                <p className="text-gray-600">
                  {formatPhoneNumber(displayCustomer.phone)}
                  {displayCustomer.email && ` • ${displayCustomer.email}`}
                </p>
                <p className="text-sm text-gray-500">
                  Member since {formatDate(displayCustomer.createdAt)}
                  {displayCustomer.lastVisit && ` • Last visit: ${formatDate(displayCustomer.lastVisit)}`}
                </p>
              </div>
              
              {displayCustomer.activeSessions && displayCustomer.activeSessions.length > 0 && (
                <div className="text-right">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                    <p className="font-semibold">✅ Currently Checked In ({displayCustomer.activeSessions.length})</p>
                    <p className="text-sm">
                      Since {formatTime(displayCustomer.activeSessions[0].startTime)}
                    </p>
                    <p className="text-sm">
                      Duration: {getSessionDuration(displayCustomer.activeSessions[0].startTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Pass Management */}
            <div className="space-y-6">
              {/* Currently Checked In Passes */}
              {(() => {
                const checkedInPasses = displayCustomer.purchases.filter(p => 
                  p.status === 'active' && 
                  (displayCustomer.activeSessions || []).some(session => session.purchaseId === p.id)
                );
                
                if (checkedInPasses.length > 0) {
                  return (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 text-green-700">✅ Currently Checked In</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {checkedInPasses.map((purchase) => {
                          const activeSessions = (displayCustomer.activeSessions || []).filter(session => session.purchaseId === purchase.id);
                          return (
                            <Card key={purchase.id} className="p-4 border-l-4 border-l-green-500 bg-green-50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{purchase.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    Sessions: {purchase.totalSessions === 999 ? '∞ Unlimited' : `${purchase.usedSessions}/${purchase.totalSessions}`}
                                  </p>
                                  {activeSessions.length > 0 && (
                                    <p className="text-xs text-green-600 mt-1">
                                      Since {new Date(activeSessions[0].startTime).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  onClick={() => handleCheckOut(displayCustomer, activeSessions[activeSessions.length - 1].id)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-white hover:bg-gray-50"
                                >
                                  Check Out
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Available Passes (Not Checked In) */}
              {(() => {
                const availablePasses = displayCustomer.purchases.filter(p => 
                  p.status === 'active' && 
                  !(displayCustomer.activeSessions || []).some(session => session.purchaseId === p.id)
                );
                
                if (availablePasses.length > 0) {
                  return (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">🎫 Available Passes</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {availablePasses.map((purchase) => (
                          <Card key={purchase.id} className="p-4 border-l-4 border-l-blue-400">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{purchase.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Sessions: {purchase.totalSessions === 999 ? '∞ Unlimited' : `${purchase.usedSessions}/${purchase.totalSessions}`}
                                </p>
                                {!purchase.firstUseDate && (
                                  <p className="text-xs text-blue-600 mt-1">Ready to activate!</p>
                                )}
                              </div>
                              <Button
                                onClick={() => handleUsePassClick(displayCustomer, purchase.id)}
                                size="sm"
                              >
                                Check In
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* No Passes Message */}
              {displayCustomer.purchases.filter(p => p.status === 'active').length === 0 && (
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">😔</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">No Active Passes</h4>
                  <p className="text-gray-600 mb-4">
                    This customer doesn't have any active passes available for check-in.
                  </p>
                  {isStaffMode && (
                    <p className="text-sm text-gray-500">
                      Customer needs to purchase a day pass or other admission to check in.
                    </p>
                  )}
                </Card>
              )}
            </div>

          {/* Customer Details (Staff Mode) */}
          {isStaffMode && showCustomerDetails && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Customer Details</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Purchase History */}
                <div>
                  <h4 className="font-semibold mb-3">Purchase History</h4>
                  {displayCustomer.purchases.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {displayCustomer.purchases.map((purchase) => (
                        <div key={purchase.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{purchase.name}</p>
                              <p className="text-xs text-gray-600">
                                {formatDate(purchase.purchaseDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">${purchase.price}</p>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                purchase.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : purchase.status === 'used'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {purchase.status}
                              </span>
                            </div>
                          </div>
                          {purchase.status === 'active' && (
                            <div className="mt-2 text-xs text-gray-600">
                              {purchase.totalSessions === 999 
                                ? `${purchase.usedSessions} visits used`
                                : `${purchase.usedSessions}/${purchase.totalSessions} visits used`
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No purchases yet</p>
                  )}
                </div>

                {/* Payment Methods */}
                <div>
                  <h4 className="font-semibold mb-3">Payment Methods</h4>
                  {displayCustomer.savedCards.length > 0 ? (
                    <div className="space-y-2">
                      {displayCustomer.savedCards.map((card) => (
                        <div key={card.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-5 bg-gray-300 rounded flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {card.brand.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm">•••• {card.last4}</span>
                            </div>
                            {card.isDefault && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No saved payment methods</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* No Customer Selected */}
      {!displayCustomer && !isStaffMode && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐝</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Ready to Check In?</h3>
          <p className="text-gray-600">
            Please log in to your account first to access your passes and check in.
          </p>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {confirmingPurchase.totalSessions === 1 ? 'Use Single-Use Pass?' : 'Activate Pass?'}
              </h3>
              <p className="text-gray-600 mb-4">
                {confirmingPurchase.totalSessions === 1 ? 
                  `This ${confirmingPurchase.name} can only be used once. Once activated, it will expire in ${
                    confirmingPurchase.type === 'day_pass' ? '12 hours' : 
                    confirmingPurchase.type === 'weekly_pass' ? '7 days' : 
                    confirmingPurchase.type === 'monthly_pass' ? '30 days' : 
                    'the specified time'
                  }.` :
                  `Are you ready to start using your ${confirmingPurchase.name}?`
                }
              </p>
              
              <div className="flex space-x-4">
                <Button
                  onClick={handleCancelUse}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmUse}
                  className={`flex-1 ${confirmingPurchase?.totalSessions === 1 ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {confirmingPurchase?.totalSessions === 1 ? 'Yes, Use Pass' : 'Yes, Activate Pass'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
