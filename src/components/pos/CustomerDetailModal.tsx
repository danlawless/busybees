'use client';

/**
 * Customer Detail Modal
 * Admin view for managing individual customer accounts
 * Includes: profile info, children, purchases, passes, payment methods
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import { WaiverModal } from '@/components/ui/WaiverModal';
import { logger } from '@/lib/client-logger';

interface Child {
  id: string;
  name: string;
  birthdate: string;
  age: number;
  waiverSigned: boolean;
  waiverSignedDate?: string;
  createdAt: string;
}

interface Purchase {
  id: string;
  type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate?: string;
  firstUseDate?: string;
  actualExpiryDate?: string;
  usedSessions: number;
  totalSessions: number;
  status: 'active' | 'expired' | 'used';
  autoRenew?: boolean;
  nextRenewalDate?: string;
  childId?: string;
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

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  children: Child[];
  purchases: Purchase[];
  activeSessions: Session[];
  savedCards: SavedCard[];
  createdAt: string;
  lastVisit?: string;
  giftCardBalance?: number;
}

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
}

type TabType = 'profile' | 'children' | 'passes' | 'purchases' | 'payments';

export function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Child form state
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childFormData, setChildFormData] = useState({ name: '', birthdate: '' });
  const [savingChild, setSavingChild] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);

  // Payment method state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Waiver modal state
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverChildName, setWaiverChildName] = useState<string | undefined>(undefined);

  // Customer edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', email: '', phone: '' });

  // Reset state when modal opens/closes or customer changes
  useEffect(() => {
    if (isOpen && customer) {
      setActiveTab('profile');
      setError(null);
      setSuccessMessage(null);
      setShowChildForm(false);
      setEditingChild(null);
      setEditingProfile(false);
      setProfileFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset on customer ID change, not every prop update
  }, [isOpen, customer?.id]);

  if (!isOpen || !customer) return null;

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
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateAge = (birthdate: string): number => {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getCardBrandColor = (brand: string): string => {
    switch (brand.toLowerCase()) {
      case 'visa': return 'bg-blue-100 text-blue-800';
      case 'mastercard': return 'bg-red-100 text-red-800';
      case 'amex': return 'bg-green-100 text-green-800';
      case 'discover': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Profile update handler
  const handleUpdateProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileFormData.name,
          email: profileFormData.email || null,
          phone: profileFormData.phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update customer');
      }

      const updatedCustomer = {
        ...customer,
        name: profileFormData.name,
        email: profileFormData.email || undefined,
        phone: profileFormData.phone,
      };

      onCustomerUpdated(updatedCustomer);
      setEditingProfile(false);
      showSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      logger.error({ error: err }, 'Failed to update customer profile');
    } finally {
      setLoading(false);
    }
  };

  // Child handlers
  const handleSaveChild = async () => {
    if (!childFormData.name || !childFormData.birthdate) {
      setError('Please fill in all fields');
      return;
    }

    setSavingChild(true);
    setError(null);

    try {
      const url = editingChild
        ? `/api/admin/customers/${customer.id}/children/${editingChild.id}`
        : `/api/admin/customers/${customer.id}/children`;

      const response = await fetch(url, {
        method: editingChild ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: childFormData.name,
          birthdate: childFormData.birthdate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save child');
      }

      const data = await response.json();

      let updatedChildren: Child[];
      if (editingChild) {
        updatedChildren = customer.children.map(c =>
          c.id === editingChild.id
            ? { ...c, name: childFormData.name, birthdate: childFormData.birthdate, age: calculateAge(childFormData.birthdate) }
            : c
        );
      } else {
        const newChild: Child = {
          id: data.child?.id || crypto.randomUUID(),
          name: childFormData.name,
          birthdate: childFormData.birthdate,
          age: calculateAge(childFormData.birthdate),
          waiverSigned: false,
          createdAt: new Date().toISOString(),
        };
        updatedChildren = [...customer.children, newChild];
      }

      onCustomerUpdated({ ...customer, children: updatedChildren });
      setShowChildForm(false);
      setEditingChild(null);
      setChildFormData({ name: '', birthdate: '' });
      showSuccess(editingChild ? 'Child updated successfully' : 'Child added successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save child');
      logger.error({ error: err }, 'Failed to save child');
    } finally {
      setSavingChild(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (deletingChildId !== childId) {
      setDeletingChildId(childId);
      setTimeout(() => setDeletingChildId(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/children/${childId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete child');
      }

      const updatedChildren = customer.children.filter(c => c.id !== childId);
      onCustomerUpdated({ ...customer, children: updatedChildren });
      setDeletingChildId(null);
      showSuccess('Child removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete child');
      logger.error({ error: err }, 'Failed to delete child');
    } finally {
      setLoading(false);
    }
  };

  const handleSignWaiver = async (childId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/children/${childId}/waiver`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sign waiver');
      }

      const updatedChildren = customer.children.map(c =>
        c.id === childId
          ? { ...c, waiverSigned: true, waiverSignedDate: new Date().toISOString() }
          : c
      );
      onCustomerUpdated({ ...customer, children: updatedChildren });
      showSuccess('Waiver signed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign waiver');
      logger.error({ error: err }, 'Failed to sign waiver');
    } finally {
      setLoading(false);
    }
  };

  // Payment method handlers
  const handleDeleteCard = async (cardId: string) => {
    if (deletingCardId !== cardId) {
      setDeletingCardId(cardId);
      setTimeout(() => setDeletingCardId(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/payment-methods/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete card');
      }

      const updatedCards = customer.savedCards.filter(c => c.id !== cardId);
      onCustomerUpdated({ ...customer, savedCards: updatedCards });
      setDeletingCardId(null);
      showSuccess('Card removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
      logger.error({ error: err }, 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultCard = async (cardId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/payment-methods/${cardId}/default`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default card');
      }

      const updatedCards = customer.savedCards.map(c => ({
        ...c,
        isDefault: c.id === cardId,
      }));
      onCustomerUpdated({ ...customer, savedCards: updatedCards });
      showSuccess('Default card updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default card');
      logger.error({ error: err }, 'Failed to set default payment method');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPaymentModal(false);
    // Refresh customer data to get new payment methods
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.customer) {
          onCustomerUpdated(data.customer);
        }
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to refresh customer data');
    }
    showSuccess('Payment method added successfully');
  };

  // Pass/purchase helpers
  const getPassTypeLabel = (type: string): string => {
    switch (type) {
      case 'day_pass': return 'Day Pass';
      case 'weekly_pass': return 'Weekly Pass';
      case 'monthly_pass': return 'Monthly Pass';
      case 'party_package': return 'Party Package';
      case 'food_beverage': return 'Food & Beverage';
      default: return type;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activePasses = customer.purchases.filter(p => p.status === 'active' && p.type.includes('pass'));
  const totalSpent = customer.purchases.reduce((sum, p) => sum + p.price, 0);

  const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'children', label: 'Children', icon: '👶', count: customer.children.length },
    { id: 'passes', label: 'Passes', icon: '🎟️', count: activePasses.length },
    { id: 'purchases', label: 'Purchases', icon: '🧾', count: customer.purchases.length },
    { id: 'payments', label: 'Payment', icon: '💳', count: customer.savedCards.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
              <p className="text-gray-600">{formatPhoneNumber(customer.phone)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6 -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-4 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Customer Information</h3>
                    {!editingProfile ? (
                      <Button
                        onClick={() => setEditingProfile(true)}
                        variant="outline"
                        size="sm"
                      >
                        ✏️ Edit
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            setEditingProfile(false);
                            setProfileFormData({
                              name: customer.name,
                              email: customer.email || '',
                              phone: customer.phone,
                            });
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdateProfile}
                          size="sm"
                          disabled={loading}
                        >
                          {loading ? '⏳' : '💾'} Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={profileFormData.name}
                          onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={profileFormData.email}
                          onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={profileFormData.phone}
                          onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{formatPhoneNumber(customer.phone)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{customer.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Member Since</p>
                        <p className="font-medium">{formatDate(customer.createdAt)}</p>
                      </div>
                      {customer.lastVisit && (
                        <div>
                          <p className="text-sm text-gray-500">Last Visit</p>
                          <p className="font-medium">{formatDateTime(customer.lastVisit)}</p>
                        </div>
                      )}
                      {customer.giftCardBalance !== undefined && customer.giftCardBalance > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Gift Card Balance</p>
                          <p className="font-medium text-green-600">{formatCurrency(customer.giftCardBalance)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-500">Total Purchases</p>
                    <p className="text-2xl font-bold">{customer.purchases.length}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-500">Active Sessions</p>
                    <p className="text-2xl font-bold text-yellow-600">{customer.activeSessions.length}</p>
                  </Card>
                </div>
              </div>
            )}

            {/* Children Tab */}
            {activeTab === 'children' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Registered Children</h3>
                  <Button
                    onClick={() => {
                      setShowChildForm(true);
                      setEditingChild(null);
                      setChildFormData({ name: '', birthdate: '' });
                    }}
                    size="sm"
                  >
                    ➕ Add Child
                  </Button>
                </div>

                {showChildForm && (
                  <Card className="p-4 bg-yellow-50 border-yellow-200">
                    <h4 className="font-semibold mb-3">{editingChild ? 'Edit Child' : 'Add New Child'}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={childFormData.name}
                          onChange={(e) => setChildFormData({ ...childFormData, name: e.target.value })}
                          placeholder="Child's name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                        <input
                          type="date"
                          value={childFormData.birthdate}
                          onChange={(e) => setChildFormData({ ...childFormData, birthdate: e.target.value })}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                    {childFormData.birthdate && (
                      <p className="text-sm text-gray-600 mb-4">
                        Age: {calculateAge(childFormData.birthdate)} years old
                      </p>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setShowChildForm(false);
                          setEditingChild(null);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveChild}
                        size="sm"
                        disabled={savingChild}
                      >
                        {savingChild ? '⏳ Saving...' : editingChild ? '💾 Update' : '➕ Add'}
                      </Button>
                    </div>
                  </Card>
                )}

                {customer.children.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No children registered yet</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {customer.children.map(child => {
                      const childPasses = customer.purchases.filter(
                        p => p.childId === child.id && p.status === 'active' && p.type.includes('pass')
                      );
                      return (
                        <Card key={child.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-semibold">{child.name}</h4>
                                <span className="text-sm text-gray-500">Age {child.age}</span>
                                {child.waiverSigned ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                    ✓ Waiver Signed
                                  </span>
                                ) : (
                                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs">
                                    Waiver Required
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Born: {formatDate(child.birthdate)}
                              </p>
                              {childPasses.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {childPasses.map(pass => (
                                    <span key={pass.id} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                      {pass.name} ({pass.usedSessions}/{pass.totalSessions} sessions)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => {
                                  setWaiverChildName(child.name);
                                  setShowWaiverModal(true);
                                }}
                                size="sm"
                                variant="outline"
                                title="View waiver document"
                              >
                                📄 View Waiver
                              </Button>
                              {!child.waiverSigned && (
                                <Button
                                  onClick={() => handleSignWaiver(child.id)}
                                  size="sm"
                                  variant="outline"
                                  disabled={loading}
                                >
                                  ✍️ Sign Waiver
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  setEditingChild(child);
                                  setChildFormData({
                                    name: child.name,
                                    birthdate: child.birthdate,
                                  });
                                  setShowChildForm(true);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                ✏️
                              </Button>
                              <Button
                                onClick={() => handleDeleteChild(child.id)}
                                size="sm"
                                variant="outline"
                                className={deletingChildId === child.id ? 'bg-red-100 text-red-700 border-red-300' : ''}
                              >
                                {deletingChildId === child.id ? '✓ Confirm' : '🗑️'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Passes Tab */}
            {activeTab === 'passes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Passes & Sessions</h3>

                {activePasses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No active passes</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {activePasses.map(pass => {
                      const sessionsRemaining = pass.totalSessions - pass.usedSessions;
                      const child = customer.children.find(c => c.id === pass.childId);
                      return (
                        <Card key={pass.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-semibold">{pass.name}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(pass.status)}`}>
                                  {pass.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {getPassTypeLabel(pass.type)}
                                {child && ` • For: ${child.name}`}
                              </p>

                              {/* Session Progress */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">Sessions</span>
                                  <span className="font-medium">
                                    {pass.usedSessions} / {pass.totalSessions} used
                                    {sessionsRemaining > 0 && (
                                      <span className="text-green-600 ml-2">
                                        ({sessionsRemaining} remaining)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(pass.usedSessions / pass.totalSessions) * 100}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-500">
                                <p>Purchased: {formatDate(pass.purchaseDate)}</p>
                                {pass.firstUseDate && <p>First used: {formatDate(pass.firstUseDate)}</p>}
                                {pass.actualExpiryDate && (
                                  <p>Expires: {formatDate(pass.actualExpiryDate)}</p>
                                )}
                                {pass.autoRenew && pass.nextRenewalDate && (
                                  <p className="text-blue-600">🔄 Auto-renews: {formatDate(pass.nextRenewalDate)}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(pass.price)}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Active Sessions */}
                {customer.activeSessions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Currently Active Sessions</h3>
                    <div className="space-y-2">
                      {customer.activeSessions.map(session => {
                        const purchase = customer.purchases.find(p => p.id === session.purchaseId);
                        return (
                          <Card key={session.id} className="p-3 bg-green-50 border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {purchase?.name || 'Session'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Started: {formatDateTime(session.startTime)}
                                </p>
                              </div>
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                                🎮 Playing
                              </span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Purchase History</h3>
                  <p className="text-sm text-gray-500">
                    Total: {formatCurrency(totalSpent)}
                  </p>
                </div>

                {customer.purchases.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No purchases yet</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {customer.purchases
                      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                      .map(purchase => {
                        const child = customer.children.find(c => c.id === purchase.childId);
                        return (
                          <Card key={purchase.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className="font-semibold">{purchase.name}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(purchase.status)}`}>
                                    {purchase.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {getPassTypeLabel(purchase.type)}
                                  {child && ` • ${child.name}`}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Purchased: {formatDateTime(purchase.purchaseDate)}
                                </p>
                                {purchase.type.includes('pass') && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Sessions: {purchase.usedSessions}/{purchase.totalSessions}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{formatCurrency(purchase.price)}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Payment Methods</h3>
                  <Button
                    onClick={() => setShowAddPaymentModal(true)}
                    size="sm"
                  >
                    ➕ Add Card
                  </Button>
                </div>

                {customer.savedCards.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No payment methods saved</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {customer.savedCards.map(card => (
                      <Card key={card.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded ${getCardBrandColor(card.brand)}`}>
                              {card.brand}
                            </div>
                            <div>
                              <p className="font-medium">•••• •••• •••• {card.last4}</p>
                              <p className="text-sm text-gray-500">
                                Expires {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                              </p>
                            </div>
                            {card.isDefault && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {!card.isDefault && (
                              <Button
                                onClick={() => handleSetDefaultCard(card.id)}
                                size="sm"
                                variant="outline"
                                disabled={loading}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              onClick={() => handleDeleteCard(card.id)}
                              size="sm"
                              variant="outline"
                              className={deletingCardId === card.id ? 'bg-red-100 text-red-700 border-red-300' : ''}
                            >
                              {deletingCardId === card.id ? '✓ Confirm' : '🗑️'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Gift Card Balance */}
                {customer.giftCardBalance !== undefined && customer.giftCardBalance > 0 && (
                  <Card className="p-4 bg-green-50 border-green-200 mt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Gift Card Balance</h4>
                        <p className="text-sm text-gray-600">Available account credit</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(customer.giftCardBalance)}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={handlePaymentMethodAdded}
      />

      {/* Waiver Modal */}
      <WaiverModal
        isOpen={showWaiverModal}
        onClose={() => {
          setShowWaiverModal(false);
          setWaiverChildName(undefined);
        }}
        childName={waiverChildName}
      />
    </>
  );
}
