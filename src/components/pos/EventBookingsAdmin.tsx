'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ChildDetail {
  child_id: string;
  name: string;
  age: number | null;
  pass_name: string;
  purchase_id: string;
}

interface EventBooking {
  id: string;
  event_id: string;
  event_date: string;
  customer_id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  num_children: number;
  child_details: ChildDetail[] | null;
  notes: string | null;
  status: string;
  total_amount: number | null;
  stripe_payment_intent_id: string | null;
  purchase_ids: string[] | null;
  created_at: string;
  event_title: string;
  event_max_capacity: number | null;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function EventBookingsAdmin() {
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = selectedEventId
        ? `/api/admin/event-bookings?event_id=${selectedEventId}`
        : '/api/admin/event-bookings';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    setRefunding(bookingId);
    try {
      const res = await fetch(`/api/admin/event-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) await fetchBookings();
    } catch {
      // ignore
    } finally {
      setRefunding(null);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!confirm('Refund this booking? This will cancel the booking and process a refund if payment was made.')) return;
    setRefunding(bookingId);
    try {
      const res = await fetch(`/api/admin/event-bookings/${bookingId}/refund`, {
        method: 'POST',
      });
      if (res.ok) await fetchBookings();
      else {
        const data = await res.json();
        alert(data.error || 'Refund failed');
      }
    } catch {
      alert('Refund failed');
    } finally {
      setRefunding(null);
    }
  };

  // Get unique events for filter
  const uniqueEvents = Array.from(
    new Map(bookings.map(b => [b.event_id, { id: b.event_id, title: b.event_title }])).values()
  );

  // Group active bookings by date
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const bookingsByDate: Record<string, EventBooking[]> = {};
  activeBookings.forEach(b => {
    if (!bookingsByDate[b.event_date]) bookingsByDate[b.event_date] = [];
    bookingsByDate[b.event_date].push(b);
  });

  const sortedDates = Object.keys(bookingsByDate).sort();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcomingDates = sortedDates.filter(d => d >= todayStr);
  const pastDates = sortedDates.filter(d => d < todayStr);

  const effectiveDate = selectedDate || upcomingDates[0] || pastDates[0] || null;
  const selectedBookings = effectiveDate ? (bookingsByDate[effectiveDate] || []) : [];
  const totalChildren = selectedBookings.reduce((sum, b) => sum + b.num_children, 0);

  // Get max capacity for the selected date's event
  const maxCapacity = selectedBookings[0]?.event_max_capacity || null;

  // Cancelled bookings for selected date
  const cancelledBookings = effectiveDate
    ? bookings.filter(b => b.event_date === effectiveDate && b.status === 'cancelled')
    : [];

  return (
    <div className="space-y-6">
      {/* Event Filter */}
      {uniqueEvents.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-neutral-600">Filter by Event:</label>
          <select
            value={selectedEventId || ''}
            onChange={(e) => { setSelectedEventId(e.target.value || null); setSelectedDate(null); }}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="">All Events</option>
            {uniqueEvents.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500 mx-auto" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🎪</p>
              <p className="text-neutral-600">No event bookings yet</p>
            </div>
          ) : (
            <>
              {/* Date pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {upcomingDates.map(date => {
                  const dateBookings = bookingsByDate[date] || [];
                  const kids = dateBookings.reduce((s, b) => s + b.num_children, 0);
                  const cap = dateBookings[0]?.event_max_capacity;
                  const isSelected = effectiveDate === date;
                  const eventTitle = dateBookings[0]?.event_title || 'Event';
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-200 hover:border-emerald-300 text-neutral-700'
                      }`}
                    >
                      <div className="text-xs text-neutral-500">{eventTitle}</div>
                      {formatShortDate(date)}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                        isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {kids}{cap ? `/${cap}` : ''}
                      </span>
                    </button>
                  );
                })}
                {pastDates.length > 0 && (
                  <>
                    <div className="w-px bg-neutral-300 mx-1" />
                    {pastDates.slice(-3).map(date => {
                      const dateBookings = bookingsByDate[date] || [];
                      const kids = dateBookings.reduce((s, b) => s + b.num_children, 0);
                      const isSelected = effectiveDate === date;
                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all opacity-60 ${
                            isSelected
                              ? 'border-gray-400 bg-gray-50 text-gray-700'
                              : 'border-neutral-200 text-neutral-500'
                          }`}
                        >
                          {formatShortDate(date)}
                          <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-500">
                            {kids}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Selected date details */}
              {effectiveDate && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-charcoal-800">
                        {selectedBookings[0]?.event_title || 'Event'} — {formatDate(effectiveDate)}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {totalChildren} kid{totalChildren !== 1 ? 's' : ''} registered
                        {maxCapacity && ` • ${maxCapacity - totalChildren} spots remaining`}
                      </p>
                    </div>
                    {maxCapacity && (
                      <div className="w-32">
                        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (totalChildren / maxCapacity) * 100)}%`,
                              background: totalChildren >= maxCapacity ? '#ef4444' : totalChildren >= maxCapacity * 0.75 ? '#f59e0b' : '#22c55e',
                            }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500 text-center mt-1">{totalChildren}/{maxCapacity}</p>
                      </div>
                    )}
                  </div>

                  {/* Attendee table */}
                  {selectedBookings.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4">No bookings for this date yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-neutral-200">
                            <th className="text-left py-2 px-3 font-semibold text-neutral-600">Parent</th>
                            <th className="text-left py-2 px-3 font-semibold text-neutral-600">Contact</th>
                            <th className="text-left py-2 px-3 font-semibold text-neutral-600">Kids</th>
                            <th className="text-left py-2 px-3 font-semibold text-neutral-600">Details</th>
                            <th className="text-right py-2 px-3 font-semibold text-neutral-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBookings.map((booking) => (
                            <tr key={booking.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                              <td className="py-3 px-3 font-medium text-charcoal-800">{booking.parent_name}</td>
                              <td className="py-3 px-3">
                                <div className="text-neutral-600">{booking.parent_email}</div>
                                {booking.parent_phone && (
                                  <div className="text-neutral-500 text-xs">{booking.parent_phone}</div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                                  {booking.num_children}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {booking.child_details && Array.isArray(booking.child_details) && (
                                  <div className="space-y-0.5">
                                    {booking.child_details.map((child, i) => (
                                      <p key={i} className="text-neutral-600 text-xs">
                                        {child.name}{child.age != null && ` (${child.age})`} — {child.pass_name}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {booking.notes && (
                                  <p className="text-xs text-neutral-400 mt-1">Note: {booking.notes}</p>
                                )}
                                {booking.total_amount != null && Number(booking.total_amount) > 0 && (
                                  <p className="text-xs text-green-600 font-medium mt-1">
                                    Paid: ${Number(booking.total_amount).toFixed(2)}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {booking.stripe_payment_intent_id && (
                                    <button
                                      onClick={() => handleRefund(booking.id)}
                                      disabled={refunding === booking.id}
                                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                                    >
                                      {refunding === booking.id ? 'Processing...' : 'Refund'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCancel(booking.id)}
                                    disabled={refunding === booking.id}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-neutral-200">
                            <td colSpan={2} className="py-2 px-3 font-semibold text-neutral-700">
                              Total: {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
                            </td>
                            <td className="py-2 px-3 font-bold text-emerald-700">{totalChildren} kids</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Cancelled bookings */}
                  {cancelledBookings.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Cancelled</p>
                      <div className="space-y-1">
                        {cancelledBookings.map(b => (
                          <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded bg-neutral-50 text-neutral-400 text-sm line-through">
                            <span>{b.parent_name} — {b.num_children} kid{b.num_children > 1 ? 's' : ''}</span>
                            <span className="text-xs">Cancelled</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
