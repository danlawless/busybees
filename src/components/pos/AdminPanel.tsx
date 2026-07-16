'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NewsletterEditor } from '@/components/admin/NewsletterEditor';
import { PromoSpecial, getPromoStatus, getActivePromo, formatPromoDate, formatPromoDateRange, validatePromoCode, validatePromoDates } from '@/lib/utils/promoHelpers';
import { US_TIMEZONES, formatTimeDisplay, to24HourFormat } from '@/lib/utils/timeUtils';
import { PromoBanner } from '@/components/home/PromoBanner';
import {
  PassProduct,
  PartyProduct,
  FoodProduct,
  VolumeDiscount,
  PassCategory,
  ProductCategory,
  Allergen,
  validatePrice,
  validateQuantity,
  validateStripeLinkOptional,
  validateProductName,
  validateDiscountPercent,
  formatCurrency,
  formatPassCategory,
  formatProductCategory,
  formatAllergen,
  getVolumeDiscountsForProduct,
  generateId,
} from '@/lib/utils/productHelpers';
import {
  createPass,
  updatePass,
  deletePass,
  createParty,
  updateParty,
  deleteParty,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/api/products';
import { GroupsManager } from './GroupsManager';
import { AnnouncementManager } from './AnnouncementManager';
import { AfterDarkAdmin } from './AfterDarkAdmin';
import { EventBookingsAdmin } from './EventBookingsAdmin';
import { CouponsAdmin } from './CouponsAdmin';
import { CustomerDetailModal } from './CustomerDetailModal';
import { QRCodeDisplay } from './QRCodeDisplay';
import { parseDateString } from '@/lib/utils';

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
  status: 'active' | 'expired' | 'used' | 'refunded';
  autoRenew?: boolean;
  nextRenewalDate?: string;
  childId?: string; // ID of the child this pass is for (required for passes, optional for party packages)
  childIds?: string[]; // For family passes: all children covered by this purchase
  giftCardAmountUsed?: number; // Portion of price paid from gift-card/account credit (already counted as revenue when the card was sold)
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

interface PartyTimeSlot {
  id: string;
  party_type: 'private' | 'semi_private';
  day_type: 'weekday' | 'weekend';
  start_time: string;
  end_time: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  effective_start_date: string | null;
  effective_end_date: string | null;
  day_of_week: number | null;
  created_at: string;
  updated_at: string;
}

interface AdminPanelProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  promos: PromoSpecial[];
  onUpdatePromos: (promos: PromoSpecial[]) => void;
  passes: PassProduct[];
  onUpdatePasses: (passes: PassProduct[]) => void;
  parties: PartyProduct[];
  onUpdateParties: (parties: PartyProduct[]) => void;
  products: FoodProduct[];
  onUpdateProducts: (products: FoodProduct[]) => void;
  volumeDiscounts: VolumeDiscount[];
  onUpdateVolumeDiscounts: (discounts: VolumeDiscount[]) => void;
  userRole?: 'staff' | 'admin';
}

interface StaffUser {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: 'staff' | 'admin';
  has_staff_password: boolean;
  last_login: string | null;
  created_at: string;
}

type AdminView = 'dashboard' | 'customers' | 'sales' | 'sessions' | 'marketing' | 'newsletter' | 'passes' | 'parties' | 'products' | 'gift-cards' | 'coupons' | 'groups' | 'monthly-members' | 'punch-cards' | 'announcements' | 'after-dark' | 'events' | 'settings';

interface NewsletterSubscriber {
  id: string;
  name: string;
  email: string;
  subscribedAt: string;
  isActive: boolean;
  unsubscribedAt: string | null;
  source: string;
  createdAt: string;
}

interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
}

