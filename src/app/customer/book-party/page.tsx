/**
 * Party Booking Page
 * Book birthday parties and events
 */

'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PartyPackage {
  id: string;
  name: string;
  base_price: number;
  capacity: number;
  duration: number;
  description: string;
  included_items: string[];
  is_active: boolean;
}

function BookPartyContent() {
  const { user, profile } = useUser();
  const [packages, setPackages] = useState<PartyPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PartyPackage | null>(null);
  const [partyDate, setPartyDate] = useState('');
  const [partyTime, setPartyTime] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/parties');
      const data = await response.json();
      setPackages(data.parties || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedPackage) return;

    setIsBooking(true);
    setError('');

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedPackage.id,
          productName: selectedPackage.name,
          productPrice: selectedPackage.base_price,
          productDescription: selectedPackage.description,
          purchaseType: 'party_package',
          quantity: 1,
          metadata: {
            party_date: partyDate,
            party_time: partyTime,
            party_guests: guestCount,
            party_notes: notes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Booking error:', err);
      setError('Failed to process booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Party 🎉</h1>
          <p className="text-gray-600">Choose a package and schedule your celebration</p>
        </div>

        {!selectedPackage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-purple-600 mb-4">
                  ${pkg.base_price.toFixed(2)}
                </p>

                <div className="space-y-2 mb-6 text-sm text-gray-600">
                  <p>👥 Up to {pkg.capacity} guests</p>
                  <p>⏱️ {pkg.duration} hours</p>
                  <p className="text-gray-900 font-medium mt-4">Includes:</p>
                  <ul className="space-y-1">
                    {pkg.included_items.map((item, idx) => (
                      <li key={idx}>✓ {item}</li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full"
                >
                  Select Package
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{selectedPackage.name}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPackage(null)}
                >
                  Change Package
                </Button>
              </div>
              <p className="text-lg text-purple-600 font-bold">${selectedPackage.base_price.toFixed(2)}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Party Date *
                </label>
                <input
                  type="date"
                  value={partyDate}
                  onChange={(e) => setPartyDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Party Time *
                </label>
                <input
                  type="time"
                  value={partyTime}
                  onChange={(e) => setPartyTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  max={selectedPackage.capacity}
                  min="1"
                  placeholder={`Max ${selectedPackage.capacity} guests`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests or Theme
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Let us know about party themes, dietary restrictions, or special requests"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleBook}
                disabled={!partyDate || !partyTime || !guestCount || isBooking}
                className="w-full"
                size="lg"
              >
                {isBooking ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </Card>
        )}

        {packages.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <span className="text-6xl mb-4 block">🎈</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Party Packages Available
            </h3>
            <p className="text-gray-600">
              Check back soon for party booking options!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BookPartyPage() {
  return (
    <AuthGuard requireRole="customer">
      <BookPartyContent />
    </AuthGuard>
  );
}

