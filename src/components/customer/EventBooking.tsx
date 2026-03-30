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

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface EventPass {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
}

interface BookableEvent {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  event_date: string;
  event_date_end: string | null;
  event_time_start: string;
  event_time_end: string | null;
  is_bookable: boolean;
  max_capacity: number | null;
  pass_ids: string[] | null;
  booking_instructions: string | null;
  toddler_price: number | null;
  infant_price: number | null;
}

interface EventDetail {
  event: BookableEvent;
  passes: EventPass[];
  availability: {
    booked: number;
    remaining: number | null;
    maxCapacity: number | null;
    isFull: boolean;
  };
}

interface ExistingBooking {
  id: string;
  event_id: string;
  event_date: string;
  event_title: string;
  num_children: number;
  child_details: Array<{ name: string; pass_name: string }> | null;
  total_amount: number | null;
  status: string;
}

interface EventBookingProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  children: Child[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function getAgeGroup(age: number): 'infant' | 'toddler' {
  return age < 2 ? 'infant' : 'toddler';
}

function matchPassToChild(passes: EventPass[], childAge: number): EventPass | null {
  const ageGroup = getAgeGroup(childAge);

  // Try to match by age keywords in pass name
  for (const pass of passes) {
    const lowerName = pass.name.toLowerCase();
    if (ageGroup === 'infant' && (lowerName.includes('infant') || lowerName.includes('under 2'))) {
      return pass;
    }
    if (ageGroup === 'toddler' && (lowerName.includes('child') || lowerName.includes('toddler') || lowerName.includes('2+'))) {
      return pass;
    }
  }

  // Fallback: return first pass
  return passes[0] || null;
}

type BookingStep = 'select' | 'payment' | 'success';

export function EventBooking({ customerName, customerEmail, customerPhone, children }: EventBookingProps) {
  const [step, setStep] = useState<BookingStep>('select');
  const [events, setEvents] = useState<BookableEvent[]>([]);
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventDetail | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [amountPaid, setAmountPaid] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Fetch bookable events, existing bookings, and saved cards on mount
  useEffect(() => {
    // Fetch published events and filter to bookable ones
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        const bookable = (Array.isArray(data) ? data : []).filter((e: BookableEvent) => e.is_bookable);
        setEvents(bookable);
        // Auto-select first event if only one
        if (bookable.length === 1) {
          fetchEventDetail(bookable[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));

    // Fetch existing event bookings
    fetch('/api/events/my-bookings')
      .then(res => res.json())
      .then(data => setExistingBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));

    // Fetch saved payment methods
    fetch('/api/stripe/payment-methods')
      .then(res => res.json())
      .then(data => {
        const cards = data.paymentMethods || [];
        setSavedCards(cards);
        const defaultCard = cards.find((c: SavedCard) => c.is_default) || cards[0];
        if (defaultCard) setSelectedCard(defaultCard.id);
      })
      .catch(() => {});
  }, []);

  const fetchEventDetail = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedEventDetail(data);
      }
    } catch {
      // ignore
    }
  };

  const toggleChild = (childId: string) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) return prev.filter(id => id !== childId);

      // Check capacity
      const remaining = selectedEventDetail?.availability.remaining;
      if (remaining !== null && remaining !== undefined && prev.length >= remaining) return prev;

      return [...prev, childId];
    });
  };

  // Calculate total price based on selected children and their matched passes or inline pricing
  const getChildPassAssignments = () => {
    if (!selectedEventDetail) return [];
    const event = selectedEventDetail.event;
    const hasInlinePricing = event.toddler_price != null || event.infant_price != null;
    const hasPasses = selectedEventDetail.passes.length > 0;

    return selectedChildren.map(childId => {
      const child = children.find(c => c.id === childId);
      if (!child) return null;

      if (hasPasses) {
        // Use linked passes
        const pass = matchPassToChild(selectedEventDetail.passes, child.age);
        return pass ? { child_id: childId, pass_id: pass.id, childName: child.name, childAge: child.age, passName: pass.name, price: pass.price } : null;
      } else if (hasInlinePricing) {
        // Use inline event pricing
        const ageGroup = getAgeGroup(child.age);
        const price = ageGroup === 'infant' ? (event.infant_price || 0) : (event.toddler_price || 0);
        const label = ageGroup === 'infant' ? 'Infant' : 'Child 2+';
        return { child_id: childId, pass_id: '', childName: child.name, childAge: child.age, passName: label, price };
      }
      return null;
    }).filter(Boolean) as Array<{ child_id: string; pass_id: string; childName: string; childAge: number; passName: string; price: number }>;
  };

  const assignments = getChildPassAssignments();
  const totalPrice = assignments.reduce((sum, a) => sum + a.price, 0);

  // Handle payment
  const handlePayment = async () => {
    if (!selectedCard || !selectedEventDetail || assignments.length === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${selectedEventDetail.event.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          children: assignments.map(a => ({ child_id: a.child_id, pass_id: a.pass_id })),
          paymentMethodId: selectedCard,
          useGiftCardBalance: true,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('success');
        setAmountPaid(data.amountPaid || totalPrice);
        setSelectedChildren([]);
        setNotes('');
        // Refresh bookings
        const bookRes = await fetch('/api/events/my-bookings');
        const bookData = await bookRes.json();
        setExistingBookings(bookData.bookings || []);
        // Refresh event detail for updated availability
        if (selectedEventDetail) {
          fetchEventDetail(selectedEventDetail.event.id);
        }
      } else {
        setError(data.error || 'Payment failed. Please try again.');
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
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          🎪
        </div>
        <div>
          <h3 className="text-xl font-semibold">Events</h3>
          <p className="text-sm text-gray-500">Book your spot at upcoming Busy Bees events</p>
        </div>
      </div>

      {/* Existing Bookings */}
      {!loadingBookings && existingBookings.length > 0 && (
        <Card className="p-5">
          <h4 className="font-semibold text-gray-800 mb-3">Your Event Reservations</h4>
          <div className="space-y-2">
            {existingBookings.map(booking => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200"
              >
                <div>
                  <p className="font-medium text-emerald-800">{booking.event_title}</p>
                  <p className="text-sm text-emerald-600">
                    {formatDate(booking.event_date)} &bull; {booking.num_children} kid{booking.num_children > 1 ? 's' : ''}
                    {booking.total_amount != null && ` — $${Number(booking.total_amount).toFixed(2)}`}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Confirmed
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step Progress */}
      {step !== 'select' && step !== 'success' && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span className={step === 'select' ? 'text-emerald-700 font-bold' : 'text-green-600'}>1. Select</span>
          <span>&rarr;</span>
          <span className={step === 'payment' ? 'text-emerald-700 font-bold' : step === 'success' ? 'text-green-600' : ''}>2. Payment</span>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <Card className="p-8 text-center">
          <span className="text-5xl mb-4 block">🎉</span>
          <h4 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re Registered!</h4>
          <p className="text-gray-600 mb-2">
            Your spot is confirmed. We can&apos;t wait to see you!
          </p>
          {amountPaid != null && (
            <p className="text-lg font-bold text-emerald-700 mb-4">
              Amount charged: ${amountPaid.toFixed(2)}
            </p>
          )}
          <Button onClick={() => { setAmountPaid(null); setStep('select'); }}>
            Book Another Event
          </Button>
        </Card>
      )}

      {/* Step: Payment */}
      {step === 'payment' && selectedEventDetail && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-800 mb-2">Complete Payment</h4>
          <p className="text-sm text-gray-500 mb-4">Review your selections and confirm payment.</p>

          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700"><strong>Event:</strong> {selectedEventDetail.event.title}</p>
            <p className="text-sm text-emerald-700"><strong>Date:</strong> {formatDate(selectedEventDetail.event.event_date)}</p>
            {selectedEventDetail.event.event_time_start && (
              <p className="text-sm text-emerald-700">
                <strong>Time:</strong> {formatTime(selectedEventDetail.event.event_time_start)}
                {selectedEventDetail.event.event_time_end && ` - ${formatTime(selectedEventDetail.event.event_time_end)}`}
              </p>
            )}
            <div className="mt-2 pt-2 border-t border-emerald-200 space-y-1">
              {assignments.map(a => (
                <div key={a.child_id} className="flex justify-between text-sm text-emerald-700">
                  <span>{a.childName} ({a.passName})</span>
                  <span>${a.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1 border-t border-emerald-200">
                <span className="text-sm font-bold text-emerald-800">Total</span>
                <span className="text-lg font-bold text-emerald-800">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {savedCards.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center mb-4">
              <p className="text-sm text-amber-800">
                No saved payment methods. Please add a card in the Payments tab first.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {savedCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all border-2 flex items-center gap-3 ${
                    selectedCard === card.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    selectedCard === card.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedCard === card.id ? '✓' : '💳'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{card.brand} &bull;&bull;&bull;&bull; {card.last4}</p>
                    <p className="text-xs text-gray-500">Expires {card.exp_month}/{card.exp_year}{card.is_default && ' — Default'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={() => setStep('select')} variant="outline" className="flex-1">Back</Button>
            <Button
              onClick={handlePayment}
              disabled={submitting || !selectedCard}
              className="flex-1 text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {submitting ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Select Event & Children */}
      {step === 'select' && (
        <>
          {loadingEvents ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Loading events...</p>
            </Card>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center">
              <span className="text-4xl mb-3 block">📅</span>
              <p className="text-gray-600">No bookable events at the moment. Check back soon!</p>
            </Card>
          ) : (
            <>
              {/* Event Selection (if multiple) */}
              {events.length > 1 && !selectedEventDetail && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {events.map(event => (
                    <button
                      key={event.id}
                      onClick={() => fetchEventDetail(event.id)}
                      className="text-left rounded-xl border-2 border-gray-200 hover:border-emerald-400 overflow-hidden transition-all hover:shadow-lg"
                    >
                      {event.image_url && (
                        <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h4 className="font-bold text-gray-800">{event.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{formatDate(event.event_date)}</p>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Event Detail */}
              {selectedEventDetail && (
                <Card className="p-6">
                  {/* Event Header */}
                  <div className="flex items-start gap-4 mb-6">
                    {selectedEventDetail.event.image_url && (
                      <img
                        src={selectedEventDetail.event.image_url}
                        alt={selectedEventDetail.event.title}
                        className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{selectedEventDetail.event.title}</h4>
                      <p className="text-sm text-gray-600">{formatDate(selectedEventDetail.event.event_date)}</p>
                      {selectedEventDetail.event.event_time_start && (
                        <p className="text-sm text-gray-500">
                          {formatTime(selectedEventDetail.event.event_time_start)}
                          {selectedEventDetail.event.event_time_end && ` - ${formatTime(selectedEventDetail.event.event_time_end)}`}
                        </p>
                      )}
                      {selectedEventDetail.event.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedEventDetail.event.description}</p>
                      )}
                    </div>
                  </div>

                  {events.length > 1 && (
                    <button
                      onClick={() => { setSelectedEventDetail(null); setSelectedChildren([]); }}
                      className="text-sm text-emerald-600 hover:text-emerald-700 mb-4 inline-block"
                    >
                      &larr; Choose a different event
                    </button>
                  )}

                  {/* Booking Instructions */}
                  {selectedEventDetail.event.booking_instructions && (
                    <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-sm text-emerald-800">{selectedEventDetail.event.booking_instructions}</p>
                    </div>
                  )}

                  {/* Availability */}
                  {selectedEventDetail.availability.maxCapacity && (
                    <div className="mb-6 p-3 rounded-xl bg-gray-50 text-center">
                      <p className="text-sm text-gray-600">
                        <span className={`font-bold ${
                          selectedEventDetail.availability.isFull ? 'text-red-600'
                          : (selectedEventDetail.availability.remaining || 0) <= 10 ? 'text-amber-600'
                          : 'text-green-600'
                        }`}>
                          {selectedEventDetail.availability.isFull ? 'FULL' : `${selectedEventDetail.availability.remaining} spots remaining`}
                        </span>
                        {' '}of {selectedEventDetail.availability.maxCapacity} total
                      </p>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(selectedEventDetail.availability.booked / selectedEventDetail.availability.maxCapacity) * 100}%`,
                            background: selectedEventDetail.availability.isFull ? '#ef4444'
                              : (selectedEventDetail.availability.remaining || 0) <= 10 ? '#f59e0b' : '#22c55e',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedEventDetail.availability.isFull ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                      <p className="text-sm text-red-800 font-medium">This event is fully booked. Please check back later for cancellations.</p>
                    </div>
                  ) : (
                    <>
                      {/* Child Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Children to Register
                        </label>
                        {children.length === 0 ? (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                            <p className="text-sm text-amber-800">
                              No children found. Add your children in the Children tab first.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {children.filter(c => c.waiverSigned).map(child => {
                              const isSelected = selectedChildren.includes(child.id);
                              const matchedPass = matchPassToChild(selectedEventDetail.passes, child.age);
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => toggleChild(child.id)}
                                  className={`p-4 rounded-xl text-left transition-all border-2 ${
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-50'
                                      : 'border-gray-200 hover:border-emerald-300 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                      isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {isSelected ? '✓' : child.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800">{child.name}</p>
                                      <p className="text-xs text-gray-500">
                                        Age {child.age}
                                        {matchedPass && ` — ${matchedPass.name} ($${matchedPass.price.toFixed(2)})`}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {children.filter(c => !c.waiverSigned).length > 0 && (
                          <p className="mt-2 text-xs text-amber-600">
                            Some children require a signed waiver before they can be registered.
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
                          placeholder="Allergies, special needs, questions..."
                          rows={2}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                          maxLength={500}
                        />
                      </div>

                      {/* Pricing Summary */}
                      {assignments.length > 0 && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="space-y-1">
                            {assignments.map(a => (
                              <div key={a.child_id} className="flex justify-between text-sm text-emerald-700">
                                <span>{a.childName} — {a.passName}</span>
                                <span>${a.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200">
                            <span className="text-sm font-bold text-emerald-800">Total</span>
                            <span className="text-lg font-bold text-emerald-800">${totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      {/* Continue to Payment */}
                      <Button
                        onClick={() => setStep('payment')}
                        disabled={assignments.length === 0}
                        className="w-full py-4 text-lg text-white"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      >
                        Continue to Payment — ${totalPrice.toFixed(2)}
                      </Button>
                    </>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
