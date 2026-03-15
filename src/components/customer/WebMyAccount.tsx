'use client';

/**
 * Web My Account Dashboard
 * Mirrors the POS CustomerDashboard UI for web users
 * Uses web authentication (Supabase) instead of POS phone login
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddPaymentMethodModal } from '@/components/pos/AddPaymentMethodModal';
import { CountdownTimer } from '@/components/pos/CountdownTimer';
import { PartySchedulingModal } from '@/components/pos/PartySchedulingModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { WaiverModal } from '@/components/ui/WaiverModal';
import { PartyAvailabilityCalendar } from '@/components/customer/PartyAvailabilityCalendar';
import { useUser } from '@/hooks/useUser';
import { formatCurrency } from '@/lib/utils/productHelpers';
import { parseDateString } from '@/lib/utils';
import {
  isComplimentaryPurchase,
  isUnlimitedPurchase,
  getRemainingSessionsDisplay,
  getSessionProgressPercent,
} from '@/lib/utils/customerTransforms';
import type { Child, Purchase, SavedCard } from '@/lib/types/customer';

type TabType = 'children' | 'passes' | 'parties' | 'payments';

// Inner component that uses searchParams - must be in its own Suspense boundary
function WebMyAccountContent() {
  const { user, profile, loading: userLoading } = useUser();
  const searchParams = useSearchParams();

  // State for customer data
  const [children, setChildren] = useState<Child[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [giftCardBalance, setGiftCardBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Products state - loads independently from user data
  const [availablePasses, setAvailablePasses] = useState<any[]>([]);
  const [availableParties, setAvailableParties] = useState<any[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Tab state - default to children, update from URL after mount
  const [activeTab, setActiveTab] = useState<TabType>('children');

  // Read tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['children', 'passes', 'parties', 'payments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // UI state
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverChild, setWaiverChild] = useState<Child | null>(null);
  const [showViewWaiver, setShowViewWaiver] = useState(false);
  const [viewWaiverChildName, setViewWaiverChildName] = useState<string>();
  const [childName, setChildName] = useState('');
  const [childBirthdate, setChildBirthdate] = useState('');
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isSigningWaiver, setIsSigningWaiver] = useState(false);

  // Auto-renew toggle state
  const [togglingAutoRenew, setTogglingAutoRenew] = useState<string | null>(null);

  // Purchase state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProduct, setProcessingProduct] = useState<string>('');
  const [purchaseSuccess, setPurchaseSuccess] = useState<string>('');
  const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedChildForPurchase, setSelectedChildForPurchase] = useState<string>('');
  const [selectedBirthdayChildren, setSelectedBirthdayChildren] = useState<Set<string>>(new Set());
  const [showChildSelectionModal, setShowChildSelectionModal] = useState(false);
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<string>('');
  const [selectedChildrenForFamily, setSelectedChildrenForFamily] = useState<string[]>([]);

  // Party scheduling state
  const [showPartyScheduling, setShowPartyScheduling] = useState(false);
  const [schedulingParty, setSchedulingParty] = useState<Purchase | null>(null);

  // Gift card state
  const [giftCardCode, setGiftCardCode] = useState('');
  const [redeemingGiftCard, setRedeemingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardSuccess, setGiftCardSuccess] = useState<string | null>(null);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    title: string;
    message: string;
    variant?: 'success' | 'warning' | 'error';
    details?: any;
  }>({ title: '', message: '' });

  // Delete confirmation state
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteTimeout, setDeleteTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPassHistory, setShowPassHistory] = useState(false);
  const [showPartyHistory, setShowPartyHistory] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch children
      const childrenRes = await fetch('/api/children');
      if (childrenRes.ok) {
        const childrenData = await childrenRes.json();
        const formattedChildren = childrenData.map((c: any) => ({
          id: c.id,
          name: c.name,
          birthdate: c.birthdate,
          age: calculateAge(c.birthdate),
          waiverSigned: c.waiver_signed,
          waiverSignedDate: c.waiver_signed_date,
          createdAt: c.created_at,
        }));
        setChildren(formattedChildren);
      }

      // Fetch purchases
      const purchasesRes = await fetch('/api/purchases');
      if (purchasesRes.ok) {
        const { purchases: purchasesData } = await purchasesRes.json();
        const formattedPurchases = (purchasesData || []).map((p: any) => ({
          id: p.id,
          type: p.type,
          name: p.name,
          price: p.price,
          purchaseDate: p.purchase_date,
          expiryDate: p.expiry_date,
          firstUseDate: p.first_use_date,
          actualExpiryDate: p.actual_expiry_date,
          usedSessions: p.used_sessions,
          totalSessions: p.total_sessions,
          status: p.status,
          autoRenew: p.auto_renew,
          nextRenewalDate: p.next_renewal_date,
          childId: p.child_id,
          partyDate: p.party_date,
          partyStartTime: p.party_start_time,
          partyEndTime: p.party_end_time,
          partyGuests: p.party_guests,
          partyNotes: p.party_notes,
        }));
        setPurchases(formattedPurchases);
      }

      // Fetch payment methods
      const cardsRes = await fetch('/api/stripe/payment-methods');
      if (cardsRes.ok) {
        const { paymentMethods } = await cardsRes.json();
        const formattedCards = paymentMethods.map((pm: any) => ({
          id: pm.stripe_payment_method_id,
          last4: pm.last4,
          brand: pm.brand,
          expiryMonth: pm.expiry_month,
          expiryYear: pm.expiry_year,
          isDefault: pm.is_default,
        }));
        setSavedCards(formattedCards);
      }

      // Fetch gift card balance
      const balanceRes = await fetch('/api/gift-cards/balance');
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setGiftCardBalance(balanceData.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load products from database API (configured in admin panel)
  // This runs independently from user data - products should ALWAYS load first
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Fetch passes and parties in parallel
        const [passesResponse, partiesResponse] = await Promise.all([
          fetch('/api/passes'),
          fetch('/api/parties')
        ]);

        // Process passes
        if (passesResponse.ok) {
          const { passes } = await passesResponse.json();
          const formattedPasses = (passes || []).map((pass: any) => ({
            id: pass.id,
            name: pass.name,
            price: pass.price,
            description: pass.description,
            sessions: pass.sessions_included || pass.sessionsIncluded || 1,
            validity: pass.category === 'day' ? `${pass.duration} hours` : `${pass.duration} days`,
            stripePurchaseLink: pass.stripe_purchase_link || pass.stripePurchaseLink || '',
            category: pass.category,
          }));
          setAvailablePasses(formattedPasses);
        }

        // Process parties
        if (partiesResponse.ok) {
          const { parties } = await partiesResponse.json();
          const formattedParties = (parties || []).map((party: any) => ({
            id: party.id,
            name: party.name,
            price: party.base_price || party.basePrice,
            description: party.description
              ? `${party.description} (${party.capacity} kids, ${party.duration} hours)`
              : `Party package for up to ${party.capacity} kids, ${party.duration} hours`,
            sessions: 1,
            validity: '90 days to book',
            stripePurchaseLink: party.stripe_purchase_link || party.stripePurchaseLink || '',
            capacity: party.capacity,
            duration: party.duration,
          }));
          setAvailableParties(formattedParties);
        }
      } catch (error) {
        console.error('Error loading products from API:', error);
      } finally {
        setProductsLoaded(true);
      }
    };

    loadProducts();
  }, []);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleToggleAutoRenew = async (purchase: Purchase) => {
    const newAutoRenew = !purchase.autoRenew;
    const action = newAutoRenew ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} auto-renew for "${purchase.name}"?`)) {
      return;
    }

    setTogglingAutoRenew(purchase.id);
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/auto-renew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: newAutoRenew }),
      });

      if (response.ok) {
        const data = await response.json();
        setPurchases(prev => prev.map(p =>
          p.id === purchase.id
            ? { ...p, autoRenew: data.autoRenew, nextRenewalDate: data.nextRenewalDate }
            : p
        ));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update auto-renew');
      }
    } catch (err) {
      console.error('Error toggling auto-renew:', err);
      alert('Failed to update auto-renew');
    } finally {
      setTogglingAutoRenew(null);
    }
  };

  // Helper functions
  const calculateAge = (birthdate: string): number => {
    const today = new Date();
    // Use parseDateString to handle YYYY-MM-DD format correctly in all timezones
    const birth = parseDateString(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    // Use parseDateString to avoid UTC timezone bug for date-only strings
    return parseDateString(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getChildName = (childId: string): string => {
    const child = children.find(c => c.id === childId);
    return child ? child.name : 'Unknown Child';
  };

  // Children management
  const handleAddChild = async () => {
    if (!childName.trim() || !childBirthdate || !user) return;

    setIsAddingChild(true);
    try {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user.id,
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

      setChildName('');
      setChildBirthdate('');
      setShowAddChild(false);

      setSuccessDetails({
        title: 'Child Added Successfully!',
        message: `${childName.trim()} has been added to your account. Next, you'll need to sign a waiver for them to purchase passes.`
      });
      setShowSuccessModal(true);

      // After modal, show waiver
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
      }, 5000);

      // Refresh data
      await fetchData();
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
        body: JSON.stringify({ sign_waiver: true }),
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

      await fetchData();
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
    const hasActivePasses = purchases.some(p =>
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
      await fetchData();
    } catch (error) {
      console.error('Error deleting child:', error);
      setSuccessDetails({
        title: 'Error Deleting Child',
        message: error instanceof Error ? error.message : 'Failed to delete child. Please try again.'
      });
      setShowSuccessModal(true);
    }
  };

  // Gift card redemption
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

  // Purchase handling - uses direct payment with saved cards for one-click purchases
  const handlePurchase = (productId: string) => {
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
    }
    setConfirmingProduct(productId);
    const timeout = setTimeout(() => {
      setConfirmingProduct(null);
    }, 5000);
    setConfirmTimeout(timeout);
  };

  // Helper to detect family passes
  const isFamilyPass = (productName: string): boolean => {
    return productName.toLowerCase().includes('family');
  };

  const isSelectedProductFamily = (() => {
    const product = availablePasses.find(p => p.id === selectedProductForPurchase);
    return product ? isFamilyPass(product.name) : false;
  })();

  // Children who already have an active day pass purchased today (prevents double-assigning)
  const childrenWithDayPassToday = new Set(
    purchases
      .filter(p => {
        if (p.type !== 'day_pass' || p.status === 'refunded') return false;
        const today = new Date().toDateString();
        return new Date(p.purchaseDate).toDateString() === today;
      })
      .map(p => p.childId)
      .filter(Boolean)
  );

  const isSelectedProductDayPass = (() => {
    const product = availablePasses.find(p => p.id === selectedProductForPurchase);
    if (!product) return false;
    return product.category === 'day' || product.name?.toLowerCase().includes('day');
  })();

  const handleChildSelectionForPurchase = (childId: string) => {
    setSelectedChildForPurchase(childId);
    setShowChildSelectionModal(false);
    if (selectedProductForPurchase) {
      handleConfirmPurchase(selectedProductForPurchase, childId);
    }
  };

  // Get default payment method for one-click purchase
  const getDefaultPaymentMethod = () => {
    const defaultCard = savedCards.find(c => c.isDefault);
    return defaultCard || savedCards[0] || null;
  };

  const handleFamilyPassConfirm = () => {
    if (selectedChildrenForFamily.length === 0) return;
    setShowChildSelectionModal(false);
    if (selectedProductForPurchase) {
      handleConfirmPurchase(selectedProductForPurchase, selectedChildrenForFamily[0], selectedChildrenForFamily);
    }
  };

  const toggleChildForFamily = (childId: string) => {
    setSelectedChildrenForFamily(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const handleConfirmPurchase = async (productId: string, childId?: string, familyChildIds?: string[]) => {
    setConfirmingProduct(null);
    if (confirmTimeout) {
      clearTimeout(confirmTimeout);
      setConfirmTimeout(null);
    }

    const allProducts = [...availablePasses, ...availableParties];
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }

    const isPassPurchase = availablePasses.some(p => p.id === productId);
    const effectiveChildId = childId || selectedChildForPurchase;

    if (isPassPurchase) {
      if (!effectiveChildId) {
        setSuccessDetails({
          title: 'Child Selection Required',
          message: 'Please select which child this pass is for before purchasing.',
          variant: 'warning'
        });
        setShowSuccessModal(true);
        return;
      }

      const selectedChild = children.find(c => c.id === effectiveChildId);
      if (!selectedChild || !selectedChild.waiverSigned) {
        setSuccessDetails({
          title: 'Waiver Required',
          message: 'The selected child must have a signed waiver before purchasing a pass.',
          variant: 'warning'
        });
        setShowSuccessModal(true);
        return;
      }
    }

    // Require saved payment method for one-click purchase
    const paymentMethod = getDefaultPaymentMethod();
    if (!paymentMethod) {
      setSuccessDetails({
        title: 'Payment Method Required',
        message: 'Please add a payment method in the Payments tab first.',
        variant: 'warning'
      });
      setShowSuccessModal(true);
      setActiveTab('payments');
      return;
    }

    if (isProcessing || processingProduct) return;

    setIsProcessing(true);
    setProcessingProduct(productId);

    try {
      // Map product type from category field
      let purchaseType: Purchase['type'];
      if (product.category === 'day') {
        purchaseType = 'day_pass';
      } else if (product.category === 'weekly') {
        purchaseType = 'weekly_pass';
      } else if (product.category === 'monthly') {
        purchaseType = 'monthly_pass';
      } else if (isPassPurchase) {
        // Fallback: infer from name if category not set
        const lowerName = product.name.toLowerCase();
        if (lowerName.includes('day')) {
          purchaseType = 'day_pass';
        } else if (lowerName.includes('punch') || lowerName.includes('weekly')) {
          purchaseType = 'weekly_pass';
        } else if (lowerName.includes('monthly') || lowerName.includes('membership')) {
          purchaseType = 'monthly_pass';
        } else {
          purchaseType = 'day_pass';
        }
      } else {
        purchaseType = 'party_package';
      }

      // Use direct payment API with saved card for one-click purchase
      const response = await fetch('/api/stripe/direct-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          productName: product.name,
          productPrice: product.price,
          productDescription: product.description,
          purchaseType: purchaseType,
          childId: isPassPurchase ? effectiveChildId : (purchaseType === 'party_package' && selectedBirthdayChildren.size > 0 ? Array.from(selectedBirthdayChildren)[0] : undefined),
          childrenIds: purchaseType === 'party_package' && selectedBirthdayChildren.size > 0 ? Array.from(selectedBirthdayChildren) : undefined,
          childrenIds: (isPassPurchase && familyChildIds && familyChildIds.length > 0) ? familyChildIds : undefined,
          paymentMethodId: paymentMethod.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Handle 3DS authentication if required
      if (data.requiresAction && data.clientSecret) {
        // For now, show message - could integrate Stripe.js for 3DS handling
        setSuccessDetails({
          title: 'Additional Authentication Required',
          message: 'Your bank requires additional verification. Please try again or use a different card.',
          variant: 'warning'
        });
        setShowSuccessModal(true);
        return;
      }

      // Purchase successful!
      if (data.success) {
        setPurchaseSuccess(product.name);
        setTimeout(() => setPurchaseSuccess(''), 5000);

        // Show success with payment details
        const message = data.giftCardUsed > 0
          ? `${product.name} purchased! $${data.amountCharged?.toFixed(2) || product.price.toFixed(2)} charged to card ending in ${paymentMethod.last4}. $${data.giftCardUsed.toFixed(2)} gift card credit applied.`
          : `${product.name} purchased! $${product.price.toFixed(2)} charged to card ending in ${paymentMethod.last4}.`;

        setSuccessDetails({
          title: '🎉 Purchase Complete!',
          message: message
        });
        setShowSuccessModal(true);

        await fetchData();
      } else {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      if (isPassPurchase) {
        setSelectedChildForPurchase('');
      }
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

  // Party scheduling
  const handlePartySchedule = async (partyData: {
    partyDate: string;
    partyStartTime: string;
    partyEndTime: string;
    partyGuests: number;
    partyNotes: string;
  }) => {
    if (!schedulingParty) return;

    const response = await fetch(`/api/purchases/${schedulingParty.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party_date: partyData.partyDate,
        party_start_time: partyData.partyStartTime,
        party_end_time: partyData.partyEndTime,
        party_guests: partyData.partyGuests,
        party_notes: partyData.partyNotes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to schedule party';
      setSuccessDetails({
        title: 'Error Scheduling Party',
        message: errorMessage
      });
      setShowSuccessModal(true);
      throw new Error(errorMessage);
    }

    setShowPartyScheduling(false);
    setSchedulingParty(null);

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    setSuccessDetails({
      title: '🎉 Party Scheduled!',
      message: 'Your party has been successfully scheduled!',
      details: {
        date: partyData.partyDate,
        time: `${formatTime(partyData.partyStartTime)} - ${formatTime(partyData.partyEndTime)}`,
        guests: partyData.partyGuests,
        type: schedulingParty.name
      }
    });
    setShowSuccessModal(true);

    await fetchData();
  };

  // Payment method handling
  const handleAddPaymentMethodSuccess = async () => {
    // Close modal immediately for better UX
    setShowAddCard(false);

    // Set loading state while we sync
    setIsLoading(true);

    try {
      // Small delay to allow Stripe webhook/sync to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch updated data
      await fetchData();

      // Show success message
      setSuccessDetails({
        title: 'Payment Method Added',
        message: 'Your payment method has been saved successfully!'
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error refreshing payment methods:', error);
      setSuccessDetails({
        title: 'Payment Method Added',
        message: 'Your card was saved. Please refresh if you don\'t see it.',
        variant: 'warning'
      });
      setShowSuccessModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCardClick = (cardId: string) => {
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
    }
    setConfirmingDelete(cardId);
    const timeout = setTimeout(() => {
      setConfirmingDelete(null);
    }, 5000);
    setDeleteTimeout(timeout);
  };

  const handleConfirmDelete = async (cardId: string) => {
    setConfirmingDelete(null);
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
      setDeleteTimeout(null);
    }

    try {
      const response = await fetch(`/api/stripe/payment-methods/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      await fetchData();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setSuccessDetails({
        title: 'Error',
        message: 'Failed to delete payment method. Please try again.'
      });
      setShowSuccessModal(true);
    }
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (confirmTimeout) clearTimeout(confirmTimeout);
      if (deleteTimeout) clearTimeout(deleteTimeout);
    };
  }, [confirmTimeout, deleteTimeout]);

  // Filter purchases by type (with defensive array check)
  const purchasesArray = Array.isArray(purchases) ? purchases : [];
  const passPurchases = purchasesArray.filter(p => p.type !== 'party_package');
  const partyPurchases = purchasesArray.filter(p => p.type === 'party_package');
  // Filter passes: treat passes with expired dates as non-active even if DB status hasn't caught up yet
  const now = new Date();
  const isPassExpired = (p: typeof passPurchases[0]) =>
    p.actualExpiryDate && new Date(p.actualExpiryDate) < now;
  const activePassPurchases = passPurchases.filter(p => p.status === 'active' && !isPassExpired(p));
  const pastPassPurchases = passPurchases.filter(p => p.status !== 'active' || isPassExpired(p));
  const activePartyPurchases = partyPurchases.filter(p => p.status === 'active' && !isPassExpired(p));
  const pastPartyPurchases = partyPurchases.filter(p => p.status !== 'active' || isPassExpired(p));

  // Loading state - only block on initial auth check, not user data loading
  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 flex items-center justify-center" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Card className="p-8 text-center">
          <p className="text-gray-600">Please log in to view your account.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome back, {profile.name}! 🐝</h2>
              <p className="text-yellow-100">
                Member since {formatDate(profile.created_at)}
                {profile.last_visit && ` • Last visit: ${formatDate(profile.last_visit)}`}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
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
                className="px-3 py-2 border rounded-lg font-mono text-sm flex-1 min-w-0 sm:w-52"
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
        <div className="border-b border-gray-200 bg-gray-50 rounded-lg overflow-hidden">
          <nav className="flex space-x-1 sm:space-x-2 p-1.5 sm:p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('children')}
              className={`flex-1 min-w-0 py-2.5 px-2 sm:py-4 sm:px-6 rounded-lg font-bold text-xs sm:text-lg transition-all duration-200 ${
                activeTab === 'children'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105 border-2 border-blue-600'
                  : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2">
                <span className="text-lg sm:text-2xl">👶</span>
                <span>Children<span className="sm:hidden"><br />({children.length})</span><span className="hidden sm:inline"> ({children.length})</span></span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`flex-1 min-w-0 py-2.5 px-2 sm:py-4 sm:px-6 rounded-lg font-bold text-xs sm:text-lg transition-all duration-200 ${
                activeTab === 'passes'
                  ? 'bg-yellow-500 text-white shadow-lg transform scale-105 border-2 border-yellow-600'
                  : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2">
                <span className="text-lg sm:text-2xl">🎫</span>
                <span>Passes<span className="sm:hidden"><br />({activePassPurchases.length})</span><span className="hidden sm:inline"> ({activePassPurchases.length})</span></span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('parties')}
              className={`flex-1 min-w-0 py-2.5 px-2 sm:py-4 sm:px-6 rounded-lg font-bold text-xs sm:text-lg transition-all duration-200 ${
                activeTab === 'parties'
                  ? 'bg-purple-500 text-white shadow-lg transform scale-105 border-2 border-purple-600'
                  : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2">
                <span className="text-lg sm:text-2xl">🎉</span>
                <span>Parties<span className="sm:hidden"><br />({activePartyPurchases.length})</span><span className="hidden sm:inline"> ({activePartyPurchases.length})</span></span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 min-w-0 py-2.5 px-2 sm:py-4 sm:px-6 rounded-lg font-bold text-xs sm:text-lg transition-all duration-200 ${
                activeTab === 'payments'
                  ? 'bg-green-500 text-white shadow-lg transform scale-105 border-2 border-green-600'
                  : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-2 border-transparent shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2">
                <span className="text-lg sm:text-2xl">💳</span>
                <span>Payments<span className="sm:hidden"><br />({savedCards.length})</span><span className="hidden sm:inline"> ({savedCards.length})</span></span>
              </div>
            </button>
          </nav>
        </div>

        {/* Children Tab */}
        {activeTab === 'children' && (
          <div className="space-y-8">
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

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your children...</p>
              </div>
            ) : children.length === 0 ? (
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
                {children.map((child) => (
                  <Card key={child.id} className="p-6 border-l-4 border-l-blue-400">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{child.name}</h4>
                        <p className="text-gray-600">Age: {child.age}</p>
                        <p className="text-sm text-gray-500">
                          Born: {parseDateString(child.birthdate).toLocaleDateString()}
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
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Waiver Status:</span>
                        {child.waiverSigned ? (
                          <div className="flex items-center space-x-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                              ✅ Signed
                            </span>
                            <button
                              onClick={() => {
                                setViewWaiverChildName(child.name);
                                setShowViewWaiver(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              View Waiver
                            </button>
                          </div>
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

                      {/* Active Passes for this child */}
                      {(() => {
                        const childPasses = purchases.filter(p =>
                          p.childId === child.id && p.status === 'active'
                        );
                        return childPasses.length > 0 && (
                          <div>
                            <p className="font-medium text-sm text-gray-700 mb-2">Active Passes:</p>
                            {childPasses.map(pass => (
                              <div key={pass.id} className="bg-yellow-50 p-2 rounded text-sm">
                                <span className="font-medium">{pass.name}</span>
                                {pass.totalSessions === 999 ? (
                                  <span className="text-gray-600 ml-2">- Unlimited</span>
                                ) : (
                                  <span className="text-gray-600 ml-2">
                                    - {pass.totalSessions - pass.usedSessions} visits left
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {child.waiverSigned && child.waiverSignedDate && (
                        <p className="text-xs text-gray-500">
                          Waiver signed: {parseDateString(child.waiverSignedDate).toLocaleDateString()}
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
              >
                <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
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
              >
                <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
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
                    <Card key={purchase.id} className={`p-6 border-l-4 ${isComplimentaryPurchase(purchase) ? 'border-l-purple-400' : 'border-l-green-400'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-lg">{purchase.name}</h4>
                            {isComplimentaryPurchase(purchase) && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                Complimentary
                              </span>
                            )}
                            {(purchase.giftCardAmountUsed ?? 0) > 0 && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                🎁 ${purchase.giftCardAmountUsed?.toFixed(2)} gift card applied
                              </span>
                            )}
                          </div>
                          {purchase.childId && (
                            <p className="text-blue-600 font-medium text-sm">
                              👶 {getChildName(purchase.childId)}
                            </p>
                          )}
                          <p className="text-gray-600 text-sm">
                            {getRemainingSessionsDisplay(purchase)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                              Active
                            </span>
                            {purchase.type === 'monthly_pass' && (
                              <button
                                onClick={() => handleToggleAutoRenew(purchase)}
                                disabled={togglingAutoRenew === purchase.id}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                  purchase.autoRenew
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                                title={purchase.autoRenew ? 'Click to disable auto-renew' : 'Click to enable auto-renew'}
                              >
                                <span className={`inline-block w-7 h-4 rounded-full relative transition-colors ${
                                  purchase.autoRenew ? 'bg-blue-500' : 'bg-gray-300'
                                }`}>
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                                    purchase.autoRenew ? 'left-3.5' : 'left-0.5'
                                  }`} />
                                </span>
                                {togglingAutoRenew === purchase.id ? 'Updating...' : 'Auto-renew'}
                              </button>
                            )}
                          </div>
                          {purchase.firstUseDate && purchase.actualExpiryDate && (
                            <CountdownTimer
                              expiryDate={purchase.actualExpiryDate}
                              type={purchase.type as 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package'}
                              onExpired={() => fetchData()}
                            />
                          )}
                        </div>
                      </div>

                      {/* Session Progress Bar (for non-unlimited passes) */}
                      {!isUnlimitedPurchase(purchase) && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{purchase.usedSessions} used</span>
                            <span>{purchase.totalSessions - purchase.usedSessions} remaining</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${getSessionProgressPercent(purchase)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {/* Pass Date Info */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Purchased: {formatDate(purchase.purchaseDate)}</p>
                          {purchase.firstUseDate && (
                            <p>First used: {formatDate(purchase.firstUseDate)}</p>
                          )}
                          {purchase.actualExpiryDate && (
                            <p>Expires: {formatDate(purchase.actualExpiryDate)}</p>
                          )}
                          {purchase.type === 'monthly_pass' && purchase.autoRenew && purchase.nextRenewalDate && (
                            <p className="text-blue-600">Next renewal: {formatDate(purchase.nextRenewalDate)}</p>
                          )}
                          {purchase.type === 'monthly_pass' && !purchase.autoRenew && (
                            <p className="text-gray-400">Auto-renew off</p>
                          )}
                        </div>

                        {/* Pass Status Info */}
                        {!purchase.firstUseDate && (
                          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center text-sm">
                            🎫 Visit our facility to check in and use this pass
                          </div>
                        )}

                        {purchase.firstUseDate && purchase.actualExpiryDate && (
                          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-center text-sm">
                            {purchase.type === 'day_pass' ? 'Each check-in gives 12 hours of play time' :
                             purchase.type === 'weekly_pass' ? 'Pass expires 7 days after first use' :
                             purchase.type === 'monthly_pass' ? 'Pass expires 30 days after first use' :
                             'This pass will expire automatically'}
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
              <h3 className="text-xl font-semibold mb-4">🛒 Purchase New Passes</h3>

              {children.length === 0 && (
                <Card className="p-6 mb-4 border-blue-200 bg-blue-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white">👶</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">Add Children First</h4>
                      <p className="text-blue-600 text-sm">
                        You need to add at least one child with a signed waiver before purchasing passes.
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

              {savedCards.length === 0 && (
                <Card className="p-6 mb-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white">💳</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Add a Payment Method First</h4>
                      <p className="text-yellow-600 text-sm">
                        You'll need to add a payment method in the Payments tab before you can purchase passes.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6 border-l-8 border-l-green-300 bg-green-50">
                <div className="grid gap-4 text-left">
                  {!productsLoaded ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-3"></div>
                      <p className="text-sm">Loading passes...</p>
                    </div>
                  ) : availablePasses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg mb-2">🎫 No passes available</p>
                      <p className="text-sm">Please check back later or contact staff.</p>
                    </div>
                  ) : (
                    availablePasses.map((product) => (
                      <div key={product.id} className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 text-lg">
                            🎫 {product.name}
                          </span>
                          <p className="text-sm text-gray-600">{product.description}</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(product.price)}</p>
                          {savedCards.length > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              💳 One-click purchase with •••• {getDefaultPaymentMethod()?.last4 || ''}
                            </p>
                          )}
                          {giftCardBalance > 0 && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              {giftCardBalance >= product.price
                                ? '🎁 Fully covered by gift card balance!'
                                : `🎁 $${Math.min(giftCardBalance, product.price).toFixed(2)} gift card credit will be applied`}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            if (children.length === 0) {
                              setActiveTab('children');
                              return;
                            }
                            if (savedCards.length === 0) {
                              setActiveTab('payments');
                              return;
                            }
                            const isDayPass = product.category === 'day' || product.name?.toLowerCase().includes('day');
                            const isFamilyProduct = isFamilyPass(product.name);
                            const eligibleChildren = children.filter(c =>
                              c.waiverSigned && !(isDayPass && childrenWithDayPassToday.has(c.id))
                            );
                            if (eligibleChildren.length === 0) {
                              setSuccessDetails({
                                title: 'No Eligible Children',
                                message: isDayPass
                                  ? 'All children already have a day pass for today.'
                                  : 'No children with signed waivers available.',
                                variant: 'warning'
                              });
                              setShowSuccessModal(true);
                              return;
                            }
                            if (isFamilyProduct) {
                              // Family pass: always show multi-child selector
                              setSelectedChildrenForFamily([]);
                              setSelectedProductForPurchase(product.id);
                              setShowChildSelectionModal(true);
                            } else if (eligibleChildren.length === 1) {
                              handleConfirmPurchase(product.id, eligibleChildren[0].id);
                            } else {
                              setSelectedProductForPurchase(product.id);
                              setShowChildSelectionModal(true);
                            }
                          }}
                          size="lg"
                          disabled={processingProduct === product.id}
                          className={`px-6 py-3 text-white transition-colors ${
                            processingProduct === product.id
                              ? 'bg-blue-600'
                              : children.length === 0
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : savedCards.length === 0
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {processingProduct === product.id
                            ? 'Processing...'
                            : children.length === 0
                            ? '👶 Add Child First'
                            : savedCards.length === 0
                            ? '💳 Add Payment First'
                            : `Buy Now (•••• ${getDefaultPaymentMethod()?.last4 || ''})`
                          }
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Pass Purchase History - collapsed by default */}
            {pastPassPurchases.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPassHistory(!showPassHistory)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className={`transform transition-transform ${showPassHistory ? 'rotate-90' : ''}`}>&#9654;</span>
                  Expired / Used Passes ({pastPassPurchases.length})
                </button>
                {showPassHistory && (
                  <Card className="divide-y mt-2">
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
                            {(purchase.giftCardAmountUsed ?? 0) > 0 && (
                              <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium mb-1">
                                🎁 ${purchase.giftCardAmountUsed?.toFixed(2)} gift card applied
                              </span>
                            )}
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
                )}
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
                        {!purchase.partyDate ? (
                          <Button
                            onClick={() => {
                              setSchedulingParty(purchase);
                              setShowPartyScheduling(true);
                            }}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            🗓️ Schedule Your Party
                          </Button>
                        ) : (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
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
                                      return `${formatTime(purchase.partyStartTime!)} - ${formatTime(purchase.partyEndTime!)}`;
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

            {/* Check Availability Calendar */}
            <div>
              <h3 className="text-xl font-semibold mb-4">📅 Check Party Availability</h3>
              <PartyAvailabilityCalendar />
            </div>

            {/* Purchase New Party Packages */}
            <div>
              <h3 className="text-xl font-semibold mb-4">🛒 Purchase Party Packages</h3>

              {savedCards.length === 0 && (
                <Card className="p-6 mb-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white">💳</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Add a Payment Method First</h4>
                      <p className="text-yellow-600 text-sm">
                        You'll need to add a payment method in the Payments tab before you can purchase party packages.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Birthday Child Selector */}
              {children.length > 0 && (
                <Card className="p-4 mb-4 border-purple-200 bg-purple-50">
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    🎂 Who is the birthday party for? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {children.map((child) => {
                      const isSelected = selectedBirthdayChildren.has(child.id);
                      return (
                        <label
                          key={child.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-purple-500 bg-purple-100'
                              : 'border-purple-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedBirthdayChildren(prev => {
                                const next = new Set(prev);
                                if (next.has(child.id)) {
                                  next.delete(child.id);
                                } else {
                                  next.add(child.id);
                                }
                                return next;
                              });
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className={`text-sm font-medium ${isSelected ? 'text-purple-800' : 'text-gray-700'}`}>
                            {child.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedBirthdayChildren.size === 0 && (
                    <p className="text-xs text-purple-600 mt-2">Select which child(ren) the birthday party is for before purchasing.</p>
                  )}
                  {selectedBirthdayChildren.size > 0 && (
                    <p className="text-xs text-purple-700 mt-2 font-medium">
                      Party for: {children.filter(c => selectedBirthdayChildren.has(c.id)).map(c => c.name).join(', ')}
                    </p>
                  )}
                </Card>
              )}

              {children.length === 0 && (
                <Card className="p-4 mb-4 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white">👶</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Add a Child First</h4>
                      <p className="text-yellow-600 text-sm">
                        You need to add a child in the Children tab before booking a birthday party.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6 border-l-8 border-l-purple-300 bg-purple-50">
                <div className="grid gap-4 text-left">
                  {!productsLoaded ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                      <p className="text-sm">Loading party packages...</p>
                    </div>
                  ) : availableParties.length === 0 ? (
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
                          {savedCards.length > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              💳 One-click purchase with •••• {getDefaultPaymentMethod()?.last4 || ''}
                            </p>
                          )}
                          {giftCardBalance > 0 && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              {giftCardBalance >= product.price
                                ? '🎁 Fully covered by gift card balance!'
                                : `🎁 $${Math.min(giftCardBalance, product.price).toFixed(2)} gift card credit will be applied`}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            if (savedCards.length === 0) {
                              setActiveTab('payments');
                              return;
                            }
                            if (selectedBirthdayChildren.size === 0) {
                              setSuccessDetails({
                                title: 'Birthday Child Required',
                                message: 'Please select which child(ren) the birthday party is for before purchasing.',
                                variant: 'warning'
                              });
                              setShowSuccessModal(true);
                              return;
                            }
                            handleConfirmPurchase(product.id);
                          }}
                          size="lg"
                          disabled={processingProduct === product.id || selectedBirthdayChildren.size === 0}
                          className={`px-6 py-3 text-white transition-colors ${
                            processingProduct === product.id
                              ? 'bg-purple-500'
                              : savedCards.length === 0
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : selectedBirthdayChildren.size === 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {processingProduct === product.id
                            ? 'Processing...'
                            : savedCards.length === 0
                            ? '💳 Add Payment First'
                            : selectedBirthdayChildren.size === 0
                            ? 'Select Birthday Child'
                            : `Buy Now (•••• ${getDefaultPaymentMethod()?.last4 || ''})`
                          }
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Party Purchase History - collapsed by default */}
            {pastPartyPurchases.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPartyHistory(!showPartyHistory)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className={`transform transition-transform ${showPartyHistory ? 'rotate-90' : ''}`}>&#9654;</span>
                  Expired / Used Parties ({pastPartyPurchases.length})
                </button>
                {showPartyHistory && (
                  <Card className="divide-y mt-2">
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
                )}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Payment Methods</h3>
                <Button onClick={() => setShowAddCard(!showAddCard)}>
                  Add New Card
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading payment methods...</p>
                </div>
              ) : savedCards.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {savedCards.map((card) => (
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

                          <button
                            onClick={() => {
                              if (confirmingDelete === card.id) {
                                handleConfirmDelete(card.id);
                              } else {
                                handleDeleteCardClick(card.id);
                              }
                            }}
                            disabled={savedCards.length === 1}
                            className={`p-2 rounded-lg transition-colors ${
                              savedCards.length === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : confirmingDelete === card.id
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                            }`}
                            title={savedCards.length === 1 ? 'Cannot delete your only payment method' : 'Delete payment method'}
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
          >
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
              <button
                onClick={() => {
                  setShowChildSelectionModal(false);
                  setSelectedProductForPurchase('');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>

              <h3 className="text-lg font-semibold mb-4">
                {isSelectedProductFamily ? 'Select Children for Family Pass' : 'Select Child for Pass'}
              </h3>
              <p className="text-gray-600 mb-4">
                {isSelectedProductFamily
                  ? `Select which children this ${availablePasses.find(p => p.id === selectedProductForPurchase)?.name} covers. All selected children can check in for the duration of the pass.`
                  : `Which child is this ${availablePasses.find(p => p.id === selectedProductForPurchase)?.name} for?`
                }
              </p>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {children
                  .filter(child => child.waiverSigned)
                  .map(child => {
                    const hasDayPassToday = isSelectedProductDayPass && childrenWithDayPassToday.has(child.id);

                    if (isSelectedProductFamily) {
                      const isSelected = selectedChildrenForFamily.includes(child.id);
                      return (
                        <button
                          key={child.id}
                          onClick={() => toggleChildForFamily(child.id)}
                          className={`w-full p-4 text-left border rounded-lg transition-colors ${
                            isSelected
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                              : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{child.name}</p>
                              <p className="text-sm text-gray-600">Age: {child.age}</p>
                            </div>
                            <div className={isSelected ? 'text-green-600' : 'text-gray-300'}>
                              {isSelected ? '✅ Selected' : '○ Tap to select'}
                            </div>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={child.id}
                        onClick={() => !hasDayPassToday && handleChildSelectionForPurchase(child.id)}
                        disabled={hasDayPassToday}
                        className={`w-full p-4 text-left border rounded-lg transition-colors ${
                          hasDayPassToday
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${hasDayPassToday ? 'text-gray-400' : 'text-gray-900'}`}>{child.name}</p>
                            <p className="text-sm text-gray-600">Age: {child.age}</p>
                          </div>
                          {hasDayPassToday ? (
                            <div className="text-gray-400 text-sm">
                              Already has a day pass today
                            </div>
                          ) : (
                            <div className="text-green-600">
                              ✅ Waiver Signed
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                }
              </div>

              {children.some(child => !child.waiverSigned) && (
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
                    setSelectedChildrenForFamily([]);
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                {isSelectedProductFamily && selectedChildrenForFamily.length > 0 && (
                  <Button
                    onClick={handleFamilyPassConfirm}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Confirm {selectedChildrenForFamily.length} Child{selectedChildrenForFamily.length > 1 ? 'ren' : ''}
                  </Button>
                )}
              </div>
            </div>
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
            customerName={profile.name || 'Customer'}
            purchasePrice={schedulingParty.price}
            existingPartyData={{
              partyDate: schedulingParty.partyDate,
              partyStartTime: schedulingParty.partyStartTime,
              partyEndTime: schedulingParty.partyEndTime,
              partyGuests: schedulingParty.partyGuests,
              partyNotes: schedulingParty.partyNotes
            }}
          />
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={successDetails.title}
          message={successDetails.message}
          variant={successDetails.variant}
          details={successDetails.details}
        />

        {/* View Waiver Modal (read-only) */}
        <WaiverModal
          isOpen={showViewWaiver}
          onClose={() => {
            setShowViewWaiver(false);
            setViewWaiverChildName(undefined);
          }}
          childName={viewWaiverChildName}
        />
      </div>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export function WebMyAccount() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    }>
      <WebMyAccountContent />
    </Suspense>
  );
}

