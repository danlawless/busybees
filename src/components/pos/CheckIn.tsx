'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PartySchedulingModal } from './PartySchedulingModal';
import { SuccessModal } from '@/components/ui/SuccessModal';



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
  // Party scheduling fields
  partyDate?: string;
  partyStartTime?: string;
  partyEndTime?: string;
  partyGuests?: number;
  partyNotes?: string;
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
  const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string>('');
  const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Purchase | null>(null);
  const [showPartyScheduling, setShowPartyScheduling] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({
    title: '',
    message: '',
    details: {} as any
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeout) {
        clearTimeout(confirmTimeout);
      }
    };
  }, [confirmTimeout]);

  // Available products for quick purchase
  const AVAILABLE_PRODUCTS = [
    {
      id: 'day_pass',
      name: 'Single Day Pass',
      price: 15.99,
      description: '1 day of unlimited play',
      sessions: 1,
      validity: '1 day'
    },
    {
      id: 'weekly_pass',
      name: 'Weekly Pass',
      price: 49.99,
      description: '7 days of unlimited play',
      sessions: 999,
      validity: '7 days'
    },
    {
      id: 'monthly_pass',
      name: 'Monthly Unlimited Pass',
      price: 89.99,
      description: '30 days of unlimited play',
      sessions: 999,
      validity: '30 days'
    },
    {
      id: 'party_package',
      name: 'Party Package',
      price: 199.99,
      description: 'Special event package',
      sessions: 1,
      validity: '1 day'
    }
  ];

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

    // Handle party packages specially
    if (purchase.type === 'party_package') {
      if (!purchase.partyDate || !purchase.partyStartTime) {
        // Show party scheduling modal for unscheduled parties
        setSelectedParty(purchase);
        setShowPartyScheduling(true);
        return;
      }
      
      // Check if party is within ±30 minute check-in window
      const now = new Date();
      const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
      const timeDifference = partyDateTime.getTime() - now.getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (Math.abs(timeDifference) > thirtyMinutes) {
        // Show party details modal with timing information
        setSelectedParty(purchase);
        setShowPartyModal(true);
        return;
      }
      
      // Within check-in window, show confirmation
      setConfirmingPurchase(purchase);
      setShowConfirmDialog(true);
      return;
    }

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

  const handlePartySchedule = (partyData: {
    partyDate: string;
    partyStartTime: string;
    partyEndTime: string;
    partyGuests: number;
    partyNotes: string;
  }) => {
    if (!selectedParty) return;
    
    const customer = selectedCustomer || currentCustomer;
    if (!customer) return;

    // Calculate new price if guests exceed 15
    let newPrice = selectedParty.price;
    if (partyData.partyGuests > 15) {
      const basePrice = selectedParty.name.includes('Private') ? 425 : 350;
      newPrice = basePrice + (partyData.partyGuests - 15) * 12;
    }

    const updatedPurchases = customer.purchases.map(p => {
      if (p.id === selectedParty.id) {
        return {
          ...p,
          partyDate: partyData.partyDate,
          partyStartTime: partyData.partyStartTime,
          partyEndTime: partyData.partyEndTime,
          partyGuests: partyData.partyGuests,
          partyNotes: partyData.partyNotes,
          price: newPrice
        };
      }
      return p;
    });

    const updatedCustomer = {
      ...customer,
      purchases: updatedPurchases
    };

    onUpdateCustomer(updatedCustomer);
    
    // Close scheduling modal and show success
    setShowPartyScheduling(false);
    setSelectedParty(null);
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    setSuccessDetails({
      title: '🎉 Party Scheduled Successfully!',
      message: `Your ${selectedParty.name} has been scheduled and is ready for check-in when the time arrives.`,
      details: {
        date: partyData.partyDate,
        time: `${formatTime(partyData.partyStartTime)} - ${formatTime(partyData.partyEndTime)}`,
        guests: partyData.partyGuests,
        price: newPrice,
        type: selectedParty.name
      }
    });
    setShowSuccessModal(true);
  };

  const handleQuickPurchase = (productId: string) => {
    // Clear any existing timeout
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
    }

    // Set confirmation state
    setConfirmingProduct(productId);
    
    // Set timeout to reset confirmation after 5 seconds
    const timeout = setTimeout(() => {
      setConfirmingProduct(null);
    }, 5000);
    
    setConfirmTimeout(timeout);
  };

  const handleConfirmPurchase = async (productId: string) => {
    const customer = selectedCustomer || currentCustomer;
    if (!customer) return;

    const product = AVAILABLE_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // Clear confirmation state and timeout
    setConfirmingProduct(null);
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
      setConfirmTimeout(null);
    }

    setPurchasingProduct(productId);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create unique purchase ID
      const purchaseId = `p${Date.now()}_${productId}_${Math.random().toString(36).substr(2, 9)}`;

      // Map product type correctly
      let purchaseType: Purchase['type'];
      if (productId.includes('party')) {
        purchaseType = 'party_package';
      } else if (productId.includes('day')) {
        purchaseType = 'day_pass';
      } else if (productId.includes('weekly')) {
        purchaseType = 'weekly_pass';
      } else {
        purchaseType = 'monthly_pass';
      }

      // Set initial expiry date (for booking/purchase validity)
      let expiryDate: string | undefined;
      if (productId.includes('monthly')) {
        expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year to start using
      } else if (productId.includes('weekly')) {
        expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days to start using
      } else if (productId.includes('day')) {
        expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days to start using
      } else if (productId.includes('party')) {
        expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days to book
      }

      const newPurchase: Purchase = {
        id: purchaseId,
        type: purchaseType,
        name: product.name,
        price: product.price,
        purchaseDate: new Date().toISOString(),
        expiryDate,
        usedSessions: 0,
        totalSessions: product.sessions,
        status: 'active',
        // Explicitly ensure new purchases have no firstUseDate
        firstUseDate: undefined,
        actualExpiryDate: undefined
      };

      const updatedCustomer = {
        ...customer,
        purchases: [...customer.purchases, newPurchase]
      };

      onUpdateCustomer(updatedCustomer);
      setPurchaseSuccess(`✅ ${product.name} purchased successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setPurchaseSuccess(''), 3000);
      
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchasingProduct(null);
    }
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

  const isPartyCheckInAvailable = (purchase: Purchase) => {
    if (purchase.type !== 'party_package' || !purchase.partyDate || !purchase.partyStartTime) {
      return false;
    }
    
    const now = new Date();
    const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
    const timeDifference = partyDateTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Allow check-in within ±30 minutes of party start time
    return Math.abs(timeDifference) <= thirtyMinutes;
  };

  const getPartyCheckInStatus = (purchase: Purchase) => {
    if (purchase.type !== 'party_package') return null;
    
    if (!purchase.partyDate || !purchase.partyStartTime) return 'needs_scheduling';
    
    const now = new Date();
    const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
    const timeDifference = partyDateTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (Math.abs(timeDifference) <= thirtyMinutes) {
      return 'available'; // Within ±30 minutes
    } else if (timeDifference > thirtyMinutes) {
      const hoursUntil = Math.ceil(timeDifference / (60 * 60 * 1000));
      const minutesUntil = Math.ceil(timeDifference / (60 * 1000));
      
      if (hoursUntil >= 24) {
        const daysUntil = Math.ceil(timeDifference / (24 * 60 * 60 * 1000));
        return `too_early_days:${daysUntil}`;
      } else if (hoursUntil >= 1) {
        return `too_early_hours:${hoursUntil}`;
      } else {
        return `too_early_minutes:${minutesUntil}`;
      }
    } else {
      // Party time has passed by more than 30 minutes
      return 'expired';
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
          {/* Success Message */}
          {purchaseSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg text-center">
              <p className="text-lg font-semibold">{purchaseSuccess}</p>
            </div>
          )}
          {/* Customer Header */}
          <Card className="p-8 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{displayCustomer.name}</h2>
                <p className="text-lg text-gray-700 mb-1">
                  {formatPhoneNumber(displayCustomer.phone)}
                  {displayCustomer.email && ` • ${displayCustomer.email}`}
                </p>
                <p className="text-base text-gray-600">
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
            <div className="space-y-10">
              {/* Currently Checked In Passes */}
              {(() => {
                const checkedInPasses = displayCustomer.purchases.filter(p => 
                  p.status === 'active' && 
                  (displayCustomer.activeSessions || []).some(session => session.purchaseId === p.id)
                );
                
                if (checkedInPasses.length > 0) {
                  return (
                    <div>
                      <h3 className="text-2xl font-bold mb-6 text-green-700">✅ Currently Checked In</h3>
                      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        {checkedInPasses.map((purchase) => {
                          const activeSessions = (displayCustomer.activeSessions || []).filter(session => session.purchaseId === purchase.id);
                          return (
                            <Card key={purchase.id} className="p-8 border-l-8 border-l-green-500 bg-green-50 hover:bg-green-100 transition-colors">
                              <div className="flex flex-col items-center text-center space-y-4">
                                <div className="flex-1">
                                  <h4 className="text-2xl font-bold text-gray-900 mb-3">{purchase.name}</h4>
                                  {activeSessions.length > 0 && (
                                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg mb-4">
                                      <p className="text-lg text-green-800 font-bold">✅ Checked In</p>
                                      <p className="text-sm text-green-700 mt-1">
                                        Since {new Date(activeSessions[0].startTime).toLocaleTimeString()}
                                      </p>
                                      <p className="text-sm text-green-700">
                                        Duration: {getSessionDuration(activeSessions[0].startTime)}
                                      </p>
                                    </div>
                                  )}
                                  {/* Expiration & Auto-Renew Info */}
                                  {purchase.actualExpiryDate && (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                                      <p className="text-sm text-gray-600">
                                        Expires: {formatDate(purchase.actualExpiryDate)}
                                        {purchase.autoRenew && (
                                          <span className="ml-2 text-blue-600 font-bold">🔄 Auto-Renew</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  onClick={() => handleCheckOut(displayCustomer, activeSessions[activeSessions.length - 1].id)}
                                  size="lg"
                                  variant="outline"
                                  className="bg-white hover:bg-gray-50 text-xl px-10 py-5 min-w-[200px] font-bold border-2 border-gray-300"
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
                
                return (
                  <div>
                    <h3 className="text-2xl font-bold mb-6">🎫 Available Passes</h3>
                    {availablePasses.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        {availablePasses.map((purchase) => (
                          <Card key={purchase.id} className="p-8 border-l-8 border-l-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                            <div className="flex flex-col items-center text-center space-y-4">
                              <div className="flex-1">
                                <h4 className="text-2xl font-bold text-gray-900 mb-3">{purchase.name}</h4>
                                {purchase.type === 'party_package' && purchase.partyDate ? (
                                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-lg text-purple-700 font-bold mb-2">🎉 Party Scheduled</p>
                                    <p className="text-sm text-purple-600 mb-1">
                                      📅 {formatDate(purchase.partyDate)}
                                    </p>
                                    {purchase.partyStartTime && (
                                      <p className="text-sm text-purple-600 mb-1">
                                        ⏰ {(() => {
                                          const [hours, minutes] = purchase.partyStartTime.split(':');
                                          const hour = parseInt(hours);
                                          const ampm = hour >= 12 ? 'PM' : 'AM';
                                          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                          return `${displayHour}:${minutes} ${ampm}`;
                                        })()}
                                        {purchase.partyEndTime && ` - ${(() => {
                                          const [hours, minutes] = purchase.partyEndTime.split(':');
                                          const hour = parseInt(hours);
                                          const ampm = hour >= 12 ? 'PM' : 'AM';
                                          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                          return `${displayHour}:${minutes} ${ampm}`;
                                        })()}`}
                                      </p>
                                    )}
                                    {purchase.partyGuests && (
                                      <p className="text-sm text-purple-600">👥 {purchase.partyGuests} guests</p>
                                    )}
                                  </div>
                                ) : !purchase.firstUseDate ? (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-lg text-blue-600 font-bold">✨ Ready to Use!</p>
                                    {purchase.autoRenew && (
                                      <p className="text-sm text-blue-600 mt-1">🔄 Auto-Renew enabled</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-lg text-green-600 font-bold">✅ Active Pass</p>
                                    {purchase.actualExpiryDate && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Expires: {formatDate(purchase.actualExpiryDate)}
                                      </p>
                                    )}
                                    {purchase.autoRenew && (
                                      <p className="text-sm text-green-600 mt-1">🔄 Auto-Renew enabled</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              {(() => {
                                if (purchase.type === 'party_package') {
                                  const partyStatus = getPartyCheckInStatus(purchase);
                                  
                                  if (partyStatus === 'needs_scheduling') {
                                    return (
                                      <Button
                                        onClick={() => handleUsePassClick(displayCustomer, purchase.id)}
                                        size="lg"
                                        className="text-xl px-10 py-5 min-w-[200px] bg-purple-600 hover:bg-purple-700 font-bold"
                                      >
                                        🗓️ Need Scheduling
                                      </Button>
                                    );
                                  } else if (partyStatus === 'available') {
                                    return (
                                      <Button
                                        onClick={() => handleUsePassClick(displayCustomer, purchase.id)}
                                        size="lg"
                                        className="text-xl px-10 py-5 min-w-[200px] bg-green-600 hover:bg-green-700 font-bold"
                                      >
                                        🎉 Check In Party
                                      </Button>
                                    );
                                  } else if (partyStatus?.startsWith('too_early')) {
                                    const [type, value] = partyStatus.split(':');
                                    const timeText = type === 'too_early_days' ? `${value} day${value !== '1' ? 's' : ''}` :
                                                    type === 'too_early_hours' ? `${value} hour${value !== '1' ? 's' : ''}` :
                                                    `${value} minute${value !== '1' ? 's' : ''}`;
                                    
                                    return (
                                      <Button
                                        onClick={() => handleUsePassClick(displayCustomer, purchase.id)}
                                        size="lg"
                                        className="text-xl px-8 py-5 min-w-[200px] bg-orange-500 hover:bg-orange-600 font-bold"
                                        disabled={false}
                                      >
                                        ⏰ In {timeText}
                                      </Button>
                                    );
                                  } else if (partyStatus === 'expired') {
                                    return (
                                      <Button
                                        disabled
                                        size="lg"
                                        className="text-xl px-10 py-5 min-w-[200px] bg-gray-400 cursor-not-allowed font-bold"
                                      >
                                        ❌ Window Closed
                                      </Button>
                                    );
                                  }
                                }
                                
                                return (
                                  <Button
                                    onClick={() => handleUsePassClick(displayCustomer, purchase.id)}
                                    size="lg"
                                    className="text-xl px-10 py-5 min-w-[200px] bg-blue-600 hover:bg-blue-700 font-bold"
                                  >
                                    Check In
                                  </Button>
                                );
                              })()}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center border-l-8 border-l-gray-300 bg-gray-50">
                        <h4 className="text-xl font-bold mb-4">No More Available Passes</h4>
                        <p className="text-lg text-gray-600 mb-6">
                          Purchase more passes to continue enjoying Busy Bees!
                        </p>
                        
                        <div className="space-y-3">
                          <div className="grid gap-4 text-left">
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900 text-lg">🎫 Single Day Pass</span>
                                <p className="text-sm text-gray-600">1 day of unlimited play</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">$15.99</p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (confirmingProduct === 'day_pass') {
                                    handleConfirmPurchase('day_pass');
                                  } else {
                                    handleQuickPurchase('day_pass');
                                  }
                                }}
                                size="lg"
                                disabled={purchasingProduct === 'day_pass'}
                                className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${
                                  confirmingProduct === 'day_pass'
                                    ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                                    : purchasingProduct === 'day_pass'
                                    ? 'bg-blue-600'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {purchasingProduct === 'day_pass' 
                                  ? 'Processing...' 
                                  : confirmingProduct === 'day_pass' 
                                  ? '✓ Confirm Purchase' 
                                  : 'Buy Now'
                                }
                              </Button>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900 text-lg">📅 Weekly Pass</span>
                                <p className="text-sm text-gray-600">7 days of unlimited play</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">$49.99</p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (confirmingProduct === 'weekly_pass') {
                                    handleConfirmPurchase('weekly_pass');
                                  } else {
                                    handleQuickPurchase('weekly_pass');
                                  }
                                }}
                                size="lg"
                                disabled={purchasingProduct === 'weekly_pass'}
                                className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${
                                  confirmingProduct === 'weekly_pass'
                                    ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                                    : purchasingProduct === 'weekly_pass'
                                    ? 'bg-blue-600'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {purchasingProduct === 'weekly_pass' 
                                  ? 'Processing...' 
                                  : confirmingProduct === 'weekly_pass' 
                                  ? '✓ Confirm Purchase' 
                                  : 'Buy Now'
                                }
                              </Button>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900 text-lg">🗓️ Monthly Unlimited Pass</span>
                                <p className="text-sm text-gray-600">30 days of unlimited play</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">$89.99</p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (confirmingProduct === 'monthly_pass') {
                                    handleConfirmPurchase('monthly_pass');
                                  } else {
                                    handleQuickPurchase('monthly_pass');
                                  }
                                }}
                                size="lg"
                                disabled={purchasingProduct === 'monthly_pass'}
                                className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${
                                  confirmingProduct === 'monthly_pass'
                                    ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                                    : purchasingProduct === 'monthly_pass'
                                    ? 'bg-blue-600'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {purchasingProduct === 'monthly_pass' 
                                  ? 'Processing...' 
                                  : confirmingProduct === 'monthly_pass' 
                                  ? '✓ Confirm Purchase' 
                                  : 'Buy Now'
                                }
                              </Button>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900 text-lg">🎉 Party Package</span>
                                <p className="text-sm text-gray-600">Special event package</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">$199.99</p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (confirmingProduct === 'party_package') {
                                    handleConfirmPurchase('party_package');
                                  } else {
                                    handleQuickPurchase('party_package');
                                  }
                                }}
                                size="lg"
                                disabled={purchasingProduct === 'party_package'}
                                className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${
                                  confirmingProduct === 'party_package'
                                    ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                                    : purchasingProduct === 'party_package'
                                    ? 'bg-blue-600'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {purchasingProduct === 'party_package' 
                                  ? 'Processing...' 
                                  : confirmingProduct === 'party_package' 
                                  ? '✓ Confirm Purchase' 
                                  : 'Buy Now'
                                }
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <p className="text-base text-gray-600">
                            Visit <strong>My Account</strong> to purchase new passes
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                );
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

      {/* Party Details Modal */}
      {showPartyModal && selectedParty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <div className="p-8 flex-1 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">🎉 {selectedParty.name}</h2>
                    <p className="text-lg text-gray-600 mt-1">Party Details & Check-In Status</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowPartyModal(false);
                      setSelectedParty(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>

                {/* Party Information */}
                {selectedParty.partyDate && (
                  <Card className="p-6 mb-6 bg-purple-50 border-purple-200">
                    <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                      📅 Scheduled Party Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-purple-600">📅</span>
                        <div>
                          <p className="font-medium text-purple-800">Date</p>
                          <p className="text-purple-700">{formatDate(selectedParty.partyDate)}</p>
                        </div>
                      </div>
                      {selectedParty.partyStartTime && selectedParty.partyEndTime && (
                        <div className="flex items-center gap-3">
                          <span className="text-purple-600">⏰</span>
                          <div>
                            <p className="font-medium text-purple-800">Time</p>
                            <p className="text-purple-700">
                              {(() => {
                                const formatTime = (time: string) => {
                                  const [hours, minutes] = time.split(':');
                                  const hour = parseInt(hours);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                  return `${displayHour}:${minutes} ${ampm}`;
                                };
                                return `${formatTime(selectedParty.partyStartTime)} - ${formatTime(selectedParty.partyEndTime)}`;
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedParty.partyGuests && (
                        <div className="flex items-center gap-3">
                          <span className="text-purple-600">👥</span>
                          <div>
                            <p className="font-medium text-purple-800">Guests</p>
                            <p className="text-purple-700">{selectedParty.partyGuests} people</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-purple-600">💰</span>
                        <div>
                          <p className="font-medium text-purple-800">Total Price</p>
                          <p className="text-purple-700">${selectedParty.price.toFixed(2)}</p>
                        </div>
                      </div>
                      {selectedParty.partyNotes && (
                        <div className="md:col-span-2 flex items-start gap-3">
                          <span className="text-purple-600">🎨</span>
                          <div>
                            <p className="font-medium text-purple-800">Theme/Notes</p>
                            <p className="text-purple-700">{selectedParty.partyNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Check-In Status */}
                {(() => {
                  const partyStatus = getPartyCheckInStatus(selectedParty);
                  const now = new Date();
                  const partyDateTime = selectedParty.partyStartTime && selectedParty.partyDate 
                    ? new Date(`${selectedParty.partyDate}T${selectedParty.partyStartTime}`)
                    : null;
                  const timeDifference = partyDateTime ? partyDateTime.getTime() - now.getTime() : 0;
                  
                  if (partyStatus === 'needs_scheduling') {
                    return (
                      <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
                        <h3 className="text-xl font-bold text-orange-900 mb-3">🗓️ Party Not Scheduled</h3>
                        <p className="text-orange-800 mb-4">
                          This party package needs to be scheduled before it can be used for check-in.
                        </p>
                      </Card>
                    );
                  } else if (partyStatus?.startsWith('too_early')) {
                    const [type, value] = partyStatus.split(':');
                    const timeText = type === 'too_early_days' ? `${value} day${value !== '1' ? 's' : ''}` :
                                    type === 'too_early_hours' ? `${value} hour${value !== '1' ? 's' : ''}` :
                                    `${value} minute${value !== '1' ? 's' : ''}`;
                    
                    return (
                      <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
                        <h3 className="text-xl font-bold text-orange-900 mb-3">⏰ Too Early to Check In</h3>
                        <p className="text-orange-800 mb-2">
                          Check-in opens 30 minutes before your party time.
                        </p>
                        <p className="text-orange-700 text-lg font-medium">
                          Check-in available in: <span className="text-orange-900">{timeText}</span>
                        </p>
                      </Card>
                    );
                  } else if (partyStatus === 'expired') {
                    return (
                      <Card className="p-6 mb-6 bg-red-50 border-red-200">
                        <h3 className="text-xl font-bold text-red-900 mb-3">❌ Check-In Window Closed</h3>
                        <p className="text-red-800">
                          The check-in window has closed (30 minutes after party time). Please contact staff for assistance.
                        </p>
                      </Card>
                    );
                  } else if (partyStatus === 'available') {
                    return (
                      <Card className="p-6 mb-6 bg-green-50 border-green-200">
                        <h3 className="text-xl font-bold text-green-900 mb-3">🎉 Ready to Check In!</h3>
                        <p className="text-green-800">
                          Your party check-in window is now open. You can check in anytime within 30 minutes of your party time.
                        </p>
                      </Card>
                    );
                  }
                  return null;
                })()}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => {
                      setShowPartyModal(false);
                      setSelectedParty(null);
                    }}
                    variant="outline"
                    className="flex-1 text-lg py-3"
                  >
                    Close
                  </Button>
                  
                  {selectedParty.partyDate && (
                    <Button
                      onClick={() => {
                        setShowPartyModal(false);
                        setShowPartyScheduling(true);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-lg py-3"
                    >
                      📅 Reschedule Party
                    </Button>
                  )}
                  
                  {!selectedParty.partyDate && (
                    <Button
                      onClick={() => {
                        setShowPartyModal(false);
                        setShowPartyScheduling(true);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-lg py-3"
                    >
                      🗓️ Schedule Party
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Party Scheduling Modal */}
      {showPartyScheduling && selectedParty && (
        <PartySchedulingModal
          isOpen={showPartyScheduling}
          onClose={() => {
            setShowPartyScheduling(false);
            setSelectedParty(null);
          }}
          onSchedule={handlePartySchedule}
          partyPackageName={selectedParty.name}
          customerName={(selectedCustomer || currentCustomer)?.name || 'Customer'}
          existingPartyData={{
            partyDate: selectedParty.partyDate,
            partyStartTime: selectedParty.partyStartTime,
            partyEndTime: selectedParty.partyEndTime,
            partyGuests: selectedParty.partyGuests,
            partyNotes: selectedParty.partyNotes
          }}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successDetails.title}
        message={successDetails.message}
        details={successDetails.details}
      />
    </div>
  );
}
