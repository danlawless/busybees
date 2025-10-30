'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PromoSpecial, getPromoStatus, getActivePromo, formatPromoDate, formatPromoDateRange, validatePromoCode, validatePromoDates } from '@/lib/utils/promoHelpers';
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
  status: 'active' | 'expired' | 'used';
  autoRenew?: boolean;
  nextRenewalDate?: string;
  childId?: string; // ID of the child this pass is for (required for passes, optional for party packages)
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
}

type AdminView = 'dashboard' | 'customers' | 'sales' | 'sessions' | 'marketing' | 'passes' | 'parties' | 'products';

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
}: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null);
  const [refundTimeout, setRefundTimeout] = useState<NodeJS.Timeout | null>(null);

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
  });
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});

  // Volume discount states
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<VolumeDiscount | null>(null);
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

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
  const totalRevenue = customers.reduce((sum, customer) =>
    sum + customer.purchases.reduce((purchaseSum, purchase) => purchaseSum + purchase.price, 0), 0
  );

  const todaysPurchases = customers.flatMap(c => c.purchases).filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    const today = new Date();
    return purchaseDate.toDateString() === today.toDateString();
  });

  const todaysRevenue = todaysPurchases.reduce((sum, purchase) => sum + purchase.price, 0);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleForceCheckout = (customerId: string) => {
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          activeSessions: []
        };
      }
      return customer;
    });
    onUpdateCustomers(updatedCustomers);
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

  const handleConfirmRefund = (customerId: string, purchaseId: string) => {
    // Clear confirmation state and timeout
    setConfirmingRefund(null);
    if (refundTimeout) {
      clearTimeout(refundTimeout);
      setRefundTimeout(null);
    }

    // Process the refund
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
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
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

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions ({activeSessions.length})</h3>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((customer) => (
              <div key={customer.id} className="space-y-2">
                <div className="font-medium">{customer.name} ({formatPhoneNumber(customer.phone)})</div>
                {(customer.activeSessions || []).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg ml-4">
                    <div>
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
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No active sessions</p>
        )}
      </Card>

      {/* Recent Purchases */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Purchases ({todaysPurchases.length})</h3>
        {todaysPurchases.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todaysPurchases.map((purchase) => {
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
                    <p className="font-semibold">{formatCurrency(purchase.price)}</p>
                    <Button
                      onClick={() => {
                        if (confirmingRefund === purchase.id && customer) {
                          handleConfirmRefund(customer.id, purchase.id);
                        } else {
                          handleRefundClick(purchase.id);
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className={`mt-1 transition-colors ${
                        confirmingRefund === purchase.id
                          ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 animate-pulse'
                          : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                      }`}
                    >
                      {confirmingRefund === purchase.id ? '✓ Confirm Refund' : 'Refund'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No purchases today</p>
        )}
      </Card>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
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
        </div>
      </Card>

      {/* Customer List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Customers ({filteredCustomers.length})
        </h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="p-4 border border-gray-200 rounded-lg">
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
                    Total spent: {formatCurrency(customer.purchases.reduce((sum, p) => sum + p.price, 0))}
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
                              {purchase.name}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {(customer.activeSessions || []).length > 0 && (
                    <Button
                      onClick={() => handleForceCheckout(customer.id)}
                      size="sm"
                      variant="outline"
                    >
                      Force Checkout All
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Total Sales</h4>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(todaysRevenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{todaysPurchases.length} transactions</p>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold text-gray-900">Average Transaction</h4>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(todaysPurchases.length > 0 ? todaysRevenue / todaysPurchases.length : 0)}
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
          {['day_pass', 'monthly_pass', 'party_package', 'food_beverage'].map(type => {
            const purchases = todaysPurchases.filter(p => p.type === type);
            const revenue = purchases.reduce((sum, p) => sum + p.price, 0);
            return (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium capitalize">{type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600">{purchases.length} sold</p>
                </div>
                <p className="font-semibold">{formatCurrency(revenue)}</p>
              </div>
            );
          })}
        </div>
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

  const handleSavePromo = () => {
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

    // Save promo
    if (editingPromo) {
      // Update existing promo
      const updatedPromo: PromoSpecial = {
        ...editingPromo,
        name: promoFormData.name.trim(),
        startDate: promoFormData.startDate,
        endDate: promoFormData.endDate,
        discountPercent: Number(promoFormData.discountPercent),
        description: promoFormData.description.trim(),
        stripeCouponCode: promoFormData.stripeCouponCode.toUpperCase(),
        bannerStyle: promoFormData.bannerStyle as any,
        isActive: promoFormData.isActive,
        updatedAt: new Date().toISOString(),
      };
      onUpdatePromos(promos.map(p => p.id === editingPromo.id ? updatedPromo : p));
    } else {
      // Create new promo
      const newPromo: PromoSpecial = {
        id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: promoFormData.name.trim(),
        startDate: promoFormData.startDate,
        endDate: promoFormData.endDate,
        discountPercent: Number(promoFormData.discountPercent),
        description: promoFormData.description.trim(),
        stripeCouponCode: promoFormData.stripeCouponCode.toUpperCase(),
        bannerStyle: promoFormData.bannerStyle as any,
        isActive: promoFormData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdatePromos([...promos, newPromo]);
    }

    setShowPromoForm(false);
    setEditingPromo(null);
  };

  const handleDeletePromo = (id: string) => {
    if (confirmingDelete === id) {
      onUpdatePromos(promos.filter(p => p.id !== id));
      setConfirmingDelete(null);
    } else {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 5000);
    }
  };

  const handleTogglePromo = (id: string) => {
    onUpdatePromos(promos.map(p =>
      p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p
    ));
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
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
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

                {/* Stripe Purchase Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Purchase Link (optional)
                  </label>
                  <input
                    type="url"
                    value={partyFormData.stripePurchaseLink}
                    onChange={(e) => setPartyFormData({ ...partyFormData, stripePurchaseLink: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {partyFormErrors.stripePurchaseLink && (
                    <p className="text-red-600 text-sm mt-1">{partyFormErrors.stripePurchaseLink}</p>
                  )}
                </div>

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
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveParty}
                  className="flex-1"
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
      allergens: [...product.allergens],
      stripePurchaseLink: product.stripePurchaseLink,
      isActive: product.isActive,
      available: product.available,
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

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <Button onClick={handleCreateProduct} size="sm">
            ➕ Create New Product
          </Button>
        </div>

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
                        {!product.available && (
                          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      {product.allergens.length > 0 && (
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

                {/* Stripe Purchase Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Purchase Link (optional)
                  </label>
                  <input
                    type="url"
                    value={productFormData.stripePurchaseLink}
                    onChange={(e) => setProductFormData({ ...productFormData, stripePurchaseLink: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {productFormErrors.stripePurchaseLink && (
                    <p className="text-red-600 text-sm mt-1">{productFormErrors.stripePurchaseLink}</p>
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

                {/* Stripe Purchase Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Purchase Link (optional)
                  </label>
                  <input
                    type="url"
                    value={passFormData.stripePurchaseLink}
                    onChange={(e) => setPassFormData({ ...passFormData, stripePurchaseLink: e.target.value })}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  {passFormErrors.stripePurchaseLink && (
                    <p className="text-red-600 text-sm mt-1">{passFormErrors.stripePurchaseLink}</p>
                  )}
                </div>

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

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <Card className="p-4">
        <nav className="flex flex-wrap gap-2">
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
          <Button
            onClick={() => setCurrentView('sales')}
            variant={currentView === 'sales' ? 'default' : 'outline'}
            size="sm"
          >
            💰 Sales
          </Button>
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
        </nav>
      </Card>

      {/* Content */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'customers' && renderCustomers()}
      {currentView === 'sales' && renderSales()}
      {currentView === 'sessions' && renderDashboard()} {/* Reuse dashboard for now */}
      {currentView === 'marketing' && renderMarketing()}
      {currentView === 'passes' && renderPasses()}
      {currentView === 'parties' && renderParties()}
      {currentView === 'products' && renderProducts()}
    </div>
  );
}
