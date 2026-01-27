/**
 * Customer Parties Portal
 * Web accessible portal for purchasing party packages
 * Mirrors the My Account parties tab functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { PartySchedulingModal } from '@/components/pos/PartySchedulingModal';
import { parseDateString } from '@/lib/utils';

interface PartyPackage {
  id: string;
  name: string;
  base_price: number;
  capacity: number;
  duration: number;
  description: string;
  included_items: string[];
  stripe_purchase_link?: string;
  is_active: boolean;
}

interface PartyPurchase {
  id: string;
  name: string;
  price: number;
  purchase_date: string;
  status: 'active' | 'used' | 'expired';
  party_date?: string;
  party_start_time?: string;
  party_end_time?: string;
  party_guests?: number;
  party_notes?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(dateString: string): string {
  // Use parseDateString to avoid UTC timezone bug
  // new Date("2025-02-14") parses as UTC midnight, shifting the date back
  // one day for users west of UTC
  return parseDateString(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

interface SavedCard {
  id: string;
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  is_default: boolean;
}

function PartiesContent() {
  const { user, profile } = useUser();
  const [packages, setPackages] = useState<PartyPackage[]>([]);
  const [partyPurchases, setPartyPurchases] = useState<PartyPurchase[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [processingProduct, setProcessingProduct] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scheduling modal state
  const [showPartyScheduling, setShowPartyScheduling] = useState(false);
  const [schedulingParty, setSchedulingParty] = useState<PartyPurchase | null>(null);

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [packagesRes, purchasesRes, cardsRes] = await Promise.all([
          fetch('/api/parties'),
          fetch('/api/purchases?type=party_package'),
          fetch('/api/stripe/payment-methods')
        ]);

        if (packagesRes.ok) {
          const { parties } = await packagesRes.json();
          setPackages(parties || []);
        }

        if (purchasesRes.ok) {
          const { purchases } = await purchasesRes.json();
          setPartyPurchases(purchases || []);
        }

        if (cardsRes.ok) {
          const { paymentMethods } = await cardsRes.json();
          setSavedCards(paymentMethods || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get default payment method for one-click purchase
  const getDefaultPaymentMethod = () => {
    const defaultCard = savedCards.find(c => c.is_default);
    return defaultCard || savedCards[0] || null;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeout) {
        clearTimeout(confirmTimeout);
      }
    };
  }, [confirmTimeout]);

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

    const product = packages.find(p => p.id === productId);
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }

    // Require saved payment method for one-click purchase
    const paymentMethod = getDefaultPaymentMethod();
    if (!paymentMethod) {
      setMessage({
        type: 'error',
        text: 'Please add a payment method first in the Payments tab.'
      });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (processingProduct) return;

    setProcessingProduct(productId);

    try {
      // Use direct payment API with saved card for one-click purchase
      const response = await fetch('/api/stripe/direct-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          productName: product.name,
          productPrice: product.base_price,
          productDescription: product.description,
          purchaseType: 'party_package',
          paymentMethodId: paymentMethod.stripe_payment_method_id,
          metadata: {
            capacity: product.capacity,
            duration: product.duration,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Handle 3DS authentication if required
      if (data.requiresAction && data.clientSecret) {
        setMessage({
          type: 'error',
          text: 'Your bank requires additional verification. Please try a different card.'
        });
        setTimeout(() => setMessage(null), 5000);
        setProcessingProduct(null);
        return;
      }

      // Purchase successful!
      if (data.success) {
        setMessage({
          type: 'success',
          text: `🎉 ${product.name} purchased! $${product.base_price.toFixed(2)} charged to card ending in ${paymentMethod.last4}.`
        });

        // Refresh purchases
        const purchasesRes = await fetch('/api/purchases?type=party_package');
        if (purchasesRes.ok) {
          const { purchases } = await purchasesRes.json();
          setPartyPurchases(purchases || []);
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to process payment'
      });
    } finally {
      setTimeout(() => setMessage(null), 5000);
      setProcessingProduct(null);
    }
  };

  const handleScheduleParty = (purchase: PartyPurchase) => {
    setSchedulingParty(purchase);
    setShowPartyScheduling(true);
  };

  // Separate active and past purchases (with defensive array check)
  const purchasesArray = Array.isArray(partyPurchases) ? partyPurchases : [];
  const activePartyPurchases = purchasesArray.filter(p => p.status === 'active');
  const pastPartyPurchases = purchasesArray.filter(p => p.status !== 'active');

  // Calculate membership info
  const memberSince = profile?.created_at
    ? parseDateString(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const lastVisit = profile?.updated_at
    ? parseDateString(profile.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Today';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 text-white py-6 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Welcome back, {profile?.name}! <span className="inline-block">🐝</span>
          </h1>
          <p className="text-yellow-100 text-sm">
            Member since {memberSince} • Last visit: {lastVisit}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5 flex gap-1">
          <Link href="/customer/children" className="flex-1">
            <button className="w-full py-3 px-4 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors flex items-center justify-center gap-2">
              <span>👶</span> Children
            </button>
          </Link>
          <Link href="/customer/passes" className="flex-1">
            <button className="w-full py-3 px-4 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors flex items-center justify-center gap-2">
              <span>🎟️</span> Passes
            </button>
          </Link>
          <button className="flex-1 py-3 px-4 rounded-lg bg-purple-500 text-white font-medium transition-colors flex items-center justify-center gap-2">
            <span>🎉</span> Parties ({activePartyPurchases.length})
          </button>
          <Link href="/customer/payments" className="flex-1">
            <button className="w-full py-3 px-4 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors flex items-center justify-center gap-2">
              <span>💳</span> Payments
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

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
                      {/* Party scheduling info */}
                      {!purchase.party_date && (
                        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg text-center text-sm">
                          <button
                            onClick={() => handleScheduleParty(purchase)}
                            className="hover:underline"
                          >
                            Click to schedule your party date
                          </button>
                        </div>
                      )}

                      {/* Party Scheduling Information */}
                      {purchase.party_date && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600">🎉</span>
                              <span className="font-medium text-purple-800">Party Scheduled</span>
                            </div>
                            <button
                              onClick={() => handleScheduleParty(purchase)}
                              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-md transition-colors"
                            >
                              Reschedule
                            </button>
                          </div>
                          <div className="text-sm text-purple-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-500">📅</span>
                              <span>{formatDate(purchase.party_date)}</span>
                            </div>
                            {purchase.party_start_time && purchase.party_end_time && (
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
                                    return `${formatTime(purchase.party_start_time!)} - ${formatTime(purchase.party_end_time!)}`;
                                  })()}
                                </span>
                              </div>
                            )}
                            {purchase.party_guests && (
                              <div className="flex items-center gap-2">
                                <span className="text-purple-500">👥</span>
                                <span>{purchase.party_guests} guests</span>
                              </div>
                            )}
                            {purchase.party_notes && (
                              <div className="flex items-center gap-2">
                                <span className="text-purple-500">🎨</span>
                                <span>{purchase.party_notes}</span>
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

          {/* Purchase New Party Packages */}
          <div>
            <h3 className="text-xl font-semibold mb-4">🛒 Purchase Party Packages</h3>

            <Card className="p-6 border-l-8 border-l-purple-300 bg-purple-50">
              <div className="grid gap-4 text-left">
                {packages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">🎉 No party packages available</p>
                    <p className="text-sm">Please check back later or contact staff.</p>
                  </div>
                ) : (
                  packages.map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 text-lg">
                          🎉 {product.name}
                        </span>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(product.base_price)}</p>
                        {product.stripe_purchase_link && (
                          <p className="text-xs text-blue-600 mt-1">💳 Stripe payment available</p>
                        )}
                      </div>
                      <Button
                        onClick={() => {
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
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {processingProduct === product.id
                          ? 'Processing...'
                          : confirmingProduct === product.id
                          ? '✓ Confirm Purchase'
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
                          Purchased {formatDate(purchase.purchase_date)}
                        </p>
                        {purchase.party_date && (
                          <p className="text-sm text-purple-600">
                            Party Date: {formatDate(purchase.party_date)}
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
      </div>

      {/* Party Scheduling Modal */}
      {showPartyScheduling && schedulingParty && (
        <PartySchedulingModal
          isOpen={showPartyScheduling}
          onClose={() => {
            setShowPartyScheduling(false);
            setSchedulingParty(null);
          }}
          partyPackageName={schedulingParty.name}
          customerName={profile?.name || 'Customer'}
          purchasePrice={schedulingParty.price}
          existingPartyData={{
            partyDate: schedulingParty.party_date,
            partyStartTime: schedulingParty.party_start_time,
            partyEndTime: schedulingParty.party_end_time,
            partyGuests: schedulingParty.party_guests,
            partyNotes: schedulingParty.party_notes,
          }}
          onSchedule={async (partyData) => {
            // Update the party scheduling via API
            const response = await fetch(`/api/purchases/${schedulingParty.id}`, {
              method: 'PATCH',
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
              setMessage({ type: 'error', text: errorMessage });
              setTimeout(() => setMessage(null), 5000);
              throw new Error(errorMessage);
            }

            // Refresh party purchases
            const purchasesRes = await fetch('/api/purchases?type=party_package');
            if (purchasesRes.ok) {
              const { purchases } = await purchasesRes.json();
              setPartyPurchases(purchases || []);
            }

            setShowPartyScheduling(false);
            setSchedulingParty(null);
            setMessage({ type: 'success', text: 'Party scheduled successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}

export default function PartiesPage() {
  return (
    <AuthGuard requireRole={['customer', 'admin']}>
      <PartiesContent />
    </AuthGuard>
  );
}
