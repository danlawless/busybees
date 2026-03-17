'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Child {
  id: string;
  name: string;
  birthdate: string;
  age: number;
  waiverSigned: boolean;
}

interface Availability {
  date: string;
  maxKids: number;
  booked: number;
  remaining: number;
  isFull: boolean;
}

interface AfterDarkBookingProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  children: Child[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function AfterDarkBooking({ customerName, customerEmail, customerPhone, children }: AfterDarkBookingProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Array<{ id: string; event_date: string; num_kids: number; kid_details: string | null; status: string }>>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const eligibleChildren = children.filter(c => c.age >= 3 && c.age <= 6);

  useEffect(() => {
    // Fetch availability
    fetch('/api/after-dark/availability')
      .then(res => res.json())
      .then(data => {
        setAvailability(data.availability || []);
        const firstAvailable = (data.availability || []).find((a: Availability) => !a.isFull);
        if (firstAvailable) setSelectedDate(firstAvailable.date);
      })
      .catch(() => {});

    // Fetch existing bookings for this customer
    fetch('/api/after-dark/my-bookings')
      .then(res => res.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, []);

  const selectedAvailability = availability.find(a => a.date === selectedDate);

  const toggleChild = (childId: string) => {
    setSelectedChildren(prev => {
      const next = prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId];
      // Don't exceed remaining spots
      if (next.length > (selectedAvailability?.remaining || 0)) return prev;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedDate || selectedChildren.length === 0) return;
    setSubmitting(true);
    setError('');

    const kidDetails = selectedChildren
      .map(id => {
        const child = children.find(c => c.id === id);
        return child ? `${child.name} (${child.age})` : '';
      })
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch('/api/after-dark/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: selectedDate,
          parent_name: customerName,
          parent_email: customerEmail,
          parent_phone: customerPhone,
          num_kids: selectedChildren.length,
          kid_details: kidDetails,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setSelectedChildren([]);
        setNotes('');
        // Refresh availability and bookings
        const [avRes, bookRes] = await Promise.all([
          fetch('/api/after-dark/availability'),
          fetch('/api/after-dark/my-bookings'),
        ]);
        const avData = await avRes.json();
        const bookData = await bookRes.json();
        setAvailability(avData.availability || []);
        setBookings(bookData.bookings || []);
      } else {
        setError(data.error || 'Booking failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          🌙
        </div>
        <div>
          <h3 className="text-xl font-semibold">After Dark — Parents&apos; Night Out</h3>
          <p className="text-sm text-gray-500">Friday nights, 5:00 - 7:30 PM — Pizza, movie & supervised play</p>
        </div>
      </div>

      {/* Existing Bookings */}
      {!loadingBookings && bookings.length > 0 && (
        <Card className="p-5">
          <h4 className="font-semibold text-gray-800 mb-3">Your Upcoming Reservations</h4>
          <div className="space-y-2">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200"
              >
                <div>
                  <p className="font-medium text-purple-800">{formatDate(booking.event_date)}</p>
                  <p className="text-sm text-purple-600">
                    {booking.num_kids} kid{booking.num_kids > 1 ? 's' : ''}
                    {booking.kid_details && ` — ${booking.kid_details}`}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {booking.status === 'confirmed' ? 'Confirmed' : booking.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Booking Form */}
      {success ? (
        <Card className="p-8 text-center">
          <span className="text-5xl mb-4 block">🎉</span>
          <h4 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re All Set!</h4>
          <p className="text-gray-600 mb-6">
            Your spot has been reserved. We&apos;ll see your little ones on Friday!
          </p>
          <Button onClick={() => setSuccess(false)}>Book Another Date</Button>
        </Card>
      ) : (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Reserve a Spot</h4>

          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select a Friday</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availability.map(a => {
                const isSelected = selectedDate === a.date;
                return (
                  <button
                    key={a.date}
                    onClick={() => { if (!a.isFull) { setSelectedDate(a.date); setSelectedChildren([]); } }}
                    disabled={a.isFull}
                    className={`p-3 rounded-xl text-center transition-all border-2 ${
                      a.isFull
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                        : isSelected
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <p className={`text-sm font-bold ${a.isFull ? 'text-gray-400' : 'text-gray-800'}`}>
                      {formatDate(a.date)}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${
                      a.isFull ? 'text-red-500' : a.remaining <= 10 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {a.isFull ? 'FULL' : `${a.remaining} spots left`}
                    </p>
                    {/* Capacity bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(a.booked / a.maxKids) * 100}%`,
                          background: a.isFull ? '#ef4444' : a.remaining <= 10 ? '#f59e0b' : '#22c55e',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Availability indicator */}
          {selectedAvailability && (
            <div className="mb-6 p-3 rounded-xl bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                <span className={`font-bold ${selectedAvailability.remaining <= 10 ? 'text-amber-600' : 'text-green-600'}`}>
                  {selectedAvailability.remaining}
                </span>
                {' '}of {selectedAvailability.maxKids} spots remaining &bull;{' '}
                <span className="text-gray-500">{selectedAvailability.booked} kids signed up</span>
              </p>
            </div>
          )}

          {/* Child Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Children Attending
            </label>
            {eligibleChildren.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-sm text-amber-800">
                  No eligible children found (ages 3-6). Add your children in the Children tab first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eligibleChildren.map(child => {
                  const isSelected = selectedChildren.includes(child.id);
                  return (
                    <button
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isSelected ? '✓' : child.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{child.name}</p>
                          <p className="text-xs text-gray-500">Age {child.age}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedChildren.length > 0 && (
              <p className="mt-2 text-sm text-purple-600 font-medium">
                {selectedChildren.length} child{selectedChildren.length > 1 ? 'ren' : ''} selected
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, dietary restrictions, special needs..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              maxLength={500}
            />
          </div>

          {/* Pricing Info */}
          {selectedChildren.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">
                  {selectedChildren.length} kid{selectedChildren.length > 1 ? 's' : ''} &times; {selectedChildren.length >= 2 ? '$40' : '$45'}
                </span>
                <span className="text-lg font-bold text-purple-800">
                  ${selectedChildren.length >= 2 ? selectedChildren.length * 40 : 45}
                </span>
              </div>
              {selectedChildren.length >= 2 && (
                <p className="text-xs text-purple-600 mt-1">Multi-child discount applied!</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedDate || selectedChildren.length === 0}
            className="w-full py-4 text-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {submitting ? 'Booking...' : `Reserve ${selectedChildren.length} Spot${selectedChildren.length > 1 ? 's' : ''}`}
          </Button>
        </Card>
      )}
    </div>
  );
}