export function AdminPanel({
  customers,
  onUpdateCustomers,
  promos,
  onUpdatePromos,
  passes,
  onUpdatePasses,
  parties,
  onUpdateParties,
  products,
  onUpdateProducts,
  volumeDiscounts,
  onUpdateVolumeDiscounts,
  userRole = 'admin',
}: AdminPanelProps) {
  const isAdmin = userRole === 'admin';
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [salesDate, setSalesDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [dashboardDate, setDashboardDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [posMode, setPosMode] = useState<'kiosk' | 'staff'>('kiosk');
  const [updatingPosMode, setUpdatingPosMode] = useState(false);
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null);

  // Auto-checkout settings state
  const [autoCheckoutSettings, setAutoCheckoutSettings] = useState({
    timezone: 'America/New_York',
    closingTime: '22:00',
    loading: true,
    saving: false,
    error: null as string | null,
  });

  // Stripe sync states
  const [stripeSyncStatus, setStripeSyncStatus] = useState<{
    loading: boolean;
    syncing: boolean;
    passes: { total: number; synced: number; unsynced: number };
    parties: { total: number; synced: number; unsynced: number };
    products: { total: number; synced: number; unsynced: number };
    lastSyncResult?: { synced: number; errors: number };
  }>({
    loading: true,
    syncing: false,
    passes: { total: 0, synced: 0, unsynced: 0 },
    parties: { total: 0, synced: 0, unsynced: 0 },
    products: { total: 0, synced: 0, unsynced: 0 },
  });
  const [refundTimeout, setRefundTimeout] = useState<NodeJS.Timeout | null>(null);
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);

  // Customer deletion states
  const [confirmingCustomerDelete, setConfirmingCustomerDelete] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [customerDeleteError, setCustomerDeleteError] = useState<string | null>(null);

  // Gift card dashboard states
  interface GiftCardData {
    id: string;
    code: string;
    amount: number;
    remaining_amount: number;
    purchaser_email: string;
    purchaser_name: string;
    recipient_email: string;
    recipient_name: string;
    delivery_method: 'email_recipient' | 'email_self';
    status: 'pending' | 'sent' | 'redeemed' | 'partially_redeemed';
    email_sent_at: string | null;
    redeemed_at: string | null;
    created_at: string;
  }
  const [giftCards, setGiftCards] = useState<GiftCardData[]>([]);
  const [giftCardsLoading, setGiftCardsLoading] = useState(false);
  const [giftCardsStats, setGiftCardsStats] = useState({ total: 0, totalValue: 0, totalRemaining: 0, pending: 0, sent: 0, redeemed: 0 });
  const [giftCardSearch, setGiftCardSearch] = useState('');
  const [giftCardStatusFilter, setGiftCardStatusFilter] = useState<string>('all');
  const [refundingGiftCard, setRefundingGiftCard] = useState<string | null>(null);
  const [confirmingGiftCardRefund, setConfirmingGiftCardRefund] = useState<string | null>(null);

  // Monthly members state
  interface MonthlyMember {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    childName: string | null;
    passName: string;
    price: number;
    purchaseDate: string;
    expiryDate: string | null;
    status: string;
    autoRenew: boolean;
    nextRenewalDate: string | null;
    usedSessions: number;
    totalSessions: number;
  }
  const [monthlyMembers, setMonthlyMembers] = useState<MonthlyMember[]>([]);
  const [monthlyMembersLoading, setMonthlyMembersLoading] = useState(false);
  const [monthlyMembersStats, setMonthlyMembersStats] = useState({ total: 0, active: 0, expired: 0, autoRenewEnabled: 0 });
  const [monthlyMemberSearch, setMonthlyMemberSearch] = useState('');
  const [monthlyMemberStatusFilter, setMonthlyMemberStatusFilter] = useState<string>('all');

  // Punch cards state
  interface PunchCardData {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    childName: string | null;
    passName: string;
    price: number;
    purchaseDate: string;
    firstUseDate: string | null;
    expiryDate: string | null;
    usedSessions: number;
    totalSessions: number;
    remainingSessions: number;
  }
  const [punchCards, setPunchCards] = useState<PunchCardData[]>([]);
  const [punchCardsLoading, setPunchCardsLoading] = useState(false);
  const [punchCardsStats, setPunchCardsStats] = useState({ total: 0, totalRemaining: 0, totalUsed: 0 });
  const [punchCardSearch, setPunchCardSearch] = useState('');

  // Staff management states
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState<StaffUser | null>(null);
  const [staffFormData, setStaffFormData] = useState({ name: '', phone: '', email: '', password: '', role: 'staff' as 'staff' | 'admin' });
  const [staffFormError, setStaffFormError] = useState('');
  const [confirmingStaffDelete, setConfirmingStaffDelete] = useState<string | null>(null);

  // Marketing/Promo states
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoSpecial | null>(null);
  const [promoFormData, setPromoFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    discountPercent: '',
    description: '',
    stripeCouponCode: '',
    bannerStyle: 'honeycomb' as const,
    isActive: true,
  });
  const [promoFormErrors, setPromoFormErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Membership discount states
  const [membershipDiscount, setMembershipDiscount] = useState<{
    exists: boolean;
    active: boolean;
    couponId: string;
    discountPercent: number;
    promotionCode?: string;
    redemptions?: number;
    loading: boolean;
    error?: string;
  }>({
    exists: false,
    active: false,
    couponId: 'MEMBER10',
    discountPercent: 10,
    loading: true,
  });

  // Passes states
  const [showPassForm, setShowPassForm] = useState(false);
  const [editingPass, setEditingPass] = useState<PassProduct | null>(null);
  const [passFormData, setPassFormData] = useState({
    name: '',
    category: 'day' as PassCategory,
    price: '',
    duration: '',
    sessionsIncluded: '',
    description: '',
    stripePurchaseLink: '',
    isActive: true,
  });
  const [passFormErrors, setPassFormErrors] = useState<Record<string, string>>({});

  // Parties states
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyProduct | null>(null);
  const [savingParty, setSavingParty] = useState(false);
  const [partyFormData, setPartyFormData] = useState({
    name: '',
    basePrice: '',
    capacity: '',
    duration: '',
    includedItems: [] as string[],
    addOns: [] as { id: string; name: string; price: string; description: string }[],
    description: '',
    stripePurchaseLink: '',
    isActive: true,
  });
  const [partyFormErrors, setPartyFormErrors] = useState<Record<string, string>>({});

  // Time slots states
  const [timeSlots, setTimeSlots] = useState<PartyTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    partyType: 'semi_private' as 'private' | 'semi_private',
    dayType: 'weekend' as 'weekday' | 'weekend',
    startTime: '13:00',
    endTime: '15:00',
    label: '',
    isActive: true,
    sortOrder: 0,
  });

  // Products states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FoodProduct | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: 'food' as ProductCategory,
    price: '',
    description: '',
    allergens: [] as Allergen[],
    stripePurchaseLink: '',
    isActive: true,
    available: true,
    trackInventory: false,
    quantityOnHand: '',
    lowStockThreshold: '5',
  });
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});

  // Volume discount states
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<VolumeDiscount | null>(null);

  // Newsletter states
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [newsletterStats, setNewsletterStats] = useState<NewsletterStats>({ total: 0, active: 0, unsubscribed: 0 });
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSearchTerm, setNewsletterSearchTerm] = useState('');

  // Newsletter compose states
  const [showCompose, setShowCompose] = useState(false);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterHeading, setNewsletterHeading] = useState('');
  const [newsletterBody, setNewsletterBody] = useState('');
  const [newsletterCtaText, setNewsletterCtaText] = useState('');
  const [newsletterCtaUrl, setNewsletterCtaUrl] = useState('');
  const [newsletterSending, setNewsletterSending] = useState(false);
  const [newsletterSendResult, setNewsletterSendResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
    total: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  // Customer loading state
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersStats, setCustomersStats] = useState({ total: 0, withPurchases: 0, active: 0 });
  const [customersError, setCustomersError] = useState<string | null>(null);

  // Customer detail modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  // Top customers leaderboard
  const [topCustomers, setTopCustomers] = useState<{ rank: number; customerId: string; name: string; email: string; phone: string; checkInCount: number; hasActiveMonthlyPass: boolean; hasActivePunchCard: boolean; totalSpend: number }[]>([]);
  const [topCustomersLoading, setTopCustomersLoading] = useState(false);

  const [discountFormData, setDiscountFormData] = useState({
    productId: '',
    productType: 'pass' as 'pass' | 'party' | 'product',
    minQuantity: '',
    discountPercent: '',
  });
  const [discountFormErrors, setDiscountFormErrors] = useState<Record<string, string>>({});

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refundTimeout) {
        clearTimeout(refundTimeout);
      }
    };
  }, [refundTimeout]);

  // Fetch newsletter subscribers when newsletter view is selected
  const fetchNewsletterSubscribers = async () => {
    setNewsletterLoading(true);
    try {
      const response = await fetch('/api/newsletter-subscribers');
      if (response.ok) {
        const data = await response.json();
        setNewsletterSubscribers(data.subscribers || []);
        setNewsletterStats(data.stats || { total: 0, active: 0, unsubscribed: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch newsletter subscribers:', error);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const checkEmailConfig = async () => {
    try {
      const response = await fetch('/api/newsletter/config');
      if (response.ok) {
        const data = await response.json();
        setEmailConfigured(data.emailConfigured);
      }
    } catch {
      setEmailConfigured(false);
    }
  };

  useEffect(() => {
    if (currentView === 'newsletter') {
      fetchNewsletterSubscribers();
      checkEmailConfig();
    }
  }, [currentView]);

  // Fetch top customers leaderboard when sales view is selected
  const fetchTopCustomers = async () => {
    setTopCustomersLoading(true);
    try {
      const response = await fetch('/api/admin/top-customers');
      if (response.ok) {
        const data = await response.json();
        setTopCustomers(data.topCustomers || []);
      }
    } catch (error) {
      console.error('Failed to fetch top customers:', error);
    } finally {
      setTopCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'sales') {
      fetchTopCustomers();
    }
  }, [currentView]);

  // Fetch customers from database when customers view is selected
  const fetchCustomers = async () => {
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const response = await fetch('/api/admin/customers');
      if (response.ok) {
        const data = await response.json();
        onUpdateCustomers(data.customers || []);
        setCustomersStats(data.stats || { total: 0, withPurchases: 0, active: 0 });
      } else {
        // Log error response for debugging
        const errorText = await response.text();
        console.error('Failed to fetch customers - API returned error:', response.status, errorText);
        setCustomersError(`Failed to load customers (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch customers - network error:', error);
      setCustomersError('Network error - could not load customers');
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'customers' || currentView === 'dashboard') {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Fetch POS mode on mount
  useEffect(() => {
    const fetchPosMode = async () => {
      try {
        const response = await fetch('/api/settings/pos-mode');
        if (response.ok) {
          const data = await response.json();
          setPosMode(data.mode || 'kiosk');
        }
      } catch (error) {
        console.error('Error fetching POS mode:', error);
      }
    };
    fetchPosMode();
  }, []);

  // Fetch staff users (admin only)
  const fetchStaffUsers = async () => {
    setStaffLoading(true);
    try {
      const response = await fetch('/api/admin/staff');
      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && currentView === 'settings') {
      fetchStaffUsers();
    }
  }, [isAdmin, currentView]);

  // Fetch gift cards when view is selected
  const fetchGiftCards = async () => {
    setGiftCardsLoading(true);
    try {
      const response = await fetch('/api/admin/gift-cards');
      if (response.ok) {
        const data = await response.json();
        setGiftCards(data.giftCards || []);
        setGiftCardsStats(data.stats || { total: 0, totalValue: 0, totalRemaining: 0, pending: 0, sent: 0, redeemed: 0 });
      }
    } catch (error) {
      console.error('Error fetching gift cards:', error);
    } finally {
      setGiftCardsLoading(false);
    }
  };

  const handleGiftCardRefund = async (cardId: string) => {
    setRefundingGiftCard(cardId);
    try {
      const response = await fetch(`/api/admin/gift-cards/${cardId}/refund`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        // Update local state: zero remaining, mark as redeemed
        setGiftCards(prev => prev.map(c =>
          c.id === cardId ? { ...c, remaining_amount: 0, status: 'redeemed' as const } : c
        ));
        fetchGiftCards(); // Refresh stats
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch {
      alert('Network error — refund could not be processed');
    } finally {
      setRefundingGiftCard(null);
      setConfirmingGiftCardRefund(null);
    }
  };

  useEffect(() => {
    // Sales and Dashboard fold gift card sales into their revenue/transactions,
    // so they need the gift card data loaded too (not just the Gift Cards view).
    if (currentView === 'gift-cards' || currentView === 'sales' || currentView === 'dashboard') {
      fetchGiftCards();
    }
  }, [currentView]);

  // Fetch monthly members when view is selected
  const fetchMonthlyMembers = async () => {
    setMonthlyMembersLoading(true);
    try {
      const response = await fetch('/api/admin/monthly-members');
      if (response.ok) {
        const data = await response.json();
        setMonthlyMembers(data.members || []);
        setMonthlyMembersStats(data.stats || { total: 0, active: 0, expired: 0, autoRenewEnabled: 0 });
      }
    } catch (error) {
      console.error('Error fetching monthly members:', error);
    } finally {
      setMonthlyMembersLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'monthly-members') {
      fetchMonthlyMembers();
    }
  }, [currentView]);

  const fetchPunchCards = async () => {
    setPunchCardsLoading(true);
    try {
      const response = await fetch('/api/admin/punch-cards');
      if (response.ok) {
        const data = await response.json();
        setPunchCards(data.cards || []);
        setPunchCardsStats(data.stats || { total: 0, totalRemaining: 0, totalUsed: 0 });
      }
    } catch (error) {
      console.error('Error fetching punch cards:', error);
    } finally {
      setPunchCardsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'punch-cards') {
      fetchPunchCards();
    }
  }, [currentView]);

  const handleCreateStaffUser = async () => {
    setStaffFormError('');
    const { name, phone, email, password, role } = staffFormData;
    if (!name || !phone || !email || !password) {
      setStaffFormError('All fields are required');
      return;
    }
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        setStaffUsers([data.user, ...staffUsers]);
        setShowStaffForm(false);
        setStaffFormData({ name: '', phone: '', email: '', password: '', role: 'staff' });
      } else {
        setStaffFormError(data.error || 'Failed to create staff user');
      }
    } catch {
      setStaffFormError('Failed to create staff user');
    }
  };

  const handleUpdateStaffUser = async () => {
    if (!editingStaffUser) return;
    setStaffFormError('');
    const updates: Record<string, string> = {};
    if (staffFormData.name) updates.name = staffFormData.name;
    if (staffFormData.phone) updates.phone = staffFormData.phone;
    if (staffFormData.email) updates.email = staffFormData.email;
    if (staffFormData.password) updates.password = staffFormData.password;
    if (staffFormData.role) updates.role = staffFormData.role;

    try {
      const response = await fetch(`/api/admin/staff/${editingStaffUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (response.ok) {
        setStaffUsers(staffUsers.map(u => u.id === editingStaffUser.id ? data.user : u));
        setShowStaffForm(false);
        setEditingStaffUser(null);
        setStaffFormData({ name: '', phone: '', email: '', password: '', role: 'staff' });
      } else {
        setStaffFormError(data.error || 'Failed to update staff user');
      }
    } catch {
      setStaffFormError('Failed to update staff user');
    }
  };

  const handleDeleteStaffUser = async (id: string) => {
    if (confirmingStaffDelete !== id) {
      setConfirmingStaffDelete(id);
      return;
    }
    try {
      const response = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setStaffUsers(staffUsers.filter(u => u.id !== id));
        setConfirmingStaffDelete(null);
      }
    } catch {
      console.error('Failed to delete staff user');
    }
  };

  // Handle POS mode toggle
  const handlePosModeToggle = async (newMode: 'kiosk' | 'staff') => {
    setUpdatingPosMode(true);
    try {
      const response = await fetch('/api/settings/pos-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      if (response.ok) {
        setPosMode(newMode);
      } else {
        console.error('Failed to update POS mode');
      }
    } catch (error) {
      console.error('Error updating POS mode:', error);
    } finally {
      setUpdatingPosMode(false);
    }
  };

  // Fetch Stripe sync status
  const fetchStripeSyncStatus = async () => {
    try {
      const response = await fetch('/api/stripe/sync');
      if (response.ok) {
        const data = await response.json();
        setStripeSyncStatus(prev => ({
          ...prev,
          loading: false,
          passes: data.status.passes,
          parties: data.status.parties,
          products: data.status.products,
        }));
      }
    } catch (error) {
      console.error('Error fetching Stripe sync status:', error);
      setStripeSyncStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Trigger Stripe sync
  const handleStripeSync = async () => {
    setStripeSyncStatus(prev => ({ ...prev, syncing: true }));
    try {
      const response = await fetch('/api/stripe/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-pin': '0297', // Staff mode authorization
        },
      });
      if (response.ok) {
        const data = await response.json();
        const totalSynced = data.result.passes.synced + data.result.parties.synced + data.result.products.synced;
        const totalErrors = data.result.passes.errors.length + data.result.parties.errors.length + data.result.products.errors.length;
        setStripeSyncStatus(prev => ({
          ...prev,
          syncing: false,
          lastSyncResult: { synced: totalSynced, errors: totalErrors },
        }));
        // Refresh status after sync
        await fetchStripeSyncStatus();
      } else {
        const errorData = await response.json();
        console.error('Stripe sync failed:', errorData);
        setStripeSyncStatus(prev => ({ ...prev, syncing: false }));
      }
    } catch (error) {
      console.error('Error syncing to Stripe:', error);
      setStripeSyncStatus(prev => ({ ...prev, syncing: false }));
    }
  };

  // Fetch Stripe sync status on mount
  useEffect(() => {
    fetchStripeSyncStatus();
  }, []);

  // Fetch auto-checkout settings on mount
  useEffect(() => {
    const fetchAutoCheckoutSettings = async () => {
      try {
        const response = await fetch('/api/settings/auto-checkout');
        if (response.ok) {
          const data = await response.json();
          setAutoCheckoutSettings(prev => ({
            ...prev,
            timezone: data.timezone || 'America/New_York',
            closingTime: data.closingTime || '22:00',
            loading: false,
          }));
        } else {
          setAutoCheckoutSettings(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error fetching auto-checkout settings:', error);
        setAutoCheckoutSettings(prev => ({ ...prev, loading: false }));
      }
    };
    fetchAutoCheckoutSettings();
  }, []);

  // Handle auto-checkout settings save
  const handleSaveAutoCheckoutSettings = async () => {
    setAutoCheckoutSettings(prev => ({ ...prev, saving: true, error: null }));
    try {
      const response = await fetch('/api/settings/auto-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: autoCheckoutSettings.timezone,
          closingTime: autoCheckoutSettings.closingTime,
        }),
      });
      if (response.ok) {
        setAutoCheckoutSettings(prev => ({ ...prev, saving: false }));
      } else {
        const errorData = await response.json();
        setAutoCheckoutSettings(prev => ({
          ...prev,
          saving: false,
          error: errorData.error || 'Failed to save settings',
        }));
      }
    } catch (error) {
      console.error('Error saving auto-checkout settings:', error);
      setAutoCheckoutSettings(prev => ({
        ...prev,
        saving: false,
        error: 'Network error - could not save settings',
      }));
    }
  };

  // Handle timezone auto-detect
  const handleDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setAutoCheckoutSettings(prev => ({ ...prev, timezone: detected }));
    } catch (error) {
      console.error('Error detecting timezone:', error);
    }
  };

  // Fetch membership discount status on mount and when marketing view is opened
  useEffect(() => {
    const fetchMembershipDiscount = async () => {
      try {
        const response = await fetch('/api/membership-discount');
        if (response.ok) {
          const data = await response.json();
          setMembershipDiscount({
            ...data,
            loading: false,
          });
        } else {
          setMembershipDiscount(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to fetch membership discount status',
          }));
        }
      } catch (error) {
        setMembershipDiscount(prev => ({
          ...prev,
          loading: false,
          error: 'Network error fetching membership discount',
        }));
      }
    };

    if (currentView === 'marketing') {
      fetchMembershipDiscount();
    }
  }, [currentView]);

  // Fetch time slots when parties view is selected
  useEffect(() => {
    if (currentView === 'parties') {
      fetchTimeSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    // Use parseDateString to handle both date-only and timestamp formats
    return parseDateString(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Analytics calculations
  const activeSessions = customers.filter(c => (c.activeSessions || []).length > 0);
  const totalCustomers = customers.length;

  // Net (cash/card) revenue for a purchase: full price minus any amount paid from
  // gift-card/account credit. That redeemed portion was already booked as revenue
  // when the gift card was originally sold, so counting it here would double-count.
  const netRevenue = (p: Purchase) => Math.max(0, Number(p.price) - Number(p.giftCardAmountUsed || 0));

  const totalRevenue = customers.reduce((sum, customer) =>
    sum + customer.purchases
      .filter(purchase => purchase.status !== 'refunded')
      .reduce((purchaseSum, purchase) => purchaseSum + netRevenue(purchase), 0), 0
  );

  const filteredPurchases = customers.flatMap(c => c.purchases).filter(p => {
    // Exclude refunded purchases from revenue calculations
    if (p.status === 'refunded') return false;

    const purchaseDate = new Date(p.purchaseDate);
    const now = new Date();

    switch (selectedDateRange) {
      case 'today':
        return purchaseDate.toDateString() === now.toDateString();
      case 'date': {
        const selected = new Date(salesDate + 'T00:00:00');
        return purchaseDate.toDateString() === selected.toDateString();
      }
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return purchaseDate >= startOfWeek;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return purchaseDate >= startOfMonth;
      }
      case 'all':
      default:
        return true;
    }
  });

  // Gift card SALES for the same Sales-view date range. Gift card purchases are
  // stored in the gift_cards table (not `purchases`), so unless they are merged
  // in here they never appear in POS revenue or transaction counts. Exclude
  // 'pending' (unpaid) to match the Analytics revenue report.
  const filteredGiftCardSales = giftCards.filter((gc) => {
    if (gc.status === 'pending') return false;
    const created = new Date(gc.created_at);
    const now = new Date();

    switch (selectedDateRange) {
      case 'today':
        return created.toDateString() === now.toDateString();
      case 'date': {
        const selected = new Date(salesDate + 'T00:00:00');
        return created.toDateString() === selected.toDateString();
      }
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return created >= startOfWeek;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return created >= startOfMonth;
      }
      case 'all':
      default:
        return true;
    }
  });
  const filteredGiftCardRevenue = filteredGiftCardSales.reduce((sum, gc) => sum + Number(gc.amount), 0);

  // Gift-card credit redeemed against purchases in range (not new revenue — shown separately)
  const filteredGiftCardRedeemed = filteredPurchases.reduce(
    (sum, p) => sum + Number(p.giftCardAmountUsed || 0), 0);

  const filteredRevenue =
    filteredPurchases.reduce((sum, purchase) => sum + netRevenue(purchase), 0) + filteredGiftCardRevenue;

  // Combined transaction count for the Sales view (passes/food/etc. + gift card sales)
  const filteredTransactionCount = filteredPurchases.length + filteredGiftCardSales.length;

  // Purchases for the selected dashboard date (includes refunded for display)
  const selectedDateObj = new Date(dashboardDate + 'T00:00:00');
  const isToday = selectedDateObj.toDateString() === new Date().toDateString();
  const dashboardPurchases = customers.flatMap(c => c.purchases).filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    return purchaseDate.toDateString() === selectedDateObj.toDateString();
  });

  // Gift card sales made on the selected dashboard date (exclude unpaid 'pending')
  const dashboardGiftCardSales = giftCards.filter((gc) => {
    if (gc.status === 'pending') return false;
    return new Date(gc.created_at).toDateString() === selectedDateObj.toDateString();
  });
  const dashboardGiftCardRevenue = dashboardGiftCardSales.reduce((sum, gc) => sum + Number(gc.amount), 0);

  // Gift-card credit redeemed against purchases on the selected date (not new revenue)
  const dashboardGiftCardRedeemed = dashboardPurchases
    .filter(p => p.status !== 'refunded')
    .reduce((sum, p) => sum + Number(p.giftCardAmountUsed || 0), 0);

  // Revenue excludes refunded purchases and gift-card-funded amounts; includes gift card sales
  const dashboardRevenue = dashboardPurchases
    .filter(p => p.status !== 'refunded')
    .reduce((sum, purchase) => sum + netRevenue(purchase), 0) + dashboardGiftCardRevenue;

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleForceCheckout = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.activeSessions?.length) return;

    try {
      // End each active session via API
      await Promise.all(
        customer.activeSessions.map(session =>
          fetch(`/api/sessions/${session.id}`, { method: 'PUT' })
        )
      );

      // Update local state after successful API calls
      const updatedCustomers = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            activeSessions: []
          };
        }
        return c;
      });
      onUpdateCustomers(updatedCustomers);
    } catch (error) {
      console.error('Error force checking out sessions:', error);
    }
  };

  const handleRefundClick = (purchaseId: string) => {
    // Clear any existing timeout
    if (refundTimeout) {
      clearTimeout(refundTimeout);
    }

    // Set confirmation state
    setConfirmingRefund(purchaseId);

    // Set timeout to reset confirmation after 5 seconds
    const timeout = setTimeout(() => {
      setConfirmingRefund(null);
    }, 5000);

    setRefundTimeout(timeout);
  };

  const handleConfirmRefund = async (customerId: string, purchaseId: string) => {
    // Clear confirmation state and timeout
    setConfirmingRefund(null);
    if (refundTimeout) {
      clearTimeout(refundTimeout);
      setRefundTimeout(null);
    }

    // Set processing state
    setProcessingRefund(purchaseId);

    try {
      // Call the refund API endpoint
      const response = await fetch(`/api/purchases/${purchaseId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      // Success - update local state to remove the purchase
      const updatedCustomers = customers.map(customer => {
        if (customer.id === customerId) {
          return {
            ...customer,
            purchases: customer.purchases.filter(p => p.id !== purchaseId)
          };
        }
        return customer;
      });
      onUpdateCustomers(updatedCustomers);

      // Show success message
      alert(data.message || 'Refund processed successfully!');
    } catch (error) {
      console.error('Refund failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to process refund. Please try again.');
    } finally {
      setProcessingRefund(null);
    }
  };

  // Customer detail modal handlers
  const handleOpenCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
  };

  const handleCloseCustomerDetail = () => {
    setSelectedCustomer(null);
    setShowCustomerDetail(false);
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    // Update the customer in the list
    const updatedCustomers = customers.map(c =>
      c.id === updatedCustomer.id ? updatedCustomer : c
    );
    onUpdateCustomers(updatedCustomers);
    setSelectedCustomer(updatedCustomer);
  };

  // Handle customer deletion
  const handleDeleteCustomer = async (customerId: string) => {
    if (confirmingCustomerDelete !== customerId) {
      // First click - show confirmation
      setConfirmingCustomerDelete(customerId);
      setCustomerDeleteError(null);
      // Auto-reset confirmation after 5 seconds
      setTimeout(() => {
        setConfirmingCustomerDelete(prev => prev === customerId ? null : prev);
      }, 5000);
      return;
    }

    // Second click - perform deletion
    setDeletingCustomerId(customerId);
    setCustomerDeleteError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }

      // Remove customer from local state
      const updatedCustomers = customers.filter(c => c.id !== customerId);
      onUpdateCustomers(updatedCustomers);

      // Reset states
      setConfirmingCustomerDelete(null);
    } catch (error) {
      setCustomerDeleteError(error instanceof Error ? error.message : 'Failed to delete customer');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handleCancelCustomerDelete = () => {
    setConfirmingCustomerDelete(null);
    setCustomerDeleteError(null);
  };

  const totalKidSessions = activeSessions.reduce((sum, c) => sum + (c.activeSessions || []).length, 0);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👨‍👩‍👧</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Parents Checked In</p>
              <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧒</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Kid Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{totalKidSessions}</p>
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
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>
        </Card>

        {isAdmin && (
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{isToday ? "Today's Revenue" : `Revenue (${selectedDateObj.toLocaleDateString()})`}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardRevenue)}</p>
                {dashboardGiftCardRedeemed > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    + {formatCurrency(dashboardGiftCardRedeemed)} gift card redeemed
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

      </div>

      {/* POS Mode Settings - Hidden for now, will be enabled later */}
      {false && (
        <Card className="p-6 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                <span>🖥️</span>
                POS Mode
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                {posMode === 'kiosk'
                  ? '🛒 Self-serve: Customers pay via Stripe Checkout'
                  : '👨‍💼 Staff-assisted: Staff processes payments'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePosModeToggle('kiosk')}
                disabled={updatingPosMode}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  posMode === 'kiosk'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-amber-400'
                }`}
              >
                🛒 Kiosk
              </button>
              <button
                onClick={() => handlePosModeToggle('staff')}
                disabled={updatingPosMode}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  posMode === 'staff'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-red-400'
                }`}
              >
                👨‍💼 Staff
              </button>
            </div>
          </div>
          {updatingPosMode && (
            <p className="text-xs text-amber-600 mt-2 animate-pulse">Updating...</p>
          )}
        </Card>
      )}

      {/* Active Sessions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions ({activeSessions.length})</h3>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((customer) => (
              <div key={customer.id} className="space-y-2">
                <div className="font-medium">{customer.name} ({formatPhoneNumber(customer.phone)})</div>
                {(customer.activeSessions || []).map(session => {
                  const purchase = customer.purchases.find(p => p.id === session.purchaseId);
                  const linkedChildIds = purchase?.childIds?.length
                    ? purchase.childIds
                    : (purchase?.childId ? [purchase.childId] : []);
                  const childNames = linkedChildIds
                    .map(id => customer.children.find(c => c.id === id)?.name)
                    .filter((n): n is string => Boolean(n));
                  return (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg ml-4">
                    <div>
                      {childNames.length > 0 && (
                        <p className="text-sm font-medium text-gray-800">
                          {childNames.join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Session started: {formatDate(session.startTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Auto-checkout: {formatDate(session.autoCheckoutTime)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleForceCheckout(customer.id)}
                      size="sm"
                      variant="outline"
                    >
                      Force Checkout All
                    </Button>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No active sessions</p>
        )}
      </Card>

      {/* Purchases for Selected Date */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isToday ? "Today's" : selectedDateObj.toLocaleDateString()} Purchases ({dashboardPurchases.length + dashboardGiftCardSales.length})
          </h3>
          <input
            type="date"
            value={dashboardDate}
            max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
            onChange={(e) => setDashboardDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(dashboardPurchases.length + dashboardGiftCardSales.length) > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {dashboardPurchases.map((purchase) => {
              const customer = customers.find(c => c.purchases.some(p => p.id === purchase.id));
              return (
                <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{purchase.name}</p>
                    <p className="text-sm text-gray-600">
                      {customer?.name} • {formatDate(purchase.purchaseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${purchase.status === 'refunded' ? 'line-through text-gray-400' : ''}`}>
                      {formatCurrency(purchase.price)}
                    </p>
                    {purchase.status === 'refunded' ? (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Refunded
                      </span>
                    ) : (
                      <Button
                        onClick={() => {
                          if (processingRefund === purchase.id) return;
                          if (confirmingRefund === purchase.id && customer) {
                            handleConfirmRefund(customer.id, purchase.id);
                          } else {
                            handleRefundClick(purchase.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        disabled={processingRefund === purchase.id}
                        className={`mt-1 transition-colors ${
                          processingRefund === purchase.id
                            ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                            : confirmingRefund === purchase.id
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        }`}
                      >
                        {processingRefund === purchase.id
                          ? 'Processing...'
                          : confirmingRefund === purchase.id
                          ? '✓ Confirm Refund'
                          : 'Refund'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {dashboardGiftCardSales.map((gc) => (
              <div key={gc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">🎁 Gift Card <span className="text-xs font-normal text-gray-500">({gc.code})</span></p>
                  <p className="text-sm text-gray-600">
                    {gc.purchaser_name} • {formatDate(gc.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(Number(gc.amount))}</p>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Gift Card
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{isToday ? 'No purchases today' : `No purchases on ${selectedDateObj.toLocaleDateString()}`}</p>
        )}
      </Card>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-xl font-bold text-gray-900">{customersStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🛒</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">With Purchases</p>
              <p className="text-xl font-bold text-green-600">{customersStats.withPurchases}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🎮</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Currently Active</p>
              <p className="text-xl font-bold text-yellow-600">{customersStats.active}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <Button onClick={() => setSearchTerm('')} variant="outline">
            Clear
          </Button>
          <Button
            onClick={fetchCustomers}
            variant="outline"
            disabled={customersLoading}
          >
            {customersLoading ? '⏳' : '🔄'} Refresh
          </Button>
        </div>
      </Card>

      {/* Customer List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Customers ({filteredCustomers.length})
        </h3>
        {customersLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">⏳ Loading customers...</p>
          </div>
        ) : customersError ? (
          <div className="text-center py-8">
            <p className="text-red-500 text-lg mb-2">⚠️ {customersError}</p>
            <p className="text-sm text-gray-400 mb-4">
              Check the browser console for more details
            </p>
            <Button onClick={fetchCustomers} variant="outline" size="sm">
              🔄 Retry
            </Button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-2">👥 No customers found</p>
            <p className="text-sm text-gray-400">
              {customers.length === 0
                ? 'Customers who sign up via registration or at the kiosk will appear here'
                : 'Try adjusting your search terms'}
            </p>
          </div>
        ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer transition-colors"
              onClick={() => handleOpenCustomerDetail(customer)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold">{customer.name}</h4>
                    {(customer.activeSessions || []).length > 0 && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        {(customer.activeSessions || []).length} Active Session{(customer.activeSessions || []).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPhoneNumber(customer.phone)}
                    {customer.email && ` • ${customer.email}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Member since {formatDate(customer.createdAt)} •
                    {customer.purchases.length} purchases •
                    Total spent: {formatCurrency(customer.purchases.reduce((sum, p) => sum + Number(p.price), 0))}
                  </p>

                  {/* Active Passes */}
                  {customer.purchases.filter(p => p.status === 'active').length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Active passes:</p>
                      <div className="flex flex-wrap gap-1">
                        {customer.purchases
                          .filter(p => p.status === 'active')
                          .map(purchase => (
                            <span key={purchase.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {purchase.name} ({purchase.usedSessions}/{purchase.totalSessions})
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

<div className="flex flex-col space-y-2">
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => handleOpenCustomerDetail(customer)}
                      size="sm"
                      variant="outline"
                      className="hover:bg-yellow-100 hover:border-yellow-400"
                    >
                      View
                    </Button>
                    {(customer.activeSessions || []).length > 0 && (
                      <Button
                        onClick={() => handleForceCheckout(customer.id)}
                        size="sm"
                        variant="outline"
                      >
                        Force Checkout All
                      </Button>
                    )}
                    {/* Delete Account Button - Admin Only */}
                    {isAdmin && (confirmingCustomerDelete === customer.id ? (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          size="sm"
                          className="bg-red-500 text-white hover:bg-red-600 border-2 border-red-500 rounded-2xl"
                          disabled={deletingCustomerId === customer.id}
                        >
                          {deletingCustomerId === customer.id ? 'Deleting...' : 'Yes, Delete'}
                        </Button>
                        <Button
                          onClick={handleCancelCustomerDelete}
                          size="sm"
                          variant="outline"
                          disabled={deletingCustomerId === customer.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                      >
                        Delete Account
                      </Button>
                    ))}
                  </div>
                  {/* Confirmation Message */}
                  {confirmingCustomerDelete === customer.id && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Are you sure you would like to delete this account? This will remove all data including children, purchases, sessions, and payment methods.
                    </div>
                  )}
                  {/* Error Message */}
                  {customerDeleteError && deletingCustomerId === null && confirmingCustomerDelete === customer.id && (
                    <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                      {customerDeleteError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </Card>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="today">Today</option>
            <option value="date">Select Date</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          {selectedDateRange === 'date' && (
            <input
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          )}
        </div>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Total Sales</h4>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(filteredRevenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{filteredTransactionCount} transactions</p>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Average Transaction</h4>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(filteredTransactionCount > 0 ? filteredRevenue / filteredTransactionCount : 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Per purchase</p>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Active Customers</h4>
          <p className="text-2xl font-bold text-purple-600 mt-2">{activeSessions.length}</p>
          <p className="text-sm text-gray-500 mt-1">Currently playing</p>
        </Card>
      </div>

      {/* Sales by Product Type */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sales by Product Type</h3>
        <div className="space-y-3">
          {(() => {
            const punchCardFilter = (p: Purchase) => p.type === 'weekly_pass' || p.name.toLowerCase().includes('punch');
            const dayPassFilter = (p: Purchase) => p.type === 'day_pass' && !p.name.toLowerCase().includes('punch');

            const categories = [
              { key: 'day_pass', label: 'Day Pass', filter: dayPassFilter },
              { key: 'punch_card', label: 'Punch Card', filter: punchCardFilter },
              { key: 'monthly_pass', label: 'Monthly Pass', filter: (p: Purchase) => p.type === 'monthly_pass' },
              { key: 'party_package', label: 'Party Package', filter: (p: Purchase) => p.type === 'party_package' },
              { key: 'food_beverage', label: 'Food & Beverage', filter: (p: Purchase) => p.type === 'food_beverage' },
            ];

            return (
              <>
                {categories.map(({ key, label, filter }) => {
                  const purchases = filteredPurchases.filter(filter);
                  const revenue = purchases.reduce((sum, p) => sum + netRevenue(p), 0);
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-600">{purchases.length} sold</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(revenue)}</p>
                    </div>
                  );
                })}
                <div key="gift_card" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Gift Card</p>
                    <p className="text-sm text-gray-600">{filteredGiftCardSales.length} sold</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(filteredGiftCardRevenue)}</p>
                </div>
                {filteredGiftCardRedeemed > 0 && (
                  <div key="gift_card_redeemed" className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <div>
                      <p className="font-medium text-amber-800">Gift Card Redeemed</p>
                      <p className="text-sm text-amber-700">Paid from prior gift-card credit — not counted in sales above</p>
                    </div>
                    <p className="font-semibold text-amber-800">{formatCurrency(filteredGiftCardRedeemed)}</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Card>

      {/* Top 10 Customers by Check-Ins */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Customers by Check-Ins</h3>
        {topCustomersLoading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Rank</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Contact</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Monthly Pass</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Punch Card</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Total Spend</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Check-Ins</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer) => (
                  <tr key={customer.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        customer.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                        customer.rank === 2 ? 'bg-gray-100 text-gray-700' :
                        customer.rank === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {customer.rank}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900">{customer.name}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {customer.phone || customer.email || '—'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {customer.hasActiveMonthlyPass ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">No</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {customer.hasActivePunchCard ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">No</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-green-700">
                      {formatCurrency(customer.totalSpend)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                        {customer.checkInCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No check-in data available</p>
        )}
      </Card>
    </div>
  );

  // Promo handlers
  const handleCreatePromo = () => {
    setEditingPromo(null);
    setPromoFormData({
      name: '',
      startDate: '',
      endDate: '',
      discountPercent: '',
      description: '',
      stripeCouponCode: '',
      bannerStyle: 'honeycomb',
      isActive: true,
    });
    setPromoFormErrors({});
    setShowPromoForm(true);
  };

  const handleEditPromo = (promo: PromoSpecial) => {
    setEditingPromo(promo);
    setPromoFormData({
      name: promo.name,
      startDate: promo.startDate,
      endDate: promo.endDate,
      discountPercent: promo.discountPercent.toString(),
      description: promo.description,
      stripeCouponCode: promo.stripeCouponCode,
      bannerStyle: promo.bannerStyle || 'honeycomb',
      isActive: promo.isActive,
    });
    setPromoFormErrors({});
    setShowPromoForm(true);
  };

  const handleSavePromo = async () => {
    const errors: Record<string, string> = {};

    // Validate all fields
    if (!promoFormData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!promoFormData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!promoFormData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (!promoFormData.discountPercent || isNaN(Number(promoFormData.discountPercent))) {
      errors.discountPercent = 'Valid discount percentage is required';
    } else {
      const percent = Number(promoFormData.discountPercent);
      if (percent <= 0 || percent > 100) {
        errors.discountPercent = 'Discount must be between 1 and 100';
      }
    }
    if (!promoFormData.description.trim()) {
      errors.description = 'Description is required';
    }

    const codeValidation = validatePromoCode(promoFormData.stripeCouponCode);
    if (!codeValidation.valid) {
      errors.stripeCouponCode = codeValidation.error!;
    }

    if (promoFormData.startDate && promoFormData.endDate) {
      const dateValidation = validatePromoDates(promoFormData.startDate, promoFormData.endDate);
      if (!dateValidation.valid) {
        errors.dates = dateValidation.error!;
      }
    }

    if (Object.keys(errors).length > 0) {
      setPromoFormErrors(errors);
      return;
    }

    try {
      // Save promo to database
      if (editingPromo) {
        // Update existing promo
        const response = await fetch('/api/promos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPromo.id,
            name: promoFormData.name.trim(),
            start_date: promoFormData.startDate,
            end_date: promoFormData.endDate,
            discount_percent: Number(promoFormData.discountPercent),
            description: promoFormData.description.trim(),
            stripe_coupon_code: promoFormData.stripeCouponCode.toUpperCase(),
            banner_style: promoFormData.bannerStyle,
            is_active: promoFormData.isActive,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update promo');
        }

        const { promo } = await response.json();

        // Convert database format to UI format
        const updatedPromo: PromoSpecial = {
          id: promo.id,
          name: promo.name,
          startDate: promo.start_date,
          endDate: promo.end_date,
          discountPercent: promo.discount_percent,
          description: promo.description,
          stripeCouponCode: promo.stripe_coupon_code,
          bannerStyle: promo.banner_style,
          isActive: promo.is_active,
          createdAt: promo.created_at,
          updatedAt: promo.updated_at,
        };

        onUpdatePromos(promos.map(p => p.id === editingPromo.id ? updatedPromo : p));
      } else {
        // Create new promo
        const response = await fetch('/api/promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: promoFormData.name.trim(),
            start_date: promoFormData.startDate,
            end_date: promoFormData.endDate,
            discount_percent: Number(promoFormData.discountPercent),
            description: promoFormData.description.trim(),
            stripe_coupon_code: promoFormData.stripeCouponCode.toUpperCase(),
            banner_style: promoFormData.bannerStyle,
            is_active: promoFormData.isActive,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create promo');
        }

        const { promo } = await response.json();

        // Convert database format to UI format
        const newPromo: PromoSpecial = {
          id: promo.id,
          name: promo.name,
          startDate: promo.start_date,
          endDate: promo.end_date,
          discountPercent: promo.discount_percent,
          description: promo.description,
          stripeCouponCode: promo.stripe_coupon_code,
          bannerStyle: promo.banner_style,
          isActive: promo.is_active,
          createdAt: promo.created_at,
          updatedAt: promo.updated_at,
        };

        onUpdatePromos([...promos, newPromo]);
      }

      setShowPromoForm(false);
      setEditingPromo(null);
    } catch (error) {
      console.error('Failed to save promo:', error);
      alert('Failed to save promo. Please try again.');
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirmingDelete === id) {
      try {
        // Delete from database
        const response = await fetch(`/api/promos?id=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete promo');
        }

        // Update local state
        onUpdatePromos(promos.filter(p => p.id !== id));
        setConfirmingDelete(null);
      } catch (error) {
        console.error('Failed to delete promo:', error);
        alert('Failed to delete promo. Please try again.');
        setConfirmingDelete(null);
      }
    } else {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 5000);
    }
  };

  const handleTogglePromo = async (id: string) => {
    const promo = promos.find(p => p.id === id);
    if (!promo) return;

    try {
      // Update in database
      const response = await fetch('/api/promos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promo.id,
          is_active: !promo.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle promo');
      }

      // Update local state
      onUpdatePromos(promos.map(p =>
        p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p
      ));
    } catch (error) {
      console.error('Failed to toggle promo:', error);
      alert('Failed to toggle promo. Please try again.');
    }
  };

  // Membership discount handlers
  const handleToggleMembershipDiscount = async () => {
    setMembershipDiscount(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      if (membershipDiscount.active) {
        // Deactivate the discount
        const response = await fetch('/api/membership-discount', {
          method: 'DELETE',
        });
        if (response.ok) {
          const data = await response.json();
          setMembershipDiscount({
            ...data,
            loading: false,
          });
        } else {
          throw new Error('Failed to deactivate membership discount');
        }
      } else {
        // Activate/create the discount
        const response = await fetch('/api/membership-discount', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          setMembershipDiscount({
            ...data,
            loading: false,
          });
        } else {
          throw new Error('Failed to activate membership discount');
        }
      }
    } catch (error) {
      setMembershipDiscount(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to toggle membership discount',
      }));
    }
  };

  const renderMarketing = () => {
    const activePromo = getActivePromo(promos);
    const sortedPromos = [...promos].sort((a, b) => {
      const statusA = getPromoStatus(a);
      const statusB = getPromoStatus(b);

      // Active promos first
      if (statusA.status === 'active' && statusB.status !== 'active') return -1;
      if (statusB.status === 'active' && statusA.status !== 'active') return 1;

      // Then scheduled promos
      if (statusA.status === 'scheduled' && statusB.status !== 'scheduled') return -1;
      if (statusB.status === 'scheduled' && statusA.status !== 'scheduled') return 1;

      // Within each status group, sort by end date (oldest/earliest end date at top, newest at bottom)
      return parseDateString(a.endDate).getTime() - parseDateString(b.endDate).getTime();
    });

    return (
      <div className="space-y-6">
        {/* Active Promo Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Active Promo Preview</h3>
            {activePromo && (
              <Button
                onClick={() => window.open('/', '_blank')}
                size="sm"
                variant="outline"
              >
                🌐 Preview on Website
              </Button>
            )}
          </div>

          {activePromo ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">This is how customers see the banner:</p>
              <PromoBanner promo={activePromo} />
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg mb-2">📢 No active promo</p>
              <p className="text-sm text-gray-400">Create a promo to start advertising deals to customers</p>
            </div>
          )}
        </Card>

        {/* Membership Discounts Section */}
        <Card className="p-6 border-2 border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎟️</span>
              <div>
                <h3 className="text-lg font-semibold text-amber-900">Membership Party Discount</h3>
                <p className="text-sm text-amber-700">10% off party bookings for monthly membership holders</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {membershipDiscount.loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : membershipDiscount.active ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-300">
                  ACTIVE
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
                  INACTIVE
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Discount Code</p>
                <p className="font-mono font-bold text-lg text-amber-800">{membershipDiscount.couponId}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Discount Amount</p>
                <p className="font-bold text-lg text-amber-800">{membershipDiscount.discountPercent}% OFF</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Redemptions</p>
                <p className="font-bold text-lg text-amber-800">{membershipDiscount.redemptions || 0}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-amber-200">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
                  <li>Members with active monthly passes can use code <span className="font-mono font-bold">{membershipDiscount.couponId}</span></li>
                  <li>Discount applies at Stripe checkout when booking a party</li>
                  <li>One-time use per checkout session</li>
                </ul>
              </div>
              <Button
                onClick={handleToggleMembershipDiscount}
                disabled={membershipDiscount.loading}
                variant={membershipDiscount.active ? 'outline' : 'default'}
                size="sm"
                className={membershipDiscount.active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'bg-amber-600 hover:bg-amber-700'}
              >
                {membershipDiscount.loading
                  ? '⏳ Processing...'
                  : membershipDiscount.active
                    ? '🚫 Deactivate Discount'
                    : '✅ Activate Discount'}
              </Button>
            </div>

            {membershipDiscount.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{membershipDiscount.error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Create New Promo Button */}
        <div className="flex justify-end">
          <Button onClick={handleCreatePromo} size="sm">
            ➕ Create New Promo
          </Button>
        </div>

        {/* Promo List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">All Promos ({promos.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedPromos.map((promo) => {
              const status = getPromoStatus(promo);
              const statusColors = {
                active: 'bg-green-100 text-green-800 border-green-300',
                scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
                expired: 'bg-gray-100 text-gray-800 border-gray-300',
              };

              return (
                <div key={promo.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{promo.name}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status.status]}`}>
                          {status.status.toUpperCase()}
                        </span>
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                          {promo.discountPercent}% OFF
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{promo.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>📅 {formatPromoDateRange(promo.startDate, promo.endDate)}</span>
                        <span>💳 Code: <span className="font-mono font-bold">{promo.stripeCouponCode}</span></span>
                        {status.status === 'active' && (
                          <span className="text-orange-600 font-medium">
                            ⏰ {status.daysRemaining}d {status.hoursRemaining}h remaining
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Active:</label>
                        <input
                          type="checkbox"
                          checked={promo.isActive}
                          onChange={() => handleTogglePromo(promo.id)}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <Button
                        onClick={() => handleEditPromo(promo)}
                        size="sm"
                        variant="outline"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeletePromo(promo.id)}
                        size="sm"
                        variant="outline"
                        className={`transition-colors ${
                          confirmingDelete === promo.id
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        }`}
                      >
                        {confirmingDelete === promo.id ? '✓ Confirm' : '🗑️ Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {promos.length === 0 && (
              <p className="text-gray-500 text-center py-8">No promos created yet</p>
            )}
          </div>
        </Card>

        {/* Promo Form Modal */}
        {showPromoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingPromo ? 'Edit Promo' : 'Create New Promo'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Name *
                  </label>
                  <input
                    type="text"
                    value={promoFormData.name}
                    onChange={(e) => setPromoFormData({ ...promoFormData, name: e.target.value })}
                    placeholder="e.g., Black Friday!"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {promoFormErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{promoFormErrors.name}</p>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={promoFormData.startDate}
                      onChange={(e) => setPromoFormData({ ...promoFormData, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {promoFormErrors.startDate && (
                      <p className="text-red-600 text-sm mt-1">{promoFormErrors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={promoFormData.endDate}
                      onChange={(e) => setPromoFormData({ ...promoFormData, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {promoFormErrors.endDate && (
                      <p className="text-red-600 text-sm mt-1">{promoFormErrors.endDate}</p>
                    )}
                  </div>
                </div>
                {promoFormErrors.dates && (
                  <p className="text-red-600 text-sm">{promoFormErrors.dates}</p>
                )}

                {/* Discount Percent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percentage * (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={promoFormData.discountPercent}
                    onChange={(e) => setPromoFormData({ ...promoFormData, discountPercent: e.target.value })}
                    placeholder="e.g., 25"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {promoFormErrors.discountPercent && (
                    <p className="text-red-600 text-sm mt-1">{promoFormErrors.discountPercent}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description * ({promoFormData.description.length} characters)
                  </label>
                  <textarea
                    value={promoFormData.description}
                    onChange={(e) => setPromoFormData({ ...promoFormData, description: e.target.value })}
                    placeholder="e.g., Coming soon! Bee one of the first!"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {promoFormErrors.description && (
                    <p className="text-red-600 text-sm mt-1">{promoFormErrors.description}</p>
                  )}
                </div>

                {/* Stripe Coupon Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={promoFormData.stripeCouponCode}
                    onChange={(e) => setPromoFormData({ ...promoFormData, stripeCouponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., BLACKFRIDAY40"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the exact coupon code you created in Stripe
                  </p>
                  {promoFormErrors.stripeCouponCode && (
                    <p className="text-red-600 text-sm mt-1">{promoFormErrors.stripeCouponCode}</p>
                  )}
                </div>

                {/* Banner Style Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Style *
                  </label>
                  <select
                    value={promoFormData.bannerStyle}
                    onChange={(e) => setPromoFormData({ ...promoFormData, bannerStyle: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="honeycomb">🐝 Honeycomb (Original - Yellow & Orange with Bees)</option>
                    <option value="gradient-wave">✨ Gradient Wave (Purple & Pink with Sparkles)</option>
                    <option value="confetti">🎉 Confetti (Blue & Purple with Falling Confetti)</option>
                    <option value="minimal">⚡ Minimal (Clean White with Grid Pattern)</option>
                    <option value="bold-stripes">⚠️ Bold Stripes (Black & Yellow Diagonal)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the visual style for the banner - each has unique colors and animations
                  </p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="promoActive"
                    checked={promoFormData.isActive}
                    onChange={(e) => setPromoFormData({ ...promoFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="promoActive" className="text-sm text-gray-700 font-medium">
                    Promo is active (customers can see it during the date range)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 mt-8">
                <Button
                  onClick={() => {
                    setShowPromoForm(false);
                    setEditingPromo(null);
                    setPromoFormErrors({});
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePromo}
                  className="flex-1"
                >
                  {editingPromo ? '💾 Update Promo' : '✨ Create Promo'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      alert('Failed to copy');
    }
  };

  // Passes handlers
  const handleCreatePass = () => {
    setEditingPass(null);
    setPassFormData({
      name: '',
      category: 'day',
      price: '',
      duration: '',
      sessionsIncluded: '',
      description: '',
      stripePurchaseLink: '',
      isActive: true,
    });
    setPassFormErrors({});
    setShowPassForm(true);
  };

  const handleEditPass = (pass: PassProduct) => {
    setEditingPass(pass);
    setPassFormData({
      name: pass.name,
      category: pass.category,
      price: pass.price.toString(),
      duration: pass.duration.toString(),
      sessionsIncluded: pass.sessionsIncluded.toString(),
      description: pass.description,
      stripePurchaseLink: pass.stripePurchaseLink,
      isActive: pass.isActive,
    });
    setPassFormErrors({});
    setShowPassForm(true);
  };

  const handleSavePass = async () => {
    const errors: Record<string, string> = {};

    // Validate all fields
    const nameValidation = validateProductName(passFormData.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!;
    }

    const priceValidation = validatePrice(passFormData.price);
    if (!priceValidation.valid) {
      errors.price = priceValidation.error!;
    }

    const durationValidation = validateQuantity(passFormData.duration, 'Duration');
    if (!durationValidation.valid) {
      errors.duration = durationValidation.error!;
    }

    const sessionsValidation = validateQuantity(passFormData.sessionsIncluded, 'Sessions');
    if (!sessionsValidation.valid) {
      errors.sessionsIncluded = sessionsValidation.error!;
    }

    const linkValidation = validateStripeLinkOptional(passFormData.stripePurchaseLink);
    if (!linkValidation.valid) {
      errors.stripePurchaseLink = linkValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      setPassFormErrors(errors);
      return;
    }

    try {
      // Prepare pass data
      const passData = {
        name: passFormData.name.trim(),
        category: passFormData.category,
        price: parseFloat(passFormData.price),
        duration: parseInt(passFormData.duration),
        sessionsIncluded: parseInt(passFormData.sessionsIncluded),
        description: passFormData.description.trim(),
        stripePurchaseLink: passFormData.stripePurchaseLink.trim(),
        isActive: passFormData.isActive,
      };

      // Save pass via API
      if (editingPass) {
        const updatedPass = await updatePass(editingPass.id, passData);
        onUpdatePasses(passes.map(p => p.id === editingPass.id ? updatedPass : p));
      } else {
        const newPass = await createPass(passData);
        onUpdatePasses([...passes, newPass]);
      }

      setShowPassForm(false);
      setEditingPass(null);
    } catch (error) {
      console.error('Error saving pass:', error);
      setPassFormErrors({ submit: error instanceof Error ? error.message : 'Failed to save pass' });
    }
  };

  const handleDeletePass = async (id: string) => {
    if (confirmingDelete === id) {
      try {
        await deletePass(id);
        onUpdatePasses(passes.filter(p => p.id !== id));
        setConfirmingDelete(null);
      } catch (error) {
        console.error('Error deleting pass:', error);
        alert('Failed to delete pass. Please try again.');
      }
    } else {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 5000);
    }
  };

  const handleTogglePass = async (id: string) => {
    try {
      const pass = passes.find(p => p.id === id);
      if (!pass) return;

      const updatedPass = await updatePass(id, { isActive: !pass.isActive });
      onUpdatePasses(passes.map(p => p.id === id ? updatedPass : p));
    } catch (error) {
      console.error('Error toggling pass:', error);
      alert('Failed to update pass. Please try again.');
    }
  };

  // Time slots handlers
  const fetchTimeSlots = async () => {
    try {
      setIsLoadingSlots(true);
      const response = await fetch('/api/admin/party-time-slots');
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch time slots:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const formatSlotTimeRange = (start: string, end: string) => {
    const formatSingleTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
  };

  const createTimeSlot = async () => {
    try {
      setIsCreatingSlot(true);
      const label = newSlot.label || formatSlotTimeRange(newSlot.startTime, newSlot.endTime);

      const response = await fetch('/api/admin/party-time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSlot, label }),
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSlots((prev) => [...prev, data]);
        setShowSlotForm(false);
        setNewSlot({
          partyType: 'semi_private',
          dayType: 'weekend',
          startTime: '13:00',
          endTime: '15:00',
          label: '',
          isActive: true,
          sortOrder: 0,
        });
      }
    } catch (err) {
      console.error('Failed to create time slot:', err);
    } finally {
      setIsCreatingSlot(false);
    }
  };

  const toggleSlotStatus = async (slot: PartyTimeSlot) => {
    try {
      const response = await fetch(`/api/admin/party-time-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slot.is_active }),
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSlots((prev) => prev.map((s) => (s.id === slot.id ? data : s)));
      }
    } catch (err) {
      console.error('Failed to toggle slot status:', err);
    }
  };

  const deleteTimeSlot = async (slot: PartyTimeSlot) => {
    if (!confirm(`Delete time slot "${slot.label}"?`)) return;

    try {
      const response = await fetch(`/api/admin/party-time-slots/${slot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTimeSlots((prev) => prev.filter((s) => s.id !== slot.id));
      }
    } catch (err) {
      console.error('Failed to delete time slot:', err);
    }
  };

  // Parties handlers
  const handleCreateParty = () => {
    setEditingParty(null);
    setPartyFormData({
      name: '',
      basePrice: '',
      capacity: '',
      duration: '',
      includedItems: [],
      addOns: [],
      description: '',
      stripePurchaseLink: '',
      isActive: true,
    });
    setPartyFormErrors({});
    setShowPartyForm(true);
  };

  const handleEditParty = (party: PartyProduct) => {
    setEditingParty(party);
    setPartyFormData({
      name: party.name,
      basePrice: party.basePrice.toString(),
      capacity: party.capacity.toString(),
      duration: party.duration.toString(),
      includedItems: [...party.includedItems],
      addOns: party.addOns.map(a => ({ ...a, price: a.price.toString() })),
      description: party.description,
      stripePurchaseLink: party.stripePurchaseLink,
      isActive: party.isActive,
    });
    setPartyFormErrors({});
    setShowPartyForm(true);
  };

  const handleSaveParty = async () => {
    const errors: Record<string, string> = {};

    const nameValidation = validateProductName(partyFormData.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!;
    }

    const priceValidation = validatePrice(partyFormData.basePrice);
    if (!priceValidation.valid) {
      errors.basePrice = priceValidation.error!;
    }

    const capacityValidation = validateQuantity(partyFormData.capacity, 'Capacity');
    if (!capacityValidation.valid) {
      errors.capacity = capacityValidation.error!;
    }

    const durationValidation = validateQuantity(partyFormData.duration, 'Duration');
    if (!durationValidation.valid) {
      errors.duration = durationValidation.error!;
    }

    const linkValidation = validateStripeLinkOptional(partyFormData.stripePurchaseLink);
    if (!linkValidation.valid) {
      errors.stripePurchaseLink = linkValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      setPartyFormErrors(errors);
      return;
    }

    setSavingParty(true);
    setPartyFormErrors({});

    try {
      const processedAddOns = partyFormData.addOns.map(a => ({
        id: a.id || generateId('addon'),
        name: a.name,
        price: parseFloat(a.price),
        description: a.description,
      }));

      const partyData = {
        name: partyFormData.name.trim(),
        basePrice: parseFloat(partyFormData.basePrice),
        capacity: parseInt(partyFormData.capacity),
        duration: parseInt(partyFormData.duration),
        includedItems: partyFormData.includedItems.filter(i => i.trim()),
        addOns: processedAddOns,
        description: partyFormData.description.trim(),
        stripePurchaseLink: partyFormData.stripePurchaseLink.trim(),
        isActive: partyFormData.isActive,
      };

      if (editingParty) {
        const updatedParty = await updateParty(editingParty.id, partyData);
        onUpdateParties(parties.map(p => p.id === editingParty.id ? updatedParty : p));
      } else {
        const newParty = await createParty(partyData);
        onUpdateParties([...parties, newParty]);
      }

      setShowPartyForm(false);
      setEditingParty(null);
    } catch (error) {
      console.error('Error saving party:', error);
      setPartyFormErrors({ submit: error instanceof Error ? error.message : 'Failed to save party' });
    } finally {
      setSavingParty(false);
    }
  };

  const handleDeleteParty = async (id: string) => {
    if (confirmingDelete === id) {
      try {
        await deleteParty(id);
        onUpdateParties(parties.filter(p => p.id !== id));
        setConfirmingDelete(null);
      } catch (error) {
        console.error('Error deleting party:', error);
        alert('Failed to delete party. Please try again.');
      }
    } else {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 5000);
    }
  };

  const handleToggleParty = async (id: string) => {
    try {
      const party = parties.find(p => p.id === id);
      if (!party) return;

      const updatedParty = await updateParty(id, { isActive: !party.isActive });
      onUpdateParties(parties.map(p => p.id === id ? updatedParty : p));
    } catch (error) {
      console.error('Error toggling party:', error);
      alert('Failed to update party. Please try again.');
    }
  };

  const renderParties = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Party Management</h2>
          <Button onClick={handleCreateParty} size="sm">
            ➕ Create New Party Package
          </Button>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">All Party Packages ({parties.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {parties.map((party) => {
              const partyDiscounts = getVolumeDiscountsForProduct(volumeDiscounts, party.id, 'party');

              return (
                <div key={party.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{party.name}</h4>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                          {formatCurrency(party.basePrice)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                          👥 {party.capacity} kids
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{party.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span>⏱️ {party.duration} hours</span>
                        <span>🎁 {party.addOns.length} add-ons</span>
                        <span>✨ {party.includedItems.length} included items</span>
                      </div>
                      {party.includedItems.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-700">Included:</span>
                          {party.includedItems.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {item}
                            </span>
                          ))}
                          {party.includedItems.length > 3 && (
                            <span className="ml-2 text-xs text-gray-500">+{party.includedItems.length - 3} more</span>
                          )}
                        </div>
                      )}
                      {party.stripePurchaseLink && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">🔗 Stripe Link:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {party.stripePurchaseLink.substring(0, 40)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(party.stripePurchaseLink)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}
                      {partyDiscounts.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-purple-700">💰 Volume Discounts:</span>
                          {partyDiscounts.map(d => (
                            <span key={d.id} className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Buy {d.minQuantity}+, get {d.discountPercent}% off
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Active:</label>
                        <input
                          type="checkbox"
                          checked={party.isActive}
                          onChange={() => handleToggleParty(party.id)}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <Button
                        onClick={() => handleEditParty(party)}
                        size="sm"
                        variant="outline"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteParty(party.id)}
                        size="sm"
                        variant="outline"
                        className={`transition-colors ${
                          confirmingDelete === party.id
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        }`}
                      >
                        {confirmingDelete === party.id ? '✓ Confirm' : '🗑️ Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {parties.length === 0 && (
              <p className="text-gray-500 text-center py-8">No party packages created yet</p>
            )}
          </div>
        </Card>

        {/* Time Slots Management */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">🕐 Party Time Slots</h3>
            <Button onClick={() => setShowSlotForm(!showSlotForm)} size="sm">
              {showSlotForm ? '✕ Cancel' : '➕ Add Time Slot'}
            </Button>
          </div>

          {/* Add Time Slot Form */}
          {showSlotForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Party Type</label>
                  <select
                    value={newSlot.partyType}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, partyType: e.target.value as 'private' | 'semi_private' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="semi_private">Semi-Private</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Day Type</label>
                  <select
                    value={newSlot.dayType}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, dayType: e.target.value as 'weekday' | 'weekend' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="weekend">Weekend</option>
                    <option value="weekday">Weekday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={createTimeSlot} size="sm" disabled={isCreatingSlot}>
                  {isCreatingSlot ? 'Creating...' : '✓ Create Slot'}
                </Button>
              </div>
            </div>
          )}

          {/* Time Slots Display */}
          {isLoadingSlots ? (
            <div className="text-center py-4 text-gray-500">Loading time slots...</div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No time slots configured yet</div>
          ) : (
            <div className="space-y-4">
              {(['private', 'semi_private'] as const).map((partyType) => {
                const slotsForType = timeSlots.filter((s) => s.party_type === partyType);
                if (slotsForType.length === 0) return null;

                return (
                  <div key={partyType}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {partyType === 'private' ? '🎉 Private' : '👥 Semi-Private'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(['weekend', 'weekday'] as const).map((dayType) => {
                        const slots = slotsForType.filter((s) => s.day_type === dayType);
                        if (slots.length === 0) return null;

                        return (
                          <div key={dayType} className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              {dayType === 'weekend' ? '📅 Weekend' : '📅 Weekday'}
                            </div>
                            <div className="space-y-1">
                              {slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                                    slot.is_active ? 'bg-green-100' : 'bg-gray-200 opacity-60'
                                  }`}
                                >
                                  <span>{slot.label}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleSlotStatus(slot)}
                                      className={`px-2 py-0.5 rounded text-xs ${
                                        slot.is_active
                                          ? 'bg-green-200 text-green-800'
                                          : 'bg-gray-300 text-gray-600'
                                      }`}
                                    >
                                      {slot.is_active ? 'ON' : 'OFF'}
                                    </button>
                                    <button
                                      onClick={() => deleteTimeSlot(slot)}
                                      className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Party Form Modal */}
        {showPartyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingParty ? 'Edit Party Package' : 'Create New Party Package'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={partyFormData.name}
                    onChange={(e) => setPartyFormData({ ...partyFormData, name: e.target.value })}
                    placeholder="e.g., Standard Birthday Party"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {partyFormErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{partyFormErrors.name}</p>
                  )}
                </div>

                {/* Price, Capacity, Duration */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price * ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={partyFormData.basePrice}
                      onChange={(e) => setPartyFormData({ ...partyFormData, basePrice: e.target.value })}
                      placeholder="299.99"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {partyFormErrors.basePrice && (
                      <p className="text-red-600 text-sm mt-1">{partyFormErrors.basePrice}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity * (kids)
                    </label>
                    <input
                      type="number"
                      value={partyFormData.capacity}
                      onChange={(e) => setPartyFormData({ ...partyFormData, capacity: e.target.value })}
                      placeholder="12"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {partyFormErrors.capacity && (
                      <p className="text-red-600 text-sm mt-1">{partyFormErrors.capacity}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration * (hours)
                    </label>
                    <input
                      type="number"
                      value={partyFormData.duration}
                      onChange={(e) => setPartyFormData({ ...partyFormData, duration: e.target.value })}
                      placeholder="2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {partyFormErrors.duration && (
                      <p className="text-red-600 text-sm mt-1">{partyFormErrors.duration}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={partyFormData.description}
                    onChange={(e) => setPartyFormData({ ...partyFormData, description: e.target.value })}
                    placeholder="Perfect party for up to 12 kids!"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                {/* Included Items */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Included Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={partyFormData.includedItems.join(', ')}
                    onChange={(e) => setPartyFormData({
                      ...partyFormData,
                      includedItems: e.target.value.split(',').map(i => i.trim())
                    })}
                    placeholder="Private party area, Decorations, Plates, Party host"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate items with commas</p>
                </div>

                {/* Add-Ons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add-Ons (optional extras customers can purchase)
                  </label>
                  <div className="space-y-2 mb-2">
                    {partyFormData.addOns.map((addon, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={addon.name}
                          onChange={(e) => {
                            const newAddOns = [...partyFormData.addOns];
                            newAddOns[idx].name = e.target.value;
                            setPartyFormData({ ...partyFormData, addOns: newAddOns });
                          }}
                          placeholder="Add-on name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={addon.price}
                          onChange={(e) => {
                            const newAddOns = [...partyFormData.addOns];
                            newAddOns[idx].price = e.target.value;
                            setPartyFormData({ ...partyFormData, addOns: newAddOns });
                          }}
                          placeholder="Price"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                        <input
                          type="text"
                          value={addon.description}
                          onChange={(e) => {
                            const newAddOns = [...partyFormData.addOns];
                            newAddOns[idx].description = e.target.value;
                            setPartyFormData({ ...partyFormData, addOns: newAddOns });
                          }}
                          placeholder="Description"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                        <button
                          onClick={() => {
                            const newAddOns = partyFormData.addOns.filter((_, i) => i !== idx);
                            setPartyFormData({ ...partyFormData, addOns: newAddOns });
                          }}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setPartyFormData({
                        ...partyFormData,
                        addOns: [...partyFormData.addOns, { id: '', name: '', price: '', description: '' }]
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Another Add-On
                  </button>
                </div>

                {/* Stripe Purchase Link (Read-only - auto-generated by Stripe sync) */}
                {editingParty && partyFormData.stripePurchaseLink && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔗 Stripe Purchase Link <span className="text-xs text-gray-500">(auto-generated)</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={partyFormData.stripePurchaseLink}
                        readOnly
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(partyFormData.stripePurchaseLink)}
                        className="px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Toggle */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="partyActive"
                    checked={partyFormData.isActive}
                    onChange={(e) => setPartyFormData({ ...partyFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="partyActive" className="text-sm text-gray-700 font-medium">
                    Party package is active (customers can book)
                  </label>
                </div>
              </div>

              {/* Submit Error */}
              {partyFormErrors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">{partyFormErrors.submit}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 mt-8">
                <Button
                  onClick={() => {
                    setShowPartyForm(false);
                    setEditingParty(null);
                    setPartyFormErrors({});
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={savingParty}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveParty}
                  className="flex-1"
                  loading={savingParty}
                  disabled={savingParty}
                >
                  {editingParty ? '💾 Update Party' : '✨ Create Party'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Products handlers
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      category: 'food',
      price: '',
      description: '',
      allergens: [],
      stripePurchaseLink: '',
      isActive: true,
      available: true,
      trackInventory: false,
      quantityOnHand: '',
      lowStockThreshold: '5',
    });
    setProductFormErrors({});
    setShowProductForm(true);
  };

  const handleEditProduct = (product: FoodProduct) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      allergens: Array.isArray(product.allergens) ? [...product.allergens] : [],
      stripePurchaseLink: product.stripePurchaseLink || '',
      isActive: product.isActive,
      available: product.available,
      trackInventory: product.quantityOnHand !== null,
      quantityOnHand: product.quantityOnHand !== null ? product.quantityOnHand.toString() : '',
      lowStockThreshold: (product.lowStockThreshold ?? 5).toString(),
    });
    setProductFormErrors({});
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    const errors: Record<string, string> = {};

    const nameValidation = validateProductName(productFormData.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!;
    }

    const priceValidation = validatePrice(productFormData.price);
    if (!priceValidation.valid) {
      errors.price = priceValidation.error!;
    }

    const linkValidation = validateStripeLinkOptional(productFormData.stripePurchaseLink);
    if (!linkValidation.valid) {
      errors.stripePurchaseLink = linkValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      setProductFormErrors(errors);
      return;
    }

    try {
      const productData = {
        name: productFormData.name.trim(),
        category: productFormData.category,
        price: parseFloat(productFormData.price),
        description: productFormData.description.trim(),
        allergens: productFormData.allergens,
        stripePurchaseLink: productFormData.stripePurchaseLink.trim(),
        isActive: productFormData.isActive,
        available: productFormData.available,
        quantityOnHand: productFormData.trackInventory && productFormData.quantityOnHand !== ''
          ? parseInt(productFormData.quantityOnHand)
          : null,
        lowStockThreshold: productFormData.trackInventory
          ? parseInt(productFormData.lowStockThreshold) || 5
          : 5,
      };

      if (editingProduct) {
        const updatedProduct = await updateProduct(editingProduct.id, productData);
        onUpdateProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
      } else {
        const newProduct = await createProduct(productData);
        onUpdateProducts([...products, newProduct]);
      }

      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      setProductFormErrors({ submit: error instanceof Error ? error.message : 'Failed to save product' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirmingDelete === id) {
      try {
        await deleteProduct(id);
        onUpdateProducts(products.filter(p => p.id !== id));
        setConfirmingDelete(null);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    } else {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 5000);
    }
  };

  const handleToggleProduct = async (id: string) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;

      const updatedProduct = await updateProduct(id, { isActive: !product.isActive });
      onUpdateProducts(products.map(p => p.id === id ? updatedProduct : p));
    } catch (error) {
      console.error('Error toggling product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleToggleProductAvailability = async (id: string) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;

      const updatedProduct = await updateProduct(id, { available: !product.available });
      onUpdateProducts(products.map(p => p.id === id ? updatedProduct : p));
    } catch (error) {
      console.error('Error toggling product availability:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const toggleAllergen = (allergen: Allergen) => {
    const newAllergens = productFormData.allergens.includes(allergen)
      ? productFormData.allergens.filter(a => a !== allergen)
      : [...productFormData.allergens, allergen];
    setProductFormData({ ...productFormData, allergens: newAllergens });
  };

  const renderProducts = () => {
    const allergenOptions: Allergen[] = ['peanuts', 'tree_nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'];

    const trackedProducts = products.filter(p => p.quantityOnHand !== null && p.quantityOnHand !== undefined);
    const lowStockProducts = trackedProducts.filter(p => p.quantityOnHand! > 0 && p.quantityOnHand! <= (p.lowStockThreshold ?? 5));
    const soldOutProducts = trackedProducts.filter(p => p.quantityOnHand === 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <Button onClick={handleCreateProduct} size="sm">
            ➕ Create New Product
          </Button>
        </div>

        {/* Inventory Summary */}
        {trackedProducts.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{trackedProducts.length}</p>
              <p className="text-sm text-gray-600">Tracked Products</p>
            </Card>
            <Card className={`p-4 text-center ${lowStockProducts.length > 0 ? 'ring-2 ring-orange-300' : ''}`}>
              <p className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {lowStockProducts.length}
              </p>
              <p className="text-sm text-gray-600">Low Stock</p>
            </Card>
            <Card className={`p-4 text-center ${soldOutProducts.length > 0 ? 'ring-2 ring-red-300' : ''}`}>
              <p className={`text-2xl font-bold ${soldOutProducts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {soldOutProducts.length}
              </p>
              <p className="text-sm text-gray-600">Sold Out</p>
            </Card>
          </div>
        )}

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">All Products ({products.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {products.map((product) => {
              const productDiscounts = getVolumeDiscountsForProduct(volumeDiscounts, product.id, 'product');

              return (
                <div key={product.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{product.name}</h4>
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                          {formatProductCategory(product.category)}
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                          {formatCurrency(product.price)}
                        </span>
                        {product.quantityOnHand !== null && product.quantityOnHand !== undefined ? (
                          product.quantityOnHand === 0 ? (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                              SOLD OUT
                            </span>
                          ) : product.quantityOnHand <= (product.lowStockThreshold ?? 5) ? (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
                              Low Stock: {product.quantityOnHand}
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                              Stock: {product.quantityOnHand}
                            </span>
                          )
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium">
                            Untracked
                          </span>
                        )}
                        {!product.available && (
                          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      {Array.isArray(product.allergens) && product.allergens.length > 0 && (
                        <div className="flex items-center flex-wrap gap-2 text-xs text-orange-600 mb-2">
                          <span>⚠️ Allergens:</span>
                          {product.allergens.map(a => (
                            <span key={a} className="bg-orange-100 px-2 py-1 rounded">{formatAllergen(a)}</span>
                          ))}
                        </div>
                      )}
                      {product.stripePurchaseLink && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">🔗 Stripe Link:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {product.stripePurchaseLink.substring(0, 40)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(product.stripePurchaseLink)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}
                      {productDiscounts.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-purple-700">💰 Volume Discounts:</span>
                          {productDiscounts.map(d => (
                            <span key={d.id} className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Buy {d.minQuantity}+, get {d.discountPercent}% off
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Available:</label>
                        <input
                          type="checkbox"
                          checked={product.available}
                          onChange={() => handleToggleProductAvailability(product.id)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Active:</label>
                        <input
                          type="checkbox"
                          checked={product.isActive}
                          onChange={() => handleToggleProduct(product.id)}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <Button
                        onClick={() => handleEditProduct(product)}
                        size="sm"
                        variant="outline"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        size="sm"
                        variant="outline"
                        className={`transition-colors ${
                          confirmingDelete === product.id
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        }`}
                      >
                        {confirmingDelete === product.id ? '✓ Confirm' : '🗑️ Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && (
              <p className="text-gray-500 text-center py-8">No products created yet</p>
            )}
          </div>
        </Card>

        {/* Product Form Modal */}
        {showProductForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    placeholder="e.g., Cheese Pizza (Large)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {productFormErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{productFormErrors.name}</p>
                  )}
                </div>

                {/* Category and Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={productFormData.category}
                      onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value as ProductCategory })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="food">Food</option>
                      <option value="beverage">Beverage</option>
                      <option value="retail">Retail</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price * ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                      placeholder="12.99"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {productFormErrors.price && (
                      <p className="text-red-600 text-sm mt-1">{productFormErrors.price}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    placeholder="Large cheese pizza, 8 slices"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                {/* Allergens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergens (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {allergenOptions.map(allergen => (
                      <label key={allergen} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productFormData.allergens.includes(allergen)}
                          onChange={() => toggleAllergen(allergen)}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{formatAllergen(allergen)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Stripe Purchase Link (Read-only - auto-generated by Stripe sync) */}
                {editingProduct && productFormData.stripePurchaseLink && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔗 Stripe Purchase Link <span className="text-xs text-gray-500">(auto-generated)</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={productFormData.stripePurchaseLink}
                        readOnly
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(productFormData.stripePurchaseLink)}
                        className="px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}

                {/* Inventory Tracking */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="trackInventory"
                      checked={productFormData.trackInventory}
                      onChange={(e) => setProductFormData({
                        ...productFormData,
                        trackInventory: e.target.checked,
                        quantityOnHand: e.target.checked ? productFormData.quantityOnHand : '',
                      })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="trackInventory" className="text-sm text-gray-700 font-medium">
                      Track inventory for this product
                    </label>
                  </div>
                  {productFormData.trackInventory && (
                    <div className="grid grid-cols-2 gap-4 pl-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity on Hand
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={productFormData.quantityOnHand}
                          onChange={(e) => setProductFormData({ ...productFormData, quantityOnHand: e.target.value })}
                          placeholder="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Low Stock Alert Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={productFormData.lowStockThreshold}
                          onChange={(e) => setProductFormData({ ...productFormData, lowStockThreshold: e.target.value })}
                          placeholder="5"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email alert sent when stock falls to this level</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active and Available Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="productActive"
                      checked={productFormData.isActive}
                      onChange={(e) => setProductFormData({ ...productFormData, isActive: e.target.checked })}
                      className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor="productActive" className="text-sm text-gray-700 font-medium">
                      Product is active (visible in system)
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="productAvailable"
                      checked={productFormData.available}
                      onChange={(e) => setProductFormData({ ...productFormData, available: e.target.checked })}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="productAvailable" className="text-sm text-gray-700 font-medium">
                      Product is available (in stock, can be purchased)
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 mt-8">
                <Button
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                    setProductFormErrors({});
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProduct}
                  className="flex-1"
                >
                  {editingProduct ? '💾 Update Product' : '✨ Create Product'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleUnsubscribe = async (subscriberId: string) => {
    try {
      const response = await fetch(`/api/newsletter-subscribers/${subscriberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe' }),
      });
      if (response.ok) {
        fetchNewsletterSubscribers();
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  const handleReactivateSubscriber = async (subscriberId: string) => {
    try {
      const response = await fetch(`/api/newsletter-subscribers/${subscriberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      });
      if (response.ok) {
        fetchNewsletterSubscribers();
      }
    } catch (error) {
      console.error('Failed to reactivate subscriber:', error);
    }
  };

  const handleDeleteSubscriber = async (subscriberId: string) => {
    if (confirmingDelete === subscriberId) {
      try {
        const response = await fetch(`/api/newsletter-subscribers/${subscriberId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchNewsletterSubscribers();
        }
      } catch (error) {
        console.error('Failed to delete subscriber:', error);
      }
      setConfirmingDelete(null);
    } else {
      setConfirmingDelete(subscriberId);
      setTimeout(() => setConfirmingDelete(null), 3000);
    }
  };

  const handleSendNewsletter = async () => {
    if (!confirmSend) {
      setConfirmSend(true);
      setTimeout(() => setConfirmSend(false), 5000);
      return;
    }

    setConfirmSend(false);
    setNewsletterSending(true);
    setNewsletterSendResult(null);

    try {
      const payload: Record<string, string> = {
        subject: newsletterSubject,
        heading: newsletterHeading,
        body: newsletterBody,
      };
      if (newsletterCtaText && newsletterCtaUrl) {
        payload.ctaText = newsletterCtaText;
        payload.ctaUrl = newsletterCtaUrl;
      }

      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setNewsletterSendResult({
          success: true,
          sent: data.sent,
          failed: data.failed,
          total: data.total,
        });
      } else {
        setNewsletterSendResult({
          success: false,
          sent: 0,
          failed: 0,
          total: 0,
        });
      }
    } catch (error) {
      console.error('Failed to send newsletter:', error);
      setNewsletterSendResult({
        success: false,
        sent: 0,
        failed: 0,
        total: 0,
      });
    } finally {
      setNewsletterSending(false);
    }
  };

  const handleSendTestNewsletter = async () => {
    if (!testEmail || !isComposeValid) return;

    setTestSending(true);
    setTestResult(null);

    try {
      const payload: Record<string, string> = {
        testEmail,
        subject: newsletterSubject,
        heading: newsletterHeading,
        body: newsletterBody,
      };
      if (newsletterCtaText && newsletterCtaUrl) {
        payload.ctaText = newsletterCtaText;
        payload.ctaUrl = newsletterCtaUrl;
      }

      const response = await fetch('/api/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setTestResult({ success: true, message: `Test email sent to ${testEmail}` });
      } else {
        const data = await response.json();
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Failed to send test newsletter:', error);
      setTestResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setTestSending(false);
    }
  };

  const resetComposeForm = () => {
    setNewsletterSubject('');
    setNewsletterHeading('');
    setNewsletterBody('');
    setNewsletterCtaText('');
    setNewsletterCtaUrl('');
    setNewsletterSendResult(null);
    setShowPreview(false);
    setConfirmSend(false);
    setShowCompose(false);
    setTestEmail('');
    setTestResult(null);
  };

  const isComposeValid = newsletterSubject.trim() && newsletterHeading.trim() && newsletterBody.trim();

  const renderNewsletter = () => {
    const filteredSubscribers = newsletterSubscribers.filter(sub =>
      sub.name.toLowerCase().includes(newsletterSearchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(newsletterSearchTerm.toLowerCase())
    );

    const formatSubscribedDate = (dateString: string) => {
      return parseDateString(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{newsletterStats.total}</p>
              <p className="text-sm text-gray-600">Total Subscribers</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{newsletterStats.active}</p>
              <p className="text-sm text-gray-600">Active Subscribers</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-500">{newsletterStats.unsubscribed}</p>
              <p className="text-sm text-gray-600">Unsubscribed</p>
            </div>
          </Card>
        </div>

        {/* WYSIWYG Newsletter Editor */}
        <NewsletterEditor
          activeSubscriberCount={newsletterStats.active}
          emailConfigured={emailConfigured !== false}
        />

        {/* Subscriber List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Newsletter Subscribers</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search subscribers..."
                value={newsletterSearchTerm}
                onChange={(e) => setNewsletterSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
              />
              <Button
                onClick={fetchNewsletterSubscribers}
                size="sm"
                variant="outline"
                disabled={newsletterLoading}
              >
                &#x1F504; Refresh
              </Button>
            </div>
          </div>

          {newsletterLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading subscribers...</p>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg mb-2">&#x1F4E7; No subscribers yet</p>
              <p className="text-sm text-gray-400">
                Newsletter signups from the website footer will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Email</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Subscribed</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Source</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{subscriber.name}</td>
                      <td className="py-3 px-2">
                        <a
                          href={`mailto:${subscriber.email}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {subscriber.email}
                        </a>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {formatSubscribedDate(subscriber.subscribedAt)}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {subscriber.source.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {subscriber.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          {subscriber.isActive ? (
                            <Button
                              onClick={() => handleUnsubscribe(subscriber.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              Unsubscribe
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleReactivateSubscriber(subscriber.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              Reactivate
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteSubscriber(subscriber.id)}
                            size="sm"
                            variant="outline"
                            className={`text-xs ${
                              confirmingDelete === subscriber.id
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : ''
                            }`}
                          >
                            {confirmingDelete === subscriber.id ? 'Confirm' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Export Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Export Subscribers</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download your subscriber list for use in email marketing platforms like Mailchimp, ConvertKit, or Constant Contact.
          </p>
          <Button
            onClick={() => {
              const activeSubscribers = newsletterSubscribers.filter(s => s.isActive);
              const csv = [
                'Name,Email,Subscribed Date,Source',
                ...activeSubscribers.map(s =>
                  `"${s.name}","${s.email}","${formatSubscribedDate(s.subscribedAt)}","${s.source}"`
                )
              ].join('\n');

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            size="sm"
            variant="outline"
          >
            &#x1F4E5; Export Active Subscribers (CSV)
          </Button>
        </Card>
      </div>
    );
  };

  const renderPasses = () => {
    return (
      <div className="space-y-6">
        {/* Create New Pass Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Pass Management</h2>
          <Button onClick={handleCreatePass} size="sm">
            ➕ Create New Pass
          </Button>
        </div>

        {/* Passes List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">All Passes ({passes.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {passes.map((pass) => {
              const passDiscounts = getVolumeDiscountsForProduct(volumeDiscounts, pass.id, 'pass');

              return (
                <div key={pass.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{pass.name}</h4>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                          {formatPassCategory(pass.category)}
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                          {formatCurrency(pass.price)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pass.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>⏱️ {pass.duration} {pass.category === 'day' ? 'hours' : 'days'}</span>
                        <span>🎫 {pass.sessionsIncluded === 999 ? 'Unlimited sessions' : `${pass.sessionsIncluded} session(s)`}</span>
                      </div>
                      {pass.stripePurchaseLink && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">🔗 Stripe Link:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {pass.stripePurchaseLink.substring(0, 40)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(pass.stripePurchaseLink)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}
                      {passDiscounts.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-purple-700">💰 Volume Discounts:</span>
                          {passDiscounts.map(d => (
                            <span key={d.id} className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Buy {d.minQuantity}+, get {d.discountPercent}% off
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Active:</label>
                        <input
                          type="checkbox"
                          checked={pass.isActive}
                          onChange={() => handleTogglePass(pass.id)}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <Button
                        onClick={() => handleEditPass(pass)}
                        size="sm"
                        variant="outline"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        onClick={() => handleDeletePass(pass.id)}
                        size="sm"
                        variant="outline"
                        className={`transition-colors ${
                          confirmingDelete === pass.id
                            ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                        }`}
                      >
                        {confirmingDelete === pass.id ? '✓ Confirm' : '🗑️ Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {passes.length === 0 && (
              <p className="text-gray-500 text-center py-8">No passes created yet</p>
            )}
          </div>
        </Card>

        {/* Pass Form Modal */}
        {showPassForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingPass ? 'Edit Pass' : 'Create New Pass'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pass Name *
                  </label>
                  <input
                    type="text"
                    value={passFormData.name}
                    onChange={(e) => setPassFormData({ ...passFormData, name: e.target.value })}
                    placeholder="e.g., Single Day Pass"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {passFormErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{passFormErrors.name}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pass Category *
                  </label>
                  <select
                    value={passFormData.category}
                    onChange={(e) => setPassFormData({ ...passFormData, category: e.target.value as PassCategory })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="day">Day Pass</option>
                    <option value="weekly">Weekly Pass</option>
                    <option value="monthly">Monthly Pass</option>
                  </select>
                </div>

                {/* Price and Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price * ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={passFormData.price}
                      onChange={(e) => setPassFormData({ ...passFormData, price: e.target.value })}
                      placeholder="15.99"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {passFormErrors.price && (
                      <p className="text-red-600 text-sm mt-1">{passFormErrors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration * ({passFormData.category === 'day' ? 'hours' : 'days'})
                    </label>
                    <input
                      type="number"
                      value={passFormData.duration}
                      onChange={(e) => setPassFormData({ ...passFormData, duration: e.target.value })}
                      placeholder={passFormData.category === 'day' ? '8' : '30'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    {passFormErrors.duration && (
                      <p className="text-red-600 text-sm mt-1">{passFormErrors.duration}</p>
                    )}
                  </div>
                </div>

                {/* Sessions Included */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions Included * (use 999 for unlimited)
                  </label>
                  <input
                    type="number"
                    value={passFormData.sessionsIncluded}
                    onChange={(e) => setPassFormData({ ...passFormData, sessionsIncluded: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {passFormErrors.sessionsIncluded && (
                    <p className="text-red-600 text-sm mt-1">{passFormErrors.sessionsIncluded}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={passFormData.description}
                    onChange={(e) => setPassFormData({ ...passFormData, description: e.target.value })}
                    placeholder="Full day of play! Valid for one entry..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                {/* Stripe Purchase Link (Read-only - auto-generated by Stripe sync) */}
                {editingPass && passFormData.stripePurchaseLink && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔗 Stripe Purchase Link <span className="text-xs text-gray-500">(auto-generated)</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={passFormData.stripePurchaseLink}
                        readOnly
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(passFormData.stripePurchaseLink)}
                        className="px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Toggle */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="passActive"
                    checked={passFormData.isActive}
                    onChange={(e) => setPassFormData({ ...passFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="passActive" className="text-sm text-gray-700 font-medium">
                    Pass is active (customers can purchase)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 mt-8">
                <Button
                  onClick={() => {
                    setShowPassForm(false);
                    setEditingPass(null);
                    setPassFormErrors({});
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePass}
                  className="flex-1"
                >
                  {editingPass ? '💾 Update Pass' : '✨ Create Pass'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGiftCards = () => {
    const filteredGiftCards = giftCards.filter(card => {
      const matchesSearch = giftCardSearch === '' ||
        card.purchaser_name.toLowerCase().includes(giftCardSearch.toLowerCase()) ||
        card.purchaser_email.toLowerCase().includes(giftCardSearch.toLowerCase()) ||
        card.recipient_name.toLowerCase().includes(giftCardSearch.toLowerCase()) ||
        card.recipient_email.toLowerCase().includes(giftCardSearch.toLowerCase()) ||
        card.code.toLowerCase().includes(giftCardSearch.toLowerCase());
      const matchesStatus = giftCardStatusFilter === 'all' || card.status === giftCardStatusFilter;
      return matchesSearch && matchesStatus;
    });

    const statusLabel = (status: string) => {
      switch (status) {
        case 'pending': return { text: 'Pending', bg: 'bg-yellow-100', color: 'text-yellow-800' };
        case 'sent': return { text: 'Sent', bg: 'bg-blue-100', color: 'text-blue-800' };
        case 'redeemed': return { text: 'Redeemed', bg: 'bg-green-100', color: 'text-green-800' };
        case 'partially_redeemed': return { text: 'Partial', bg: 'bg-orange-100', color: 'text-orange-800' };
        default: return { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
      }
    };

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🎁</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Gift Cards</p>
                <p className="text-xl font-bold text-gray-900">{giftCardsStats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Value Sold</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(giftCardsStats.totalValue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Remaining Balance</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(giftCardsStats.totalRemaining)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Redeemed</p>
                <p className="text-xl font-bold text-gray-900">{giftCardsStats.redeemed}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={giftCardSearch}
              onChange={(e) => setGiftCardSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={giftCardStatusFilter}
              onChange={(e) => setGiftCardStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="partially_redeemed">Partially Redeemed</option>
              <option value="redeemed">Redeemed</option>
            </select>
            <Button onClick={fetchGiftCards} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </Card>

        {/* Gift Cards List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Gift Cards ({filteredGiftCards.length})
          </h3>
          {giftCardsLoading ? (
            <p className="text-gray-500 text-center py-8">Loading gift cards...</p>
          ) : filteredGiftCards.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Purchased By</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Recipient</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600">Amount</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600">Remaining</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiftCards.map((card) => {
                    const status = statusLabel(card.status);
                    return (
                      <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-600">
                          {new Date(card.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{card.code}</code>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-gray-900">{card.purchaser_name}</div>
                          <div className="text-xs text-gray-500">{card.purchaser_email}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-gray-900">{card.recipient_name}</div>
                          <div className="text-xs text-gray-500">{card.recipient_email}</div>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold">
                          {formatCurrency(Number(card.amount))}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatCurrency(Number(card.remaining_amount))}</span>
                            {Number(card.remaining_amount) > 0 && (
                              confirmingGiftCardRefund === card.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    onClick={() => handleGiftCardRefund(card.id)}
                                    disabled={refundingGiftCard === card.id}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-red-600 border-red-300 hover:bg-red-50 animate-pulse"
                                  >
                                    {refundingGiftCard === card.id ? 'Processing...' : 'Confirm'}
                                  </Button>
                                  <Button
                                    onClick={() => setConfirmingGiftCardRefund(null)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setConfirmingGiftCardRefund(card.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs text-red-600 hover:bg-red-50"
                                >
                                  Refund
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No gift cards found</p>
          )}
        </Card>
      </div>
    );
  };

  const renderMonthlyMembers = () => {
    const filtered = monthlyMembers.filter(m => {
      const matchesSearch = monthlyMemberSearch === '' ||
        m.customerName.toLowerCase().includes(monthlyMemberSearch.toLowerCase()) ||
        m.customerPhone.includes(monthlyMemberSearch) ||
        (m.customerEmail?.toLowerCase().includes(monthlyMemberSearch.toLowerCase())) ||
        (m.childName?.toLowerCase().includes(monthlyMemberSearch.toLowerCase())) ||
        m.passName.toLowerCase().includes(monthlyMemberSearch.toLowerCase());
      const matchesStatus = monthlyMemberStatusFilter === 'all' || m.status === monthlyMemberStatusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🎟️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Passes</p>
                <p className="text-xl font-bold text-gray-900">{monthlyMembersStats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-xl font-bold text-gray-900">{monthlyMembersStats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-xl">⏰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-xl font-bold text-gray-900">{monthlyMembersStats.expired}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Auto-Renew</p>
                <p className="text-xl font-bold text-gray-900">{monthlyMembersStats.autoRenewEnabled}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, phone, email, or pass..."
              value={monthlyMemberSearch}
              onChange={(e) => setMonthlyMemberSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={monthlyMemberStatusFilter}
              onChange={(e) => setMonthlyMemberStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="refunded">Refunded</option>
            </select>
            <Button onClick={fetchMonthlyMembers} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </Card>

        {/* Members Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Pass Members ({filtered.length})</h3>
          {monthlyMembersLoading ? (
            <p className="text-gray-500 text-center py-8">Loading members...</p>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Child</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Pass</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600">Price</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Purchased</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Expires</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Auto-Renew</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member) => {
                    const statusStyle = member.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : member.status === 'expired'
                      ? 'bg-red-100 text-red-800'
                      : member.status === 'refunded'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-yellow-100 text-yellow-800';
                    return (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="font-medium text-gray-900">{member.customerName}</div>
                          <div className="text-xs text-gray-500">{member.customerPhone}</div>
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {member.childName || '—'}
                        </td>
                        <td className="py-3 px-2 text-gray-900">{member.passName}</td>
                        <td className="py-3 px-2 text-right font-semibold">
                          {formatCurrency(member.price)}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {new Date(member.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {member.expiryDate
                            ? new Date(member.expiryDate).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {member.autoRenew ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No monthly pass members found</p>
          )}
        </Card>
      </div>
    );
  };

  const renderPunchCards = () => {
    const filtered = punchCards.filter(c => {
      if (punchCardSearch === '') return true;
      const search = punchCardSearch.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(search) ||
        c.customerPhone.includes(search) ||
        (c.customerEmail?.toLowerCase().includes(search)) ||
        (c.childName?.toLowerCase().includes(search)) ||
        c.passName.toLowerCase().includes(search)
      );
    });

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🎫</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Punch Cards</p>
                <p className="text-xl font-bold text-gray-900">{punchCardsStats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Visits Remaining</p>
                <p className="text-xl font-bold text-gray-900">{punchCardsStats.totalRemaining}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Visits Used</p>
                <p className="text-xl font-bold text-gray-900">{punchCardsStats.totalUsed}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, phone, email, or child..."
              value={punchCardSearch}
              onChange={(e) => setPunchCardSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Button onClick={fetchPunchCards} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </Card>

        {/* Punch Cards Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Active Punch Cards ({filtered.length})</h3>
          {punchCardsLoading ? (
            <p className="text-gray-500 text-center py-8">Loading punch cards...</p>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Child</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Pass</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Used</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Remaining</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Purchased</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">First Used</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((card) => (
                    <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900">{card.customerName}</div>
                        <div className="text-xs text-gray-500">{card.customerPhone}</div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {card.childName || '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-900">{card.passName}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-gray-600">{card.usedSessions} / {card.totalSessions}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${
                          card.remainingSessions <= 2
                            ? 'bg-red-100 text-red-800'
                            : card.remainingSessions <= 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {card.remainingSessions} visits left
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {new Date(card.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {card.firstUseDate
                          ? new Date(card.firstUseDate).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No active punch cards found</p>
          )}
        </Card>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Auto-Checkout Settings */}
      <Card className="p-6 border-2 border-purple-200 bg-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
              <span>🕐</span>
              Auto-Checkout Settings
            </h3>
            <p className="text-sm text-purple-700 mt-1">
              Sessions will automatically checkout at closing time each day
            </p>
          </div>
        </div>

        {autoCheckoutSettings.loading ? (
          <p className="text-sm text-purple-600 animate-pulse">Loading settings...</p>
        ) : (
          <div className="space-y-4">
            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <div className="flex gap-2">
                <select
                  value={autoCheckoutSettings.timezone}
                  onChange={(e) => setAutoCheckoutSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {US_TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                  {/* Show current timezone if not in US list */}
                  {!US_TIMEZONES.find(tz => tz.value === autoCheckoutSettings.timezone) && (
                    <option value={autoCheckoutSettings.timezone}>{autoCheckoutSettings.timezone}</option>
                  )}
                </select>
                <button
                  onClick={handleDetectTimezone}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Detect
                </button>
              </div>
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Closing Time</label>
              <input
                type="time"
                value={autoCheckoutSettings.closingTime}
                onChange={(e) => setAutoCheckoutSettings(prev => ({ ...prev, closingTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Currently set to {formatTimeDisplay(autoCheckoutSettings.closingTime)}
              </p>
            </div>

            {/* Error message */}
            {autoCheckoutSettings.error && (
              <p className="text-sm text-red-600">{autoCheckoutSettings.error}</p>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveAutoCheckoutSettings}
              disabled={autoCheckoutSettings.saving}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                autoCheckoutSettings.saving
                  ? 'bg-purple-300 text-white cursor-wait'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {autoCheckoutSettings.saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </Card>

      {/* QR Code for Self Check-in */}
      <Card className="p-6 border-2 border-green-200 bg-green-50">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <span>📱</span>
            QR Code Check-In
          </h3>
          <p className="text-sm text-green-700 mt-1">
            Display or print this QR code for customers to self-check-in
          </p>
        </div>
        <QRCodeDisplay />
      </Card>

      {/* Staff Management - Admin Only */}
      {isAdmin && (
        <Card className="p-6 border-2 border-red-200 bg-red-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <span>👥</span>
                Staff Management
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Create and manage staff accounts
              </p>
            </div>
            <button
              onClick={() => {
                setEditingStaffUser(null);
                setStaffFormData({ name: '', phone: '', email: '', password: '', role: 'staff' });
                setStaffFormError('');
                setShowStaffForm(true);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
            >
              + Add Staff
            </button>
          </div>

          {staffLoading ? (
            <p className="text-sm text-red-600 animate-pulse">Loading staff users...</p>
          ) : staffUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No staff users found. Add one to get started.</p>
          ) : (
            <div className="space-y-3">
              {staffUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      {user.phone ? `(${user.phone.slice(0, 3)}) ${user.phone.slice(3, 6)}-${user.phone.slice(6)}` : 'No phone'} &middot; {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                      {!user.has_staff_password && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">No password set</span>
                      )}
                      {user.last_login && (
                        <span className="text-xs text-gray-500">
                          Last login: {new Date(user.last_login).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingStaffUser(user);
                        setStaffFormData({
                          name: user.name,
                          phone: user.phone,
                          email: user.email,
                          password: '',
                          role: user.role,
                        });
                        setStaffFormError('');
                        setShowStaffForm(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStaffUser(user.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        confirmingStaffDelete === user.id
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {confirmingStaffDelete === user.id ? 'Confirm Delete' : 'Delete'}
                    </button>
                    {confirmingStaffDelete === user.id && (
                      <button
                        onClick={() => setConfirmingStaffDelete(null)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Staff Form Modal */}
          {showStaffForm && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
              <h4 className="font-semibold text-gray-900 mb-3">
                {editingStaffUser ? 'Edit Staff User' : 'Add New Staff User'}
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={staffFormData.name}
                      onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="Staff name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="5551234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="staff@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingStaffUser ? '(leave blank to keep)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={staffFormData.password}
                      onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder={editingStaffUser ? 'Unchanged' : 'Min 6 characters'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={staffFormData.role}
                    onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value as 'staff' | 'admin' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {staffFormError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{staffFormError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowStaffForm(false);
                      setEditingStaffUser(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingStaffUser ? handleUpdateStaffUser : handleCreateStaffUser}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                  >
                    {editingStaffUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Stripe Product Sync - Admin Only */}
      {isAdmin && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <span>💳</span>
                Stripe Product Sync
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Sync your passes, parties, and products to Stripe
              </p>
            </div>
            <button
              onClick={handleStripeSync}
              disabled={stripeSyncStatus.syncing || stripeSyncStatus.loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                stripeSyncStatus.syncing
                  ? 'bg-blue-300 text-white cursor-wait'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {stripeSyncStatus.syncing ? '🔄 Syncing...' : '🚀 Sync All to Stripe'}
            </button>
          </div>

          {stripeSyncStatus.loading ? (
            <p className="text-sm text-blue-600 animate-pulse">Loading sync status...</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span>🎫</span>
                  <span className="font-medium text-gray-800">Passes</span>
                </div>
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{stripeSyncStatus.passes.synced}</span>
                  <span className="text-gray-500"> synced / </span>
                  <span className={stripeSyncStatus.passes.unsynced > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                    {stripeSyncStatus.passes.unsynced}
                  </span>
                  <span className="text-gray-500"> pending</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span>🎉</span>
                  <span className="font-medium text-gray-800">Parties</span>
                </div>
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{stripeSyncStatus.parties.synced}</span>
                  <span className="text-gray-500"> synced / </span>
                  <span className={stripeSyncStatus.parties.unsynced > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                    {stripeSyncStatus.parties.unsynced}
                  </span>
                  <span className="text-gray-500"> pending</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span>🍿</span>
                  <span className="font-medium text-gray-800">Products</span>
                </div>
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{stripeSyncStatus.products.synced}</span>
                  <span className="text-gray-500"> synced / </span>
                  <span className={stripeSyncStatus.products.unsynced > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                    {stripeSyncStatus.products.unsynced}
                  </span>
                  <span className="text-gray-500"> pending</span>
                </div>
              </div>
            </div>
          )}

          {stripeSyncStatus.lastSyncResult && (
            <div className="mt-3 p-2 bg-white rounded border border-blue-100">
              <p className="text-sm text-blue-800">
                ✅ Last sync: <span className="font-medium">{stripeSyncStatus.lastSyncResult.synced}</span> products synced
                {stripeSyncStatus.lastSyncResult.errors > 0 && (
                  <span className="text-orange-600"> ({stripeSyncStatus.lastSyncResult.errors} errors)</span>
                )}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <Card className="p-4">
        <nav className="flex flex-wrap gap-3">
          <Button
            onClick={() => setCurrentView('dashboard')}
            variant={currentView === 'dashboard' ? 'default' : 'outline'}
            size="sm"
          >
            📊 Dashboard
          </Button>
          <Button
            onClick={() => setCurrentView('customers')}
            variant={currentView === 'customers' ? 'default' : 'outline'}
            size="sm"
          >
            👥 Customers
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setCurrentView('sales')}
              variant={currentView === 'sales' ? 'default' : 'outline'}
              size="sm"
            >
              💰 Sales
            </Button>
          )}
          <Button
            onClick={() => setCurrentView('sessions')}
            variant={currentView === 'sessions' ? 'default' : 'outline'}
            size="sm"
          >
            🕐 Sessions
          </Button>
          <Button
            onClick={() => setCurrentView('marketing')}
            variant={currentView === 'marketing' ? 'default' : 'outline'}
            size="sm"
          >
            📢 Marketing
          </Button>
          <Button
            onClick={() => setCurrentView('announcements')}
            variant={currentView === 'announcements' ? 'default' : 'outline'}
            size="sm"
          >
            📣 Announcements
          </Button>
          <Button
            onClick={() => setCurrentView('after-dark')}
            variant={currentView === 'after-dark' ? 'default' : 'outline'}
            size="sm"
          >
            🌙 After Dark
          </Button>
          <Button
            onClick={() => setCurrentView('newsletter')}
            variant={currentView === 'newsletter' ? 'default' : 'outline'}
            size="sm"
          >
            📧 Newsletter
          </Button>
          <Button
            onClick={() => setCurrentView('passes')}
            variant={currentView === 'passes' ? 'default' : 'outline'}
            size="sm"
          >
            🎟️ Passes
          </Button>
          <Button
            onClick={() => setCurrentView('parties')}
            variant={currentView === 'parties' ? 'default' : 'outline'}
            size="sm"
          >
            🎉 Parties
          </Button>
          <Button
            onClick={() => setCurrentView('products')}
            variant={currentView === 'products' ? 'default' : 'outline'}
            size="sm"
          >
            🍕 Products
          </Button>
          <Button
            onClick={() => setCurrentView('gift-cards')}
            variant={currentView === 'gift-cards' ? 'default' : 'outline'}
            size="sm"
          >
            🎁 Gift Cards
          </Button>
          <Button
            onClick={() => setCurrentView('coupons')}
            variant={currentView === 'coupons' ? 'default' : 'outline'}
            size="sm"
          >
            🎟️ Coupons
          </Button>
          <Button
            onClick={() => setCurrentView('groups')}
            variant={currentView === 'groups' ? 'default' : 'outline'}
            size="sm"
          >
            🏫 Groups
          </Button>
          <Button
            onClick={() => setCurrentView('monthly-members')}
            variant={currentView === 'monthly-members' ? 'default' : 'outline'}
            size="sm"
          >
            🎟️ Members
          </Button>
          <Button
            onClick={() => setCurrentView('punch-cards')}
            variant={currentView === 'punch-cards' ? 'default' : 'outline'}
            size="sm"
          >
            🎫 Punch Cards
          </Button>
          <Button
            onClick={() => setCurrentView('settings')}
            variant={currentView === 'settings' ? 'default' : 'outline'}
            size="sm"
          >
            ⚙️ Settings
          </Button>
        </nav>
      </Card>

      {/* Content */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'customers' && renderCustomers()}
      {currentView === 'sales' && renderSales()}
      {currentView === 'sessions' && renderDashboard()} {/* Reuse dashboard for now */}
      {currentView === 'marketing' && renderMarketing()}
      {currentView === 'announcements' && <AnnouncementManager />}
      {currentView === 'after-dark' && <AfterDarkAdmin />}

      {currentView === 'events' && <EventBookingsAdmin />}
      {currentView === 'newsletter' && renderNewsletter()}
      {currentView === 'passes' && renderPasses()}
      {currentView === 'parties' && renderParties()}
      {currentView === 'products' && renderProducts()}
      {currentView === 'gift-cards' && renderGiftCards()}
      {currentView === 'coupons' && <CouponsAdmin />}
      {currentView === 'groups' && <GroupsManager />}
      {currentView === 'monthly-members' && renderMonthlyMembers()}
      {currentView === 'punch-cards' && renderPunchCards()}
      {currentView === 'settings' && renderSettings()}

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showCustomerDetail}
        onClose={handleCloseCustomerDetail}
        onCustomerUpdated={handleCustomerUpdated}
      />

      {/* Quick Access: Admin Parties Dashboard */}
      <Card className="p-4 mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎂</span>
            <div>
              <h3 className="font-semibold text-purple-900">Party Management Dashboard</h3>
              <p className="text-sm text-purple-600">View and manage all party bookings</p>
            </div>
          </div>
          <a
            href="https://www.busybeesipc.com/admin/parties"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>Open Dashboard</span>
            <span>↗</span>
          </a>
        </div>
      </Card>

      {/* Quick Access: Admin Events Dashboard */}
      <Card className="p-4 mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h3 className="font-semibold text-amber-900">Events Management</h3>
              <p className="text-sm text-amber-600">Create and manage special events</p>
            </div>
          </div>
          <a
            href="https://www.busybeesipc.com/admin/events"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>Open Dashboard</span>
            <span>↗</span>
          </a>
        </div>
      </Card>

      {/* Quick Access: Events Dashboard */}
      <Card className="p-4 mt-4 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎪</span>
            <div>
              <h3 className="font-semibold text-emerald-900">Events Dashboard</h3>
              <p className="text-sm text-emerald-600">View event attendees, registrations, and manage bookings</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('events')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Open Events
          </button>
        </div>
      </Card>

      {/* Quick Access: After Dark Dashboard */}
      <Card className="p-4 mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌙</span>
            <div>
              <h3 className="font-semibold text-indigo-900">After Dark Management</h3>
              <p className="text-sm text-indigo-600">Attendees, movies, waivers, and refunds</p>
            </div>
          </div>
          <a
            href="https://www.busybeesipc.com/admin/after-dark"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>Open Dashboard</span>
            <span>↗</span>
          </a>
        </div>
      </Card>

      {/* Quick Access: Reports Dashboard */}
      <Card className="p-4 mt-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="font-semibold text-teal-900">Reports Dashboard</h3>
              <p className="text-sm text-teal-600">Revenue, customers, and business analytics</p>
            </div>
          </div>
          <a
            href="https://www.busybeesipc.com/admin/reports"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>Open Dashboard</span>
            <span>↗</span>
          </a>
        </div>
      </Card>
    </div>
  );
}
