'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import { CountdownTimer } from './CountdownTimer';
import { PartySchedulingModal } from './PartySchedulingModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { createClient } from '@/lib/supabase/client';
import {
  formatCurrency,
  getPassesFromStorage,
  getPartiesFromStorage,
  getProductsFromStorage,
  getActivePasses,
  getActiveParties,
  getAvailableProducts,
} from '@/lib/utils/productHelpers';

interface Child {
  id: string;
  name: string;
  birthdate: string;
  age: number; // Calculated from birthdate
  waiverSigned: boolean;
  waiverSignedDate?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  children: Child[]; // Children registered to this customer
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
  childId?: string; // ID of the child this pass is for (required for passes, optional for party packages)
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

export function CustomerDashboard({ customer, onUpdateCustomer }: CustomerDashboardProps) {
  // Load products from product management system
  const [availablePasses, setAvailablePasses] = useState<any[]>([]);
  const [availableParties, setAvailableParties] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);

  // Load products from localStorage (client-side)
  useEffect(() => {
    const loadProducts = () => {
      setIsLoadingProducts(true);
      setProductLoadError(null);

      try {
        // Get active passes, parties, and available products from localStorage
        const passes = getActivePasses(getPassesFromStorage());
        const parties = getActiveParties(getPartiesFromStorage());
        const products = getAvailableProducts(getProductsFromStorage());

        // Convert to format expected by CustomerDashboard
        const formattedPasses = passes.map(pass => ({
          id: pass.id,
          name: pass.name,
          price: pass.price,
          description: pass.description,
          sessions: pass.sessionsIncluded,
          validity: pass.category === 'day' ? `${pass.duration} hours` : `${pass.duration} days`,
          stripePurchaseLink: pass.stripePurchaseLink,
        }));

        const formattedParties = parties.map(party => ({
          id: party.id,
          name: party.name,
          price: party.basePrice,
          description: `${party.description} (Can accommodate up to ${party.capacity} kids with an additional charge of $15/child over the included 15, ${party.duration} hours)`,
          sessions: 1,
          validity: '90 days to book',
          stripePurchaseLink: party.stripePurchaseLink,
          capacity: party.capacity,
          duration: party.duration,
          includedItems: party.includedItems,
          addOns: party.addOns,
        }));

        setAvailablePasses(formattedPasses);
        setAvailableParties(formattedParties);
        setAvailableProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
        setProductLoadError('Failed to load products. Please refresh the page.');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();

    // Reload when localStorage changes (e.g., admin updates products)
    // This provides real-time sync between admin and customer views
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('busybees_passes') || e.key?.includes('busybees_parties') || e.key?.includes('busybees_products')) {
        loadProducts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const AVAILABLE_PRODUCTS = [...availablePasses, ...availableParties];
  const [activeTab, setActiveTab] = useState<'children' | 'passes' | 'parties' | 'payments'>('children');
  const [showPurchase, setShowPurchase] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProduct, setProcessingProduct] = useState<string>('');
  const [purchaseSuccess, setPurchaseSuccess] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch saved cards from API
  const fetchSavedCards = async () => {
    try {
      const response = await fetch('/api/stripe/payment-methods');
      if (response.ok) {
        const { paymentMethods } = await response.json();
        const savedCards = paymentMethods.map((pm: any) => ({
          id: pm.stripe_payment_method_id,
          last4: pm.last4,
          brand: pm.brand,
          expiryMonth: pm.expiry_month,
          expiryYear: pm.expiry_year,
          isDefault: pm.is_default,
        }));
        onUpdateCustomer({ ...customer, savedCards });
      }
    } catch (error) {
      console.error('Error fetching saved cards:', error);
    }
  };

  useEffect(() => {
    fetchSavedCards();
  }, []);

  const handleAddPaymentMethodSuccess = async () => {
    await fetchSavedCards();
    setShowAddCard(false);
    alert('Payment method added successfully!');
  };
  const [confirmingPurchase, setConfirmingPurchase] = useState<Purchase | null>(null);
  const [showAutoRenewConfirm, setShowAutoRenewConfirm] = useState<{purchaseId: string, passName: string, price: number, type: string} | null>(null);
  const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [confirmingCheckIn, setConfirmingCheckIn] = useState<string | null>(null);
  const [checkInTimeout, setCheckInTimeout] = useState<NodeJS.Timeout | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteTimeout, setDeleteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPartyScheduling, setShowPartyScheduling] = useState(false);
  const [schedulingParty, setSchedulingParty] = useState<Purchase | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  }>({ title: '', message: '' });

  // Gift card state
  const [giftCardBalance, setGiftCardBalance] = useState<number>(0);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [redeemingGiftCard, setRedeemingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardSuccess, setGiftCardSuccess] = useState<string | null>(null);

  // Fetch gift card balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/gift-cards/balance');
        if (response.ok) {
          const data = await response.json();
          setGiftCardBalance(data.balance || 0);
        }
      } catch (error) {
        console.error('Error fetching gift card balance:', error);
      }
    };
    fetchBalance();
  }, [customer.id]);

  const handleRedeemGiftCard = async () => {
    if (!giftCardCode.trim()) {
      setGiftCardError('Please enter a gift card code');
      return;
    }

    setRedeemingGiftCard(true);
    setGiftCardError(null);
    setGiftCardSuccess(null);

    try {
      const response = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode }),
      });

      const data = await response.json();

      if (data.success) {
        setGiftCardBalance(data.new_balance || 0);
        setGiftCardSuccess(`$${data.amount_credited?.toFixed(2)} added to account!`);
        setGiftCardCode('');
        setTimeout(() => setGiftCardSuccess(null), 5000);
      } else {
        setGiftCardError(data.error || 'Failed to redeem gift card');
      }
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      setGiftCardError('Failed to redeem gift card. Please try again.');
    } finally {
      setRedeemingGiftCard(false);
    }
  };

  // Children management state
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverChild, setWaiverChild] = useState<Child | null>(null);
  const [childName, setChildName] = useState('');
  const [childBirthdate, setChildBirthdate] = useState('');
  const [selectedChildForPurchase, setSelectedChildForPurchase] = useState<string>('');
  const [showChildSelectionModal, setShowChildSelectionModal] = useState(false);
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<string>('');
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isSigningWaiver, setIsSigningWaiver] = useState(false);
  const [isDeletingChild, setIsDeletingChild] = useState(false);

  // Helper function to calculate age from birthdate
  const calculateAge = (birthdate: string): number => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  // Helper function to get child name by ID
  const getChildName = (childId: string): string => {
    const child = customer.children.find(c => c.id === childId);
    return child ? child.name : 'Unknown Child';
  };

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddChild) {
          setShowAddChild(false);
          setChildName('');
          setChildBirthdate('');
        } else if (showWaiverModal) {
          setShowWaiverModal(false);
          setWaiverChild(null);
        } else if (showChildSelectionModal) {
          setShowChildSelectionModal(false);
          setSelectedProductForPurchase('');
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddChild, showWaiverModal, showChildSelectionModal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeout) {
        clearTimeout(confirmTimeout);
      }
      if (checkInTimeout) {
        clearTimeout(checkInTimeout);
      }
      if (deleteTimeout) {
        clearTimeout(deleteTimeout);
      }
    };
  }, [confirmTimeout, checkInTimeout, deleteTimeout]);

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

  const handleCheckInClick = (purchaseId: string) => {
    // Clear any existing timeout
    if (checkInTimeout) {
      clearTimeout(checkInTimeout);
    }

    // Set confirmation state
    setConfirmingCheckIn(purchaseId);

    // Set timeout to reset confirmation after 5 seconds
    const timeout = setTimeout(() => {
      setConfirmingCheckIn(null);
    }, 5000);

    setCheckInTimeout(timeout);
  };

  const handleConfirmCheckIn = (purchaseId: string) => {
    // Clear confirmation state and timeout
    setConfirmingCheckIn(null);
    if (checkInTimeout) {
      clearTimeout(checkInTimeout);
      setCheckInTimeout(null);
    }

    // Proceed with the actual check-in
    handleCheckIn(purchaseId);
  };

  const handleDeleteCardClick = (cardId: string) => {
    // Clear any existing timeout
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
    }

    // Set confirmation state
    setConfirmingDelete(cardId);

    // Set timeout to reset confirmation after 5 seconds
    const timeout = setTimeout(() => {
      setConfirmingDelete(null);
    }, 5000);

    setDeleteTimeout(timeout);
  };

  const handleConfirmDelete = (cardId: string) => {
    // Clear confirmation state and timeout
    setConfirmingDelete(null);
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
      setDeleteTimeout(null);
    }

    // Check if this is the only card or the default card
    const cardToDelete = customer.savedCards.find(card => card.id === cardId);
    const remainingCards = customer.savedCards.filter(card => card.id !== cardId);

    if (cardToDelete?.isDefault && remainingCards.length > 0) {
      // If deleting the default card and there are others, make the first remaining card default
      remainingCards[0].isDefault = true;
    }

    // Update customer with the card removed
    const updatedCustomer = {
      ...customer,
      savedCards: remainingCards
    };

    onUpdateCustomer(updatedCustomer);
  };

  // Children management functions
  const handleAddChild = async () => {
    if (!childName.trim() || !childBirthdate) return;

    setIsAddingChild(true);

    try {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          name: childName.trim(),
          birthdate: childBirthdate,
          waiver_signed: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add child');
      }

      const newChild = await response.json();

      // Reset form
      setChildName('');
      setChildBirthdate('');
      setShowAddChild(false);

      // Show success message for adding the child
      setSuccessDetails({
        title: 'Child Added Successfully!',
        message: `${childName.trim()} has been added to your account. Next, you'll need to sign a waiver for them to purchase passes.`
      });
      setShowSuccessModal(true);

      // After success modal closes, show waiver modal
      setTimeout(() => {
        setWaiverChild({
          id: newChild.id,
          name: newChild.name,
          birthdate: newChild.birthdate,
          age: calculateAge(newChild.birthdate),
          waiverSigned: newChild.waiver_signed,
          waiverSignedDate: newChild.waiver_signed_date,
          createdAt: newChild.created_at,
        });
        setShowWaiverModal(true);
      }, 5000); // Wait for success modal auto-close

      // Trigger refresh via parent component
      onUpdateCustomer(customer);
    } catch (error) {
      console.error('Error adding child:', error);
      setSuccessDetails({
        title: 'Error Adding Child',
        message: error instanceof Error ? error.message : 'Failed to add child. Please try again.'
      });
      setShowSuccessModal(true);
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleSignWaiver = async (child: Child) => {
    setIsSigningWaiver(true);

    try {
      const response = await fetch(`/api/children/${child.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sign_waiver: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign waiver');
      }

      setShowWaiverModal(false);
      setWaiverChild(null);

      setSuccessDetails({
        title: 'Waiver Signed Successfully',
        message: `Waiver has been signed for ${child.name}. They can now purchase passes and play!`
      });
      setShowSuccessModal(true);

      // Trigger refresh via parent component
      onUpdateCustomer(customer);
    } catch (error) {
      console.error('Error signing waiver:', error);
      setSuccessDetails({
        title: 'Error Signing Waiver',
        message: error instanceof Error ? error.message : 'Failed to sign waiver. Please try again.'
      });
      setShowSuccessModal(true);
    } finally {
      setIsSigningWaiver(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    // Check if child has any active passes
    const hasActivePasses = customer.purchases.some(p =>
      p.childId === childId && p.status === 'active'
    );

    if (hasActivePasses) {
      setSuccessDetails({
        title: 'Cannot Delete Child',
        message: 'This child has active passes. Please wait for passes to expire or contact staff.'
      });
      setShowSuccessModal(true);
      return;
    }

    setIsDeletingChild(true);

    try {
      const response = await fetch(`/api/children/${childId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete child');
      }

      setSuccessDetails({
        title: 'Child Deleted',
        message: 'Child has been removed from your account.'
      });
      setShowSuccessModal(true);

      // Trigger refresh via parent component
      onUpdateCustomer(customer);
    } catch (error) {
      console.error('Error deleting child:', error);
      setSuccessDetails({
        title: 'Error Deleting Child',
        message: error instanceof Error ? error.message : 'Failed to delete child. Please try again.'
      });
      setShowSuccessModal(true);
    } finally {
      setIsDeletingChild(false);
    }
  };

  const handleChildSelectionForPurchase = (childId: string) => {
    setSelectedChildForPurchase(childId);
    setShowChildSelectionModal(false);

    // Now proceed with the purchase using the selected child
    if (selectedProductForPurchase) {
      handlePurchase(selectedProductForPurchase);
    }
  };

  const handleConfirmPurchase = async (productId: string) => {
    // Clear confirmation state and timeout
    setConfirmingProduct(null);
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
      setConfirmTimeout(null);
    }

    // Check if this is a pass purchase and requires child selection
    const product = AVAILABLE_PRODUCTS.find(p => p.id === productId);
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }

    const isPassPurchase = !productId.includes('party');

    if (isPassPurchase) {
      // For pass purchases, require child selection
      if (!selectedChildForPurchase) {
        setSuccessDetails({
          title: 'Child Selection Required',
          message: 'Please select which child this pass is for before purchasing.'
        });
        setShowSuccessModal(true);
        return;
      }

      // Check if the selected child has a signed waiver
      const selectedChild = customer.children.find(c => c.id === selectedChildForPurchase);
      if (!selectedChild || !selectedChild.waiverSigned) {
        setSuccessDetails({
          title: 'Waiver Required',
          message: 'The selected child must have a signed waiver before purchasing a pass.'
        });
        setShowSuccessModal(true);
        return;
      }
    }

    // Prevent multiple simultaneous purchases
    if (isProcessing || processingProduct) return;

    setIsProcessing(true);
    setProcessingProduct(productId);

    try {
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

      // Call real API to process purchase
      const response = await fetch('/api/purchases/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          product_id: productId,
          product_name: product.name,
          product_price: product.price,
          product_description: product.description,
          purchase_type: purchaseType,
          child_id: isPassPurchase ? selectedChildForPurchase : undefined,
          quantity: 1,
          metadata: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Purchase failed');
      }

      const { purchase } = await response.json();

      // Fetch updated purchases from database
      const purchasesResponse = await fetch(`/api/purchases?customer_id=${customer.id}`);
      if (purchasesResponse.ok) {
        const { purchases: purchasesData } = await purchasesResponse.json();
        const purchases = (purchasesData || []).map((p: any) => ({
          id: p.id,
          type: p.type,
          name: p.name,
          price: p.price,
          purchaseDate: p.purchase_date,
          expiryDate: p.expiry_date,
          usedSessions: p.used_sessions,
          totalSessions: p.total_sessions,
          status: p.status,
          firstUseDate: p.first_use_date,
          actualExpiryDate: p.actual_expiry_date,
          childId: p.child_id,
          autoRenew: p.auto_renew,
          nextRenewalDate: p.next_renewal_date,
          stripePaymentIntentId: p.stripe_payment_intent_id,
          stripeSubscriptionId: p.stripe_subscription_id,
          partyDate: p.party_date,
          partyStartTime: p.party_start_time,
          partyGuests: p.party_guests,
          partyNotes: p.party_notes,
        }));

        const updatedCustomer = {
          ...customer,
          purchases: purchases,
        };

        onUpdateCustomer(updatedCustomer);
      }

      // Clear selected child for next purchase
      if (isPassPurchase) {
        setSelectedChildForPurchase('');
      }

      setPurchaseSuccess(product.name);

      // Clear success message after 5 seconds
      setTimeout(() => setPurchaseSuccess(''), 5000);

    } catch (error) {
      console.error('Purchase failed:', error);
      setSuccessDetails({
        title: 'Purchase Failed',
        message: error instanceof Error ? error.message : 'Unable to process purchase. Please try again.'
      });
      setShowSuccessModal(true);
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

        // Within check-in window, use the 5-second confirmation system
        if (confirmingCheckIn === purchaseId) {
          handleConfirmCheckIn(purchaseId);
        } else {
          handleCheckInClick(purchaseId);
        }
        return;
      }
    }

    // Check if it's a single-use pass (day pass)
    const isSingleUse = purchase.totalSessions === 1;

    if (isSingleUse) {
      setConfirmingPurchase(purchase);
      setShowConfirmDialog(true);
    } else {
      // Multi-use pass, use the confirmation system
      if (confirmingCheckIn === purchaseId) {
        handleConfirmCheckIn(purchaseId);
      } else {
        handleCheckInClick(purchaseId);
      }
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

  // Filter purchases by type
  const passPurchases = customer.purchases.filter(p => p.type !== 'party_package');
  const partyPurchases = customer.purchases.filter(p => p.type === 'party_package');
  const activePassPurchases = passPurchases.filter(p => p.status === 'active');
  const pastPassPurchases = passPurchases.filter(p => p.status !== 'active');
  const activePartyPurchases = partyPurchases.filter(p => p.status === 'active');
  const pastPartyPurchases = partyPurchases.filter(p => p.status !== 'active');

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back, {customer.name}! 🐝</h2>
            <p className="text-yellow-100">
              Member since {formatDate(customer.createdAt)}
              {customer.lastVisit && ` • Last visit: ${formatDate(customer.lastVisit)}`}
            </p>
          </div>
          {giftCardBalance > 0 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-yellow-100 uppercase tracking-wide">Gift Card Balance</p>
              <p className="text-2xl font-bold">${giftCardBalance.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Gift Card Redemption */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-xl">🎁</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Redeem Gift Card</p>
              <p className="text-sm text-gray-600">Enter code to add credit</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={giftCardCode}
              onChange={(e) => {
                setGiftCardCode(e.target.value.toUpperCase());
                setGiftCardError(null);
              }}
              placeholder="BBGC-XXXX-XXXX-XXXX"
              className="px-3 py-2 border rounded-lg font-mono text-sm w-52"
              disabled={redeemingGiftCard}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleRedeemGiftCard}
              disabled={redeemingGiftCard || !giftCardCode.trim()}
            >
              {redeemingGiftCard ? 'Redeeming...' : 'Redeem'}
            </Button>
          </div>
        </div>
        {giftCardError && (
          <p className="mt-2 text-red-600 text-sm">{giftCardError}</p>
        )}
        {giftCardSuccess && (
          <p className="mt-2 text-green-600 text-sm font-semibold">✓ {giftCardSuccess}</p>
        )}
      </Card>

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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex space-x-2 p-2">
          <button
            onClick={() => setActiveTab('children')}
            className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              activeTab === 'children'
                ? 'bg-blue-500 text-white shadow-lg transform scale-105 border-2 border-blue-600'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">👶</span>
              <span>Children ({customer.children.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('passes')}
            className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              activeTab === 'passes'
                ? 'bg-yellow-500 text-white shadow-lg transform scale-105 border-2 border-yellow-600'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">🎫</span>
              <span>Passes ({activePassPurchases.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('parties')}
            className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              activeTab === 'parties'
                ? 'bg-purple-500 text-white shadow-lg transform scale-105 border-2 border-purple-600'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">🎉</span>
              <span>Parties ({activePartyPurchases.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
              activeTab === 'payments'
                ? 'bg-green-500 text-white shadow-lg transform scale-105 border-2 border-green-600'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">💳</span>
              <span>Payments ({customer.savedCards.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Children Tab */}
      {activeTab === 'children' && (
        <div className="space-y-8">
          {/* Children Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Manage Children</h3>
            <Button
              onClick={() => setShowAddChild(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              <span className="text-lg mr-2">+</span>
              Add Child
            </Button>
          </div>

          {/* Children List */}
          {customer.children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Children Added</h3>
              <p className="text-gray-600 mb-6">Add your children to purchase passes and track waivers</p>
              <Button
                onClick={() => setShowAddChild(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                Add Your First Child
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customer.children.map((child) => (
                <Card key={child.id} className="p-6 border-l-4 border-l-blue-400">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{child.name}</h4>
                      <p className="text-gray-600">Age: {child.age}</p>
                      <p className="text-sm text-gray-500">
                        Born: {new Date(child.birthdate).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteChild(child.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete child"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Waiver Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Waiver Status:</span>
                      {child.waiverSigned ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                          ✅ Signed
                        </span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                            ❌ Not Signed
                          </span>
                          <Button
                            onClick={() => {
                              setWaiverChild(child);
                              setShowWaiverModal(true);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Sign Waiver
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Active Passes for this child - GROUPED */}
                    {(() => {
                      const childPasses = customer.purchases.filter(p =>
                        p.childId === child.id && p.status === 'active'
                      );
                      
                      // Group passes by type
                      const inferPassType = (name: string, type?: string): string => {
                        if (type && type !== 'undefined') return type;
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes('day pass') || lowerName.includes('day_pass')) return 'day_pass';
                        if (lowerName.includes('punch') || lowerName.includes('weekly')) return 'weekly_pass';
                        if (lowerName.includes('monthly') || lowerName.includes('membership')) return 'monthly_pass';
                        if (lowerName.includes('party')) return 'party_package';
                        return 'day_pass';
                      };
                      
                      const getPassTypeName = (type: string) => {
                        switch (type) {
                          case 'day_pass': return 'Day Pass';
                          case 'weekly_pass': return 'Punch Card';
                          case 'monthly_pass': return 'Monthly Pass';
                          case 'party_package': return 'Party Package';
                          default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                      };
                      
                      const groupedPasses = childPasses.reduce((acc, pass) => {
                        const normalizedType = inferPassType(pass.name, pass.type);
                        if (!acc[normalizedType]) {
                          acc[normalizedType] = {
                            type: normalizedType,
                            name: getPassTypeName(normalizedType),
                            totalRemaining: 0,
                            isUnlimited: false,
                          };
                        }
                        const remaining = (pass.totalSessions || 1) - (pass.usedSessions || 0);
                        if (pass.totalSessions === 999) {
                          acc[normalizedType].isUnlimited = true;
                        }
                        acc[normalizedType].totalRemaining += remaining;
                        return acc;
                      }, {} as Record<string, { type: string; name: string; totalRemaining: number; isUnlimited: boolean }>);
                      
                      const groupedPassesList = Object.values(groupedPasses);
                      
                      return groupedPassesList.length > 0 && (
                        <div>
                          <p className="font-medium text-sm text-gray-700 mb-2">Active Passes:</p>
                          {groupedPassesList.map(group => (
                            <div key={group.type} className="bg-yellow-50 p-2 rounded text-sm flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {!group.isUnlimited && group.totalRemaining > 1 && (
                                  <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {group.totalRemaining}x
                                  </span>
                                )}
                                <span className="font-medium">{group.name}</span>
                              </div>
                              {group.isUnlimited ? (
                                <span className="text-green-600 text-xs font-medium">∞ Unlimited</span>
                              ) : (
                                <span className="text-gray-500 text-xs">
                                  {group.totalRemaining} visit{group.totalRemaining !== 1 ? 's' : ''} left
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {child.waiverSigned && child.waiverSignedDate && (
                      <p className="text-xs text-gray-500">
                        Waiver signed: {new Date(child.waiverSignedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add Child Modal */}
          {showAddChild && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddChild(false);
                  setChildName('');
                  setChildBirthdate('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddChild(false);
                  setChildName('');
                  setChildBirthdate('');
                }
              }}
            >
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowAddChild(false);
                    setChildName('');
                    setChildBirthdate('');
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>

                <h3 className="text-lg font-semibold mb-4">Add New Child</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Child's Name
                    </label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter child's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={childBirthdate}
                      onChange={(e) => setChildBirthdate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {childBirthdate && (
                    <p className="text-sm text-gray-600">
                      Age: {calculateAge(childBirthdate)} years old
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    onClick={() => {
                      setShowAddChild(false);
                      setChildName('');
                      setChildBirthdate('');
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddChild}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={!childName.trim() || !childBirthdate || isAddingChild}
                  >
                    {isAddingChild ? 'Adding...' : 'Add Child'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Waiver Modal */}
          {showWaiverModal && waiverChild && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowWaiverModal(false);
                  setWaiverChild(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowWaiverModal(false);
                  setWaiverChild(null);
                }
              }}
            >
              <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowWaiverModal(false);
                    setWaiverChild(null);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  ✕
                </button>

                <h3 className="text-lg font-semibold mb-4">Waiver for {waiverChild.name}</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-2">LIABILITY WAIVER AND RELEASE</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    I hereby acknowledge that I am the parent/guardian of {waiverChild.name},
                    age {waiverChild.age}, and I understand that participation in activities at
                    Busy Bees Indoor Playground involves inherent risks.
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    I hereby release, waive, discharge and covenant not to sue Busy Bees Indoor Playground,
                    its owners, employees, and agents from any and all liability, claims, demands,
                    actions and causes of action whatsoever arising out of or related to any loss,
                    damage, or injury that may be sustained by my child while participating in activities.
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    I acknowledge that I have read and understood this waiver and that I am signing
                    it voluntarily. This waiver shall be binding upon my heirs, executors,
                    administrators and assigns.
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    By clicking "I Agree and Sign", I electronically sign this waiver on behalf of my child.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setShowWaiverModal(false);
                      setWaiverChild(null);
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSignWaiver(waiverChild)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={isSigningWaiver}
                  >
                    {isSigningWaiver ? 'Signing...' : 'I Agree and Sign'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Passes Tab */}
      {activeTab === 'passes' && (
        <div className="space-y-8">
          {/* Active Passes */}
          {activePassPurchases.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Your Active Passes</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activePassPurchases.map((purchase) => (
              <Card key={purchase.id} className="p-6 border-l-4 border-l-green-400">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{purchase.name}</h4>
                    {purchase.childId && (
                      <p className="text-blue-600 font-medium text-sm">
                        👶 {getChildName(purchase.childId)}
                      </p>
                    )}
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

                  {/* Account View - No Check-in (use Check In tab for that) */}
                  {purchase.type === 'party_package' && !purchase.partyDate && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg text-center text-sm">
                      🗓️ Visit the Check In tab to schedule your party
                    </div>
                  )}

                  {purchase.type !== 'party_package' && !purchase.firstUseDate && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center text-sm">
                      🎫 Visit the Check In tab to use this pass
                    </div>
                  )}

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
                      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
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
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                            purchase.autoRenew
                              ? 'bg-yellow-500 border-yellow-400 shadow-sm'
                              : 'bg-gray-200 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
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
                    </div>
                  )}

                  {/* Party Scheduling Information */}
                  {purchase.type === 'party_package' && purchase.partyDate && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">🎉</span>
                          <span className="font-medium text-purple-800">Party Scheduled</span>
                        </div>
                        <button
                          onClick={() => {
                            setSchedulingParty(purchase);
                            setShowPartyScheduling(true);
                          }}
                          className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-md transition-colors"
                        >
                          📅 Reschedule
                        </button>
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
              </Card>
            ))}
          </div>
        </div>
      )}

          {/* Purchase New Passes - Always Visible */}
          <div>
            <h3 className="text-xl font-semibold mb-4">🛒 Purchase New Passes</h3>

            {/* Child Selection Required */}
            {customer.children.length === 0 && (
              <Card className="p-6 mb-4 border-blue-200 bg-blue-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white">👶</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Add Children First</h4>
                    <p className="text-blue-600 text-sm">
                      You need to add at least one child with a signed waiver before purchasing passes.
                      <br />
                      <strong>💡 Tip:</strong> Go to the Children tab to add your first child!
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveTab('children')}
                  className="bg-blue-500 hover:bg-blue-600 text-white mt-3"
                >
                  Go to Children Tab
                </Button>
              </Card>
            )}

            {/* No Payment Methods Warning */}
            {customer.savedCards.length === 0 && (
              <Card className="p-6 mb-4 border-yellow-200 bg-yellow-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white">💳</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Add a Payment Method First</h4>
                    <p className="text-yellow-600 text-sm">
                      You'll need to add a payment method in the Payments tab before you can purchase passes.
                      <br />
                      <strong>💡 Tip:</strong> Use the "Use Demo Card" button for quick testing!
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 border-l-8 border-l-green-300 bg-green-50">
              <div className="grid gap-4 text-left">
                {availablePasses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">🎫 No passes available</p>
                    <p className="text-sm">Please check back later or contact staff.</p>
                  </div>
                ) : (
                  availablePasses.map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 text-lg">
                          {product.name.toLowerCase().includes('infant') ? '👶' : product.name.toLowerCase().includes('toddler') ? '🎫' : product.name.toLowerCase().includes('10') ? '📅' : '🗓️'} {product.name}
                        </span>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(product.price)}</p>
                        {product.stripePurchaseLink && (
                          <p className="text-xs text-blue-600 mt-1">💳 Stripe payment available</p>
                        )}
                      </div>
                    <Button
                      onClick={() => {
                        // Step 1: Add Child (highest priority)
                        if (customer.children.length === 0) {
                          setActiveTab('children');
                          return;
                        }

                        // Step 2: Add Payment Method
                        if (customer.savedCards.length === 0) {
                          setActiveTab('payments');
                          return;
                        }

                        // Step 3: Show Child Selection Modal
                        if (confirmingProduct === product.id) {
                          handleConfirmPurchase(product.id);
                        } else {
                          // Show child selection modal
                          setSelectedProductForPurchase(product.id);
                          setShowChildSelectionModal(true);
                        }
                      }}
                      size="lg"
                      disabled={processingProduct === product.id}
                      className={`px-6 py-3 text-white transition-colors ${
                        confirmingProduct === product.id
                          ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                          : processingProduct === product.id
                          ? 'bg-blue-600'
                          : customer.children.length === 0
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : customer.savedCards.length === 0
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {processingProduct === product.id
                        ? 'Processing...'
                        : confirmingProduct === product.id
                        ? '✓ Confirm Purchase'
                        : customer.children.length === 0
                        ? '👶 Add Child First'
                        : customer.savedCards.length === 0
                        ? '💳 Add Payment First'
                        : 'Buy Now'
                      }
                    </Button>
                  </div>
                ))
                )}
              </div>
            </Card>
          </div>

          {/* Pass Purchase History */}
          {pastPassPurchases.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Pass Purchase History</h3>
              <Card className="divide-y">
                {pastPassPurchases.map((purchase) => (
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
        </div>
      )}

      {/* Parties Tab */}
      {activeTab === 'parties' && (
        <div className="space-y-8">
          {/* Active Parties */}
          {activePartyPurchases.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Your Active Parties</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activePartyPurchases.map((purchase) => (
                  <Card key={purchase.id} className="p-6 border-l-4 border-l-purple-400">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{purchase.name}</h4>
                        <p className="text-gray-600">Party Package</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Party scheduling info - use Check In tab for actual scheduling */}
                      {!purchase.partyDate && (
                        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg text-center text-sm">
                          🗓️ Visit the Check In tab to schedule your party
                        </div>
                      )}

                      {/* Party Scheduling Information */}
                      {purchase.type === 'party_package' && purchase.partyDate && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600">🎉</span>
                              <span className="font-medium text-purple-800">Party Scheduled</span>
                            </div>
                            <button
                              onClick={() => {
                                setSchedulingParty(purchase);
                                setShowPartyScheduling(true);
                              }}
                              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-md transition-colors"
                            >
                              📅 Reschedule
                            </button>
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
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Purchase New Party Packages - Always Visible */}
          <div>
            <h3 className="text-xl font-semibold mb-4">🛒 Purchase Party Packages</h3>

            {/* No Payment Methods Warning */}
            {customer.savedCards.length === 0 && (
              <Card className="p-6 mb-4 border-yellow-200 bg-yellow-50">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white">💳</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Add a Payment Method First</h4>
                    <p className="text-yellow-600 text-sm">
                      You'll need to add a payment method in the Payments tab before you can purchase party packages.
                      <br />
                      <strong>💡 Tip:</strong> Use the "Use Demo Card" button for quick testing!
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 border-l-8 border-l-purple-300 bg-purple-50">
              <div className="grid gap-4 text-left">
                {availableParties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">🎉 No party packages available</p>
                    <p className="text-sm">Please check back later or contact staff.</p>
                  </div>
                ) : (
                  availableParties.map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 text-lg">
                          🎉 {product.name}
                        </span>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(product.price)}</p>
                        {product.stripePurchaseLink && (
                          <p className="text-xs text-blue-600 mt-1">💳 Stripe payment available</p>
                        )}
                      </div>
                    <Button
                      onClick={() => {
                        if (customer.savedCards.length === 0) {
                          setActiveTab('payments');
                          return;
                        }
                        if (confirmingProduct === product.id) {
                          handleConfirmPurchase(product.id);
                        } else {
                          handlePurchase(product.id);
                        }
                      }}
                      size="lg"
                      disabled={processingProduct === product.id}
                      className={`px-6 py-3 text-white transition-colors ${
                        confirmingProduct === product.id
                          ? 'bg-purple-600 hover:bg-purple-700 animate-pulse'
                          : processingProduct === product.id
                          ? 'bg-purple-500'
                          : customer.savedCards.length === 0
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {processingProduct === product.id
                        ? 'Processing...'
                        : confirmingProduct === product.id
                        ? '✓ Confirm Purchase'
                        : customer.savedCards.length === 0
                        ? '💳 Add Payment First'
                        : 'Buy Now'
                      }
                    </Button>
                  </div>
                ))
                )}
              </div>
            </Card>
          </div>

          {/* Party Purchase History */}
          {pastPartyPurchases.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Party Purchase History</h3>
              <Card className="divide-y">
                {pastPartyPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{purchase.name}</h4>
                        <p className="text-sm text-gray-600">
                          Purchased {formatDate(purchase.purchaseDate)}
                        </p>
                        {purchase.partyDate && (
                          <p className="text-sm text-purple-600">
                            Party Date: {formatDate(purchase.partyDate)}
                          </p>
                        )}
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
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-8">
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

                  <div className="flex items-center space-x-2">
                    {card.isDefault && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Default
                      </span>
                    )}

                    {/* Delete Button with 5-second confirmation */}
                    <button
                      onClick={() => {
                        if (confirmingDelete === card.id) {
                          handleConfirmDelete(card.id);
                        } else {
                          handleDeleteCardClick(card.id);
                        }
                      }}
                      disabled={customer.savedCards.length === 1} // Don't allow deleting the last card
                      className={`p-2 rounded-lg transition-colors ${
                        customer.savedCards.length === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : confirmingDelete === card.id
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                      }`}
                      title={customer.savedCards.length === 1 ? 'Cannot delete your only payment method' : 'Delete payment method'}
                    >
                      {confirmingDelete === card.id ? '✓' : '🗑️'}
                    </button>
                  </div>
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

        <AddPaymentMethodModal
          isOpen={showAddCard}
          onClose={() => setShowAddCard(false)}
          onSuccess={handleAddPaymentMethodSuccess}
        />
          </div>
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
                existingPartyData={{
                  partyDate: schedulingParty.partyDate,
                  partyStartTime: schedulingParty.partyStartTime,
                  partyEndTime: schedulingParty.partyEndTime,
                  partyGuests: schedulingParty.partyGuests,
                  partyNotes: schedulingParty.partyNotes
                }}
              />
            )}

      {/* Child Selection Modal */}
      {showChildSelectionModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowChildSelectionModal(false);
              setSelectedProductForPurchase('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowChildSelectionModal(false);
              setSelectedProductForPurchase('');
            }
          }}
        >
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowChildSelectionModal(false);
                setSelectedProductForPurchase('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-4">Select Child for Pass</h3>
            <p className="text-gray-600 mb-4">
              Which child is this {AVAILABLE_PRODUCTS.find(p => p.id === selectedProductForPurchase)?.name} for?
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {customer.children
                .filter(child => child.waiverSigned)
                .map(child => (
                  <button
                    key={child.id}
                    onClick={() => handleChildSelectionForPurchase(child.id)}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{child.name}</p>
                        <p className="text-sm text-gray-600">Age: {child.age}</p>
                      </div>
                      <div className="text-green-600">
                        ✅ Waiver Signed
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>

            {customer.children.some(child => !child.waiverSigned) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Some children don't have signed waivers and can't be selected.
                  <button
                    onClick={() => {
                      setShowChildSelectionModal(false);
                      setActiveTab('children');
                    }}
                    className="text-yellow-700 underline ml-1"
                  >
                    Sign waivers in Children tab
                  </button>
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowChildSelectionModal(false);
                  setSelectedProductForPurchase('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
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
