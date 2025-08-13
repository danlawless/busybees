'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CountdownTimer } from './CountdownTimer';
import { PartySchedulingModal } from './PartySchedulingModal';
import { SuccessModal } from '@/components/ui/SuccessModal';

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  purchases: Purchase[];
  activeSessions: Session[]; // Multiple active sessions for different passes
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
  partyDate?: string; // Scheduled party date
  partyStartTime?: string; // Scheduled party start time
  partyEndTime?: string; // Scheduled party end time
  partyGuests?: number; // Number of party guests
  partyNotes?: string; // Special party notes/theme
}

interface Session {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  autoCheckoutTime: string; // When this session will auto-checkout (12 hours from start)
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface CustomerDashboardProps {
  customer: Customer;
  onUpdateCustomer: (customer: Customer) => void;
}

const AVAILABLE_PRODUCTS = [
  {
    id: 'day_pass',
    name: 'Single Day Pass',
    price: 15.99,
    description: '1 full day of unlimited play',
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
    id: 'party_basic',
    name: 'Semi-Private Party Package',
    price: 199.99,
    description: 'Party for up to 12 kids, 2 hours',
    sessions: 1,
    validity: '90 days to book'
  },
  {
    id: 'party_premium',
    name: 'Private Party Package',
    price: 299.99,
    description: 'Party for up to 15 kids, 3 hours, decorations',
    sessions: 1,
    validity: '90 days to book'
  }
];

export function CustomerDashboard({ customer, onUpdateCustomer }: CustomerDashboardProps) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProduct, setProcessingProduct] = useState<string>('');
  const [purchaseSuccess, setPurchaseSuccess] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState<Purchase | null>(null);
  const [showAutoRenewConfirm, setShowAutoRenewConfirm] = useState<{purchaseId: string, passName: string, price: number, type: string} | null>(null);
  const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPartyScheduling, setShowPartyScheduling] = useState(false);
  const [schedulingParty, setSchedulingParty] = useState<Purchase | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  }>({ title: '', message: '' });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeout) {
        clearTimeout(confirmTimeout);
      }
    };
  }, [confirmTimeout]);

  // Mock payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Check for expired passes, auto-checkout sessions, and auto-renewals
  useEffect(() => {
    const now = new Date();
    let hasExpiredPasses = false;
    let hasExpiredSessions = false;
    const hasAutoRenewals = false;
    const newPurchases: Purchase[] = [];
    
    // Check for expired passes and auto-renewals
    const updatedPurchases = customer.purchases.map(purchase => {
      // Check for expiration
      if (purchase.status === 'active' && purchase.actualExpiryDate) {
        const expiryDate = new Date(purchase.actualExpiryDate);
        if (now > expiryDate) {
          hasExpiredPasses = true;
          return { ...purchase, status: 'expired' as const };
        }
      }

      // Temporarily disable auto-renewal logic to prevent duplicates
      // TODO: Implement proper auto-renewal with better timing control
      /*
      // Check for auto-renewal (only if nextRenewalDate is set and not empty)
      if (purchase.autoRenew && purchase.nextRenewalDate && purchase.nextRenewalDate.trim() !== '' && purchase.status === 'active') {
        const renewalDate = new Date(purchase.nextRenewalDate);
        console.log(`Checking renewal for ${purchase.name}: now=${now.toISOString()}, renewalDate=${renewalDate.toISOString()}`);
        
        // Prevent immediate renewals - must be at least 1 minute in the future when set
        const timeDiff = renewalDate.getTime() - now.getTime();
        const oneMinute = 60 * 1000;
        
        if (now >= renewalDate && timeDiff < -oneMinute) { // Only renew if it's more than 1 minute overdue
          hasAutoRenewals = true;
          console.log(`Auto-renewing ${purchase.name} for customer ${customer.name}`);
          
          // Create new purchase for renewal
          const renewalId = `r${Date.now()}_${purchase.type}_${Math.random().toString(36).substr(2, 9)}`;
          const newPurchase: Purchase = {
            id: renewalId,
            type: purchase.type,
            name: purchase.name,
            price: purchase.price,
            purchaseDate: now.toISOString(),
            expiryDate: purchase.type === 'weekly_pass' 
              ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            usedSessions: 0,
            totalSessions: purchase.totalSessions,
            status: 'active' as const,
            autoRenew: true, // Keep auto-renew enabled
          };

          newPurchases.push(newPurchase);

          // Calculate next renewal date for the new purchase
          const nextRenewalDate = purchase.type === 'weekly_pass'
            ? new Date(now.getTime() + (7 - 7) * 24 * 60 * 60 * 1000).toISOString() // Will be set properly when first used
            : new Date(now.getTime() + (30 - 7) * 24 * 60 * 60 * 1000).toISOString();

          return { 
            ...purchase, 
            autoRenew: false, // Disable on old pass
            nextRenewalDate: undefined 
          };
        }
      }
      */
      
      return purchase;
    });
    
    // Check for sessions that need auto-checkout (12 hours after check-in)
    const activeSessions = customer.activeSessions || [];
    const updatedSessions = activeSessions.filter(session => {
      const autoCheckoutTime = new Date(session.autoCheckoutTime);
      if (now > autoCheckoutTime) {
        hasExpiredSessions = true;
        console.log(`Auto-checking out session ${session.id} after 12 hours`);
        return false; // Remove expired session
      }
      return true; // Keep active session
    });
    
    if (hasExpiredPasses || hasExpiredSessions) {
      onUpdateCustomer({ 
        ...customer, 
        purchases: updatedPurchases,
        activeSessions: updatedSessions
      });
    }
  }, [customer, onUpdateCustomer]);

  const activePurchases = customer.purchases.filter(p => p.status === 'active');
  const pastPurchases = customer.purchases.filter(p => p.status !== 'active');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPartyCheckInAvailable = (purchase: Purchase) => {
    if (purchase.type !== 'party_package' || !purchase.partyDate || !purchase.partyStartTime) {
      return false;
    }
    
    const now = new Date();
    const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
    const timeDifference = partyDateTime.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    return timeDifference <= oneHour && timeDifference >= -2 * oneHour; // 1 hour before to 2 hours after
  };

  const getPartyCheckInStatus = (purchase: Purchase) => {
    if (purchase.type !== 'party_package') return null;
    
    if (!purchase.partyDate) return 'needs_scheduling';
    
    const now = new Date();
    const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
    const timeDifference = partyDateTime.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (timeDifference > oneHour) {
      const hoursUntil = Math.ceil(timeDifference / (60 * 60 * 1000));
      const minutesUntil = Math.ceil(timeDifference / (60 * 1000));
      
      if (hoursUntil >= 24) {
        const daysUntil = Math.ceil(timeDifference / (24 * 60 * 60 * 1000));
        return `too_early_days:${daysUntil}`;
      } else if (hoursUntil > 1) {
        return `too_early_hours:${hoursUntil}`;
      } else {
        return `too_early_minutes:${minutesUntil}`;
      }
    } else if (timeDifference >= -2 * oneHour) {
      return 'available';
    } else {
      return 'expired';
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const handlePurchase = (productId: string) => {
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
    // Clear confirmation state and timeout
    setConfirmingProduct(null);
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
      setConfirmTimeout(null);
    }

    // Prevent multiple simultaneous purchases
    if (isProcessing || processingProduct) return;
    
    setIsProcessing(true);
    setProcessingProduct(productId);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const product = AVAILABLE_PRODUCTS.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found:', productId);
        return;
      }

      // Create unique purchase ID to avoid duplicates
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
      // Actual usage expiry will be calculated on first use
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
      setPurchaseSuccess(product.name);
      
      // Clear success message after 5 seconds
      setTimeout(() => setPurchaseSuccess(''), 5000);
      
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProduct('');
    }
  };

  const handleAddCard = async () => {
    setIsProcessing(true);
    
    // Simulate card processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newCard: SavedCard = {
      id: `c${Date.now()}`,
      last4: cardNumber.slice(-4),
      brand: 'visa', // In reality, you'd detect this
      expiryMonth: parseInt(expiryDate.split('/')[0]),
      expiryYear: parseInt(`20${expiryDate.split('/')[1]}`),
      isDefault: customer.savedCards.length === 0
    };

    const updatedCustomer = {
      ...customer,
      savedCards: [...customer.savedCards, newCard]
    };

    onUpdateCustomer(updatedCustomer);
    setShowAddCard(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setIsProcessing(false);
  };

  const handleUsePassClick = (purchaseId: string) => {
    const purchase = customer.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // Handle party packages specially
    if (purchase.type === 'party_package') {
      if (!purchase.partyDate) {
        // Party not scheduled yet, open scheduling modal
        setSchedulingParty(purchase);
        setShowPartyScheduling(true);
        return;
      } else {
        // Check if party is within 1-hour check-in window
        const now = new Date();
        const partyDateTime = new Date(`${purchase.partyDate}T${purchase.partyStartTime}`);
        const timeDifference = partyDateTime.getTime() - now.getTime();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (timeDifference > oneHour) {
          // Too early to check in
          const hoursUntil = Math.ceil(timeDifference / (60 * 60 * 1000));
          const formatTime = (time: string) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
          };
          
          setSuccessDetails({
            title: '⏰ Too Early to Check In',
            message: `Your party is scheduled for ${formatTime(purchase.partyStartTime || '')} and check-in opens 1 hour before. Please return closer to your party time!`,
            details: {
              date: purchase.partyDate,
              time: `${formatTime(purchase.partyStartTime || '')} - ${formatTime(purchase.partyEndTime || '')}`,
              guests: purchase.partyGuests,
              type: purchase.name
            }
          });
          setShowSuccessModal(true);
          return;
        }
        
        // Within check-in window, show confirmation
        setConfirmingPurchase(purchase);
        setShowConfirmDialog(true);
        return;
      }
    }

    // Check if it's a single-use pass (day pass)
    const isSingleUse = purchase.totalSessions === 1;
    
    if (isSingleUse) {
      setConfirmingPurchase(purchase);
      setShowConfirmDialog(true);
    } else {
      // Multi-use pass, check in immediately
      handleCheckIn(purchaseId);
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

  const handleCheckIn = (purchaseId: string) => {
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

        // For unlimited passes (999 sessions), never mark as 'used'
        // For single-use passes, keep them active until they expire
        // For multi-use passes with limited sessions, mark as used when sessions are exhausted
        const newStatus = p.totalSessions === 999 ? 
          p.status : // Unlimited passes stay active
          p.totalSessions === 1 ? 
          p.status : // Single-use passes stay active until they expire
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

  const handleCheckOut = (sessionId: string) => {
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

  const handleAutoRenewToggle = (purchaseId: string) => {
    const purchase = customer.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // Only allow auto-renew for weekly and monthly passes
    if (purchase.type !== 'weekly_pass' && purchase.type !== 'monthly_pass') {
      return;
    }

    if (purchase.autoRenew) {
      // Disable auto-renew immediately
      const updatedPurchases = customer.purchases.map(p => 
        p.id === purchaseId 
          ? { ...p, autoRenew: false, nextRenewalDate: undefined }
          : p
      );

      const updatedCustomer = {
        ...customer,
        purchases: updatedPurchases
      };

      onUpdateCustomer(updatedCustomer);
    } else {
      // Show confirmation dialog for enabling auto-renew
      setShowAutoRenewConfirm({
        purchaseId,
        passName: purchase.name,
        price: purchase.price,
        type: purchase.type
      });
    }
  };

  const handleConfirmAutoRenew = () => {
    if (!showAutoRenewConfirm) return;

    const { purchaseId } = showAutoRenewConfirm;
    const purchase = customer.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // Calculate next renewal date (7 days before expiry for buffer)
    let nextRenewalDate: string;
    if (purchase.actualExpiryDate) {
      // Pass is already used, calculate renewal based on actual expiry
      const expiryDate = new Date(purchase.actualExpiryDate);
      nextRenewalDate = new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Pass not used yet - don't set a renewal date until first use
      // The renewal date will be calculated when the pass is first used
      nextRenewalDate = '';
    }

    const updatedPurchases = customer.purchases.map(p => 
      p.id === purchaseId 
        ? { ...p, autoRenew: true, nextRenewalDate }
        : p
    );

    const updatedCustomer = {
      ...customer,
      purchases: updatedPurchases
    };

    onUpdateCustomer(updatedCustomer);
    setShowAutoRenewConfirm(null);
  };

  const handleConfirmUse = () => {
    if (confirmingPurchase) {
      handleCheckIn(confirmingPurchase.id);
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
    if (!schedulingParty) return;

    // Update the party package with scheduling information
    const updatedPurchases = customer.purchases.map(p => 
      p.id === schedulingParty.id 
        ? { 
            ...p, 
            ...partyData,
            // Update price if more guests
            price: partyData.partyGuests > 15 
              ? p.price + ((partyData.partyGuests - 15) * 12)
              : p.price
          }
        : p
    );

    const updatedCustomer = {
      ...customer,
      purchases: updatedPurchases
    };

    onUpdateCustomer(updatedCustomer);
    setShowPartyScheduling(false);
    setSchedulingParty(null);

    // Show success modal
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    setSuccessDetails({
      title: '🎉 Party Scheduled!',
      message: 'Your party has been successfully scheduled! All the details have been saved and you\'re all set for the big day.',
      details: {
        date: partyData.partyDate,
        time: `${formatTime(partyData.partyStartTime)} - ${formatTime(partyData.partyEndTime)}`,
        guests: partyData.partyGuests,
        price: partyData.partyGuests > 15 
          ? schedulingParty.price + ((partyData.partyGuests - 15) * 12)
          : schedulingParty.price,
        type: schedulingParty.name
      }
    });
    setShowSuccessModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {customer.name}! 🐝</h2>
        <p className="text-yellow-100">
          Member since {formatDate(customer.createdAt)}
          {customer.lastVisit && ` • Last visit: ${formatDate(customer.lastVisit)}`}
        </p>
      </div>

      {/* Purchase Success Alert */}
      {purchaseSuccess && (
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">🎉 Purchase Successful!</h3>
              <p className="text-green-600">
                {purchaseSuccess} has been added to your account and is ready to use!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Passes */}
      {activePurchases.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Your Active Passes</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activePurchases.map((purchase) => (
              <Card key={purchase.id} className="p-6 border-l-4 border-l-green-400">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{purchase.name}</h4>
                    <p className="text-gray-600">
                      {purchase.totalSessions === 999 ? 'Unlimited' : 
                       `${purchase.totalSessions - purchase.usedSessions} visits remaining`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                    {purchase.firstUseDate && purchase.actualExpiryDate && (
                      <CountdownTimer 
                        expiryDate={purchase.actualExpiryDate}
                        type={purchase.type as 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package'}
                        onExpired={() => {
                          // Handle expiration
                          const updatedPurchases = customer.purchases.map(p => 
                            p.id === purchase.id ? { ...p, status: 'expired' as const } : p
                          );
                          onUpdateCustomer({ ...customer, purchases: updatedPurchases });
                        }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Status Information */}
                <div className="mb-4">
                  {!purchase.firstUseDate ? (
                    <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                      <span>🎫</span>
                      <span className="text-sm font-medium">
                        Ready to use! Pass activates on first check-in.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>First used:</span>
                        <span>{formatDate(purchase.firstUseDate)}</span>
                      </div>
                      {purchase.actualExpiryDate && (
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Expires:</span>
                          <span>{formatDate(purchase.actualExpiryDate)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Show active sessions for this pass */}
                  {(customer.activeSessions || [])
                    .filter(session => session.purchaseId === purchase.id)
                    .map(session => (
                      <div key={session.id} className="bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">✅ Checked In</span>
                            <p className="text-sm text-green-600">
                              Since {new Date(session.startTime).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-green-600">
                          Auto-checkout at {new Date(session.autoCheckoutTime).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}

                  {/* Dynamic Button: Check In or Check Out */}
                  {(() => {
                    const activeSessions = (customer.activeSessions || []).filter(session => session.purchaseId === purchase.id);
                    const hasActiveSessions = activeSessions.length > 0;
                    
                    // For single-use passes that haven't been used yet
                    if (purchase.totalSessions === 1 && !purchase.firstUseDate) {
                      return (() => {
                          if (purchase.type === 'party_package') {
                            const partyStatus = getPartyCheckInStatus(purchase);
                            
                            if (partyStatus === 'needs_scheduling') {
                              return (
                                <Button
                                  onClick={() => handleUsePassClick(purchase.id)}
                                  className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                  🗓️ Schedule Party
                                </Button>
                              );
                            } else if (partyStatus === 'available') {
                              return (
                                <Button
                                  onClick={() => handleUsePassClick(purchase.id)}
                                  className="w-full bg-green-600 hover:bg-green-700"
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
                                  onClick={() => handleUsePassClick(purchase.id)}
                                  className="w-full bg-orange-500 hover:bg-orange-600"
                                  disabled={false}
                                >
                                  ⏰ Check-in in {timeText}
                                </Button>
                              );
                            } else if (partyStatus === 'expired') {
                              return (
                                <Button
                                  disabled
                                  className="w-full bg-gray-400 cursor-not-allowed"
                                >
                                  ❌ Party Time Passed
                                </Button>
                              );
                            }
                          }
                          
                          return (
                            <Button
                              onClick={() => handleUsePassClick(purchase.id)}
                              className="w-full"
                            >
                              Check In
                            </Button>
                          );
                        })();
                    }
                    
                    // For multi-use passes or passes with active sessions
                    if (purchase.totalSessions > 1 || hasActiveSessions) {
                      if (hasActiveSessions) {
                        // Show checkout button if there are active sessions
                        return (
                          <Button
                            onClick={() => handleCheckOut(activeSessions[activeSessions.length - 1].id)}
                            className="w-full"
                            variant="outline"
                          >
                            Check Out
                          </Button>
                        );
                      } else {
                        // Show check in button if no active sessions
                        return (() => {
                            if (purchase.type === 'party_package') {
                              const partyStatus = getPartyCheckInStatus(purchase);
                              
                              if (partyStatus === 'needs_scheduling') {
                                return (
                                  <Button
                                    onClick={() => handleUsePassClick(purchase.id)}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                  >
                                    🗓️ Schedule Party
                                  </Button>
                                );
                              } else if (partyStatus === 'available') {
                                return (
                                  <Button
                                    onClick={() => handleUsePassClick(purchase.id)}
                                    className="w-full bg-green-600 hover:bg-green-700"
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
                                    onClick={() => handleUsePassClick(purchase.id)}
                                    className="w-full bg-orange-500 hover:bg-orange-600"
                                    disabled={false}
                                  >
                                    ⏰ Check-in in {timeText}
                                  </Button>
                                );
                              } else if (partyStatus === 'expired') {
                                return (
                                  <Button
                                    disabled
                                    className="w-full bg-gray-400 cursor-not-allowed"
                                  >
                                    ❌ Party Time Passed
                                  </Button>
                                );
                              }
                            }
                            
                            return (
                              <Button
                                onClick={() => handleUsePassClick(purchase.id)}
                                className="w-full"
                              >
                                Check In
                              </Button>
                            );
                          })();
                      }
                    }
                    
                    return null;
                  })()}

                  {/* Pass Status Info */}
                  {purchase.firstUseDate && purchase.actualExpiryDate && (
                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-center text-sm">
                      {purchase.type === 'day_pass' ? 'Each check-in gives 12 hours of play time' :
                       purchase.type === 'weekly_pass' ? 'Pass expires 7 days after first use' :
                       purchase.type === 'monthly_pass' ? 'Pass expires 30 days after first use' :
                       'This pass will expire automatically'}
                    </div>
                  )}

                  {/* Show if single-use pass has been used */}
                  {purchase.totalSessions === 1 && purchase.firstUseDate && (
                    <div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-center text-sm">
                      Single-use pass activated - will auto-checkout after 12 hours
                    </div>
                  )}

                  {/* Auto-Renew Toggle for Weekly/Monthly Passes */}
                  {(purchase.type === 'weekly_pass' || purchase.type === 'monthly_pass') && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">🔄 Auto-Renew</span>
                          {purchase.autoRenew && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              purchase.firstUseDate 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {purchase.firstUseDate ? 'Active' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAutoRenewToggle(purchase.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                            purchase.autoRenew ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              purchase.autoRenew ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                                          {purchase.autoRenew && (
                      <div className="mt-2 text-xs text-gray-600">
                        {purchase.firstUseDate ? (
                          <>
                            Auto-renew enabled: ${purchase.price.toFixed(2)} scheduled for {
                              purchase.actualExpiryDate
                                ? formatDate(purchase.actualExpiryDate)
                                : 'TBD'
                            }
                          </>
                        ) : (
                          <>Auto-renew enabled: Will activate on first use, then renew for ${purchase.price.toFixed(2)}</>
                        )}
                      </div>
                    )}

                    {/* Party Scheduling Information */}
                    {purchase.type === 'party_package' && purchase.partyDate && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-600">🎉</span>
                          <span className="font-medium text-purple-800">Party Scheduled</span>
                        </div>
                        <div className="text-sm text-purple-700 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-500">📅</span>
                            <span>{formatDate(purchase.partyDate)}</span>
                          </div>
                          {purchase.partyStartTime && purchase.partyEndTime && (
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500">⏰</span>
                              <span>
                                {(() => {
                                  const formatTime = (time: string) => {
                                    const [hours, minutes] = time.split(':');
                                    const hour = parseInt(hours);
                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                    return `${displayHour}:${minutes} ${ampm}`;
                                  };
                                  return `${formatTime(purchase.partyStartTime)} - ${formatTime(purchase.partyEndTime)}`;
                                })()}
                              </span>
                            </div>
                          )}
                          {purchase.partyGuests && (
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500">👥</span>
                              <span>{purchase.partyGuests} guests</span>
                            </div>
                          )}
                          {purchase.partyNotes && (
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500">🎨</span>
                              <span>{purchase.partyNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Purchase New Passes */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Buy More Passes</h3>
          <Button onClick={() => setShowPurchase(!showPurchase)}>
            {showPurchase ? 'Hide Products' : 'View Products'}
          </Button>
        </div>

        {/* No Payment Methods Warning */}
        {showPurchase && customer.savedCards.length === 0 && (
          <Card className="p-6 mb-4 border-yellow-200 bg-yellow-50">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-white">💳</span>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800">Add a Payment Method First</h4>
                <p className="text-yellow-600 text-sm">
                  You'll need to add a payment method below before you can purchase passes.
                  <br />
                  <strong>💡 Tip:</strong> Use the "Use Demo Card" button for quick testing!
                </p>
              </div>
            </div>
          </Card>
        )}

        {showPurchase && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_PRODUCTS.map((product) => (
              <Card key={product.id} className="p-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg">{product.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                  <p className="text-2xl font-bold text-green-600">${product.price}</p>
                  <p className="text-xs text-gray-500">Valid for {product.validity}</p>
                </div>
                
                <Button
                  onClick={() => {
                    if (customer.savedCards.length === 0) return;
                    if (confirmingProduct === product.id) {
                      handleConfirmPurchase(product.id);
                    } else {
                      handlePurchase(product.id);
                    }
                  }}
                  className={`w-full transition-colors ${
                    confirmingProduct === product.id
                      ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                      : processingProduct === product.id
                      ? 'bg-blue-600'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                  disabled={isProcessing || customer.savedCards.length === 0}
                >
                  {processingProduct === product.id ? 'Processing...' : 
                   isProcessing ? 'Please wait...' :
                   customer.savedCards.length === 0 ? 'Add Payment Method First' :
                   confirmingProduct === product.id ? '✓ Confirm Purchase' : 'Buy Now'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Payment Methods</h3>
          <Button onClick={() => setShowAddCard(!showAddCard)}>
            Add New Card
          </Button>
        </div>

        {customer.savedCards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customer.savedCards.map((card) => (
              <Card key={card.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {formatCardBrand(card.brand).slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• {card.last4}</p>
                      <p className="text-sm text-gray-600">
                        Expires {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                      </p>
                    </div>
                  </div>
                  {card.isDefault && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      Default
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-2 border-dashed border-yellow-300 bg-yellow-50">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💳</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Add Your First Payment Method</h4>
            <p className="text-gray-600 mb-6">
              Save your card securely to purchase passes and check in easily.
              <br />
              <span className="text-yellow-700 font-medium">🎯 Use our demo card for instant testing!</span>
            </p>
            <Button onClick={() => setShowAddCard(true)} size="lg" className="min-w-[200px]">
              🚀 Add Payment Method
            </Button>
          </Card>
        )}

        {showAddCard && (
          <Card className="p-6 mt-4">
            <h4 className="font-semibold mb-4">Add New Payment Method</h4>
            
            {/* Demo Card Button */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800">🎯 Quick Demo Setup</p>
                  <p className="text-sm text-yellow-600">Use our demo card to test purchases instantly</p>
                </div>
                <Button
                  onClick={() => {
                    setCardholderName('Demo Customer');
                    setCardNumber('4242 4242 4242 4242');
                    setExpiryDate('12/28');
                    setCvv('123');
                  }}
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  Use Demo Card
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              
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
                    setExpiryDate(value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-4">
              <Button
                onClick={() => setShowAddCard(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCard}
                className="flex-1"
                disabled={isProcessing || !cardNumber || !expiryDate || !cvv || !cardholderName}
              >
                {isProcessing ? 'Adding Card...' : 'Add Card'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Purchase History */}
      {pastPurchases.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Purchase History</h3>
          <Card className="divide-y">
            {pastPurchases.map((purchase) => (
              <div key={purchase.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{purchase.name}</h4>
                    <p className="text-sm text-gray-600">
                      Purchased {formatDate(purchase.purchaseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${purchase.price}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      purchase.status === 'used' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status === 'used' ? 'Used' : 'Expired'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
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
                You're about to activate your <strong>{confirmingPurchase.name}</strong>.
                <br />
                {confirmingPurchase.totalSessions === 1 ? (
                  <span className="text-red-600 font-medium">
                    This pass can only be used once and will start its 12-hour timer.
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    This will start the timer for one person. You can use this pass multiple times for different people.
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {confirmingPurchase.totalSessions === 1 
                  ? 'Are you sure you want to activate this single-use pass now?'
                  : 'Ready to start the timer for someone?'}
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

      {/* Auto-Renew Confirmation Dialog */}
      {showAutoRenewConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Enable Auto-Renew?
              </h3>
              <p className="text-gray-600 mb-4">
                Your <strong>{showAutoRenewConfirm.passName}</strong> will automatically renew for{' '}
                <strong>${showAutoRenewConfirm.price.toFixed(2)}</strong> using your saved payment method.
              </p>
              <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">ℹ️</span>
                  <div className="text-left">
                    <p className="font-medium mb-1">How Auto-Renew Works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Renews automatically 7 days before expiration</li>
                      <li>• Uses your saved payment method</li>
                      <li>• Can be disabled anytime</li>
                      <li>• You'll get a confirmation when renewed</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={() => setShowAutoRenewConfirm(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAutoRenew}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                >
                  Enable Auto-Renew
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Party Scheduling Modal */}
      {showPartyScheduling && schedulingParty && (
        <PartySchedulingModal
          isOpen={showPartyScheduling}
          onClose={() => {
            setShowPartyScheduling(false);
            setSchedulingParty(null);
          }}
          onSchedule={handlePartySchedule}
          partyPackageName={schedulingParty.name}
          customerName={customer.name}
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
