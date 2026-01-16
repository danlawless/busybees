/**
 * Admin Party Management Page
 * Manage party bookings, packages, and calendar
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/client-logger';
import { Database } from '@/lib/supabase/database.types';
import { PACKAGE_PRICING } from '@/lib/validations/party-booking';
import { parseDateString } from '@/lib/utils';

type PartyBooking = Database['public']['Tables']['party_bookings']['Row'];

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
type PartyType = 'all' | 'private' | 'semi_private';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
};

const PARTY_TYPE_LABELS = {
  private: 'Private Party',
  semi_private: 'Semi-Private Party',
};

const PACKAGE_LABELS = {
  queen_bee: 'Queen Bee',
  worker_bee: 'Worker Bee',
  basic_bee: 'Basic Bee',
};

export default function AdminPartiesPage() {
  const [bookings, setBookings] = useState<PartyBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<PartyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all');
  const [partyTypeFilter, setPartyTypeFilter] = useState<PartyType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active view
  const [activeView, setActiveView] = useState<'bookings' | 'calendar' | 'packages'>('bookings');

  // Package config
  const [packageConfig, setPackageConfig] = useState(PACKAGE_PRICING);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, partyTypeFilter, searchQuery, dateFilter, startDate, endDate]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/party-bookings');

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data);
      logger.info({ count: data.length }, 'Fetched party bookings');
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch bookings');
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Party type filter
    if (partyTypeFilter !== 'all') {
      filtered = filtered.filter((b) => b.party_type === partyTypeFilter);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(query) ||
          b.customer_email.toLowerCase().includes(query) ||
          b.customer_phone.toLowerCase().includes(query) ||
          b.child_name.toLowerCase().includes(query)
      );
    }

    // Date filter
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter((b) => b.party_date >= today);
    } else if (dateFilter === 'past') {
      filtered = filtered.filter((b) => b.party_date < today);
    } else if (dateFilter === 'custom') {
      if (startDate) {
        filtered = filtered.filter((b) => b.party_date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter((b) => b.party_date <= endDate);
      }
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: PartyBooking['status']) => {
    try {
      setError('');
      setSuccessMessage('');

      const response = await fetch(`/api/admin/party-bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking');
      }

      const updatedBooking = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));
      setSuccessMessage(`Booking status updated to ${newStatus}`);
      logger.info({ bookingId, newStatus }, 'Updated booking status');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err, bookingId }, 'Failed to update booking');
      setError(err instanceof Error ? err.message : 'Failed to update booking');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseDateString(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    upcoming: bookings.filter((b) => b.party_date >= new Date().toISOString().split('T')[0]).length,
    totalRevenue: bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.total_price, 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-charcoal-800 mb-2">Party Management</h1>
            <p className="text-neutral-600">Manage party bookings, packages, and calendar</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✅ {successMessage}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-charcoal-800">{stats.total}</div>
              <div className="text-sm text-neutral-600 mt-1">Total Bookings</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-neutral-600 mt-1">Pending</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-sm text-neutral-600 mt-1">Confirmed</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.upcoming}</div>
              <div className="text-sm text-neutral-600 mt-1">Upcoming</div>
            </div>
          </Card>
          <Card hover={false} padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey-600">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-sm text-neutral-600 mt-1">Total Revenue</div>
            </div>
          </Card>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-neutral-200">
          <button
            onClick={() => setActiveView('bookings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'bookings'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📋 Bookings
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'calendar'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveView('packages')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeView === 'packages'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📦 Packages
          </button>
        </div>

        {/* Bookings View */}
        {activeView === 'bookings' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card padding="sm">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as BookingStatus)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Party Type</label>
                    <select
                      value={partyTypeFilter}
                      onChange={(e) => setPartyTypeFilter(e.target.value as PartyType)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    >
                      <option value="all">All Types</option>
                      <option value="private">Private</option>
                      <option value="semi_private">Semi-Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Date Range</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    >
                      <option value="all">All Dates</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, email, phone..."
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                    />
                  </div>
                </div>

                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <div className="text-sm text-neutral-600">
                    Showing {filteredBookings.length} of {bookings.length} bookings
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('all');
                      setPartyTypeFilter('all');
                      setDateFilter('all');
                      setSearchQuery('');
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>

            {/* Bookings List */}
            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <p className="text-neutral-600">No bookings found matching your filters.</p>
                  </div>
                </Card>
              ) : (
                filteredBookings.map((booking) => (
                  <Card key={booking.id} hover={false} padding="sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Date & Time */}
                      <div className="md:col-span-2">
                        <div className="font-semibold text-charcoal-800">{formatDate(booking.party_date)}</div>
                        <div className="text-sm text-neutral-600">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="md:col-span-3">
                        <div className="font-medium text-charcoal-800">{booking.customer_name}</div>
                        <div className="text-sm text-neutral-600">{booking.customer_email}</div>
                        <div className="text-sm text-neutral-600">{booking.customer_phone}</div>
                      </div>

                      {/* Party Details */}
                      <div className="md:col-span-3">
                        <div className="text-sm">
                          <div className="font-medium text-charcoal-800">
                            {booking.child_name}
                            {booking.child_age && ` (${booking.child_age} yrs)`}
                          </div>
                          <div className="text-neutral-600">{PACKAGE_LABELS[booking.package_name]}</div>
                          <div className="text-neutral-600">{PARTY_TYPE_LABELS[booking.party_type]}</div>
                          <div className="text-neutral-600">{booking.guest_count} guests</div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2">
                        <div className="font-bold text-honey-600 text-lg">{formatCurrency(booking.total_price)}</div>
                        {booking.additional_kids > 0 && (
                          <div className="text-xs text-neutral-600">+{booking.additional_kids} extra kids</div>
                        )}
                        <div className="text-xs text-neutral-600 capitalize">
                          {booking.payment_status || 'pending'}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="md:col-span-2 space-y-2">
                        <div
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                            STATUS_COLORS[booking.status]
                          }`}
                        >
                          {booking.status.toUpperCase()}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <div className="text-xs text-neutral-600">
                          <strong>Notes:</strong> {booking.notes}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-neutral-600 mb-4">📅 Calendar visualization coming soon!</p>
                <p className="text-sm text-neutral-500">
                  Will display booked slots by date with color-coding for party types and status.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Packages View */}
        {activeView === 'packages' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Party Package Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(packageConfig).map(([key, pkg]) => (
                    <div key={key} className="border border-neutral-200 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-charcoal-800 mb-3">{pkg.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-neutral-600">Semi-Private Price</div>
                          <div className="text-xl font-bold text-honey-600">
                            {formatCurrency(pkg.semiPrivatePrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-600">Private Price</div>
                          <div className="text-xl font-bold text-honey-600">
                            {formatCurrency(pkg.privatePrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-600">Max Guests</div>
                          <div className="text-lg font-medium text-charcoal-800">{pkg.maxGuests}</div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-600">Duration</div>
                          <div className="text-lg font-medium text-charcoal-800">{pkg.duration} hours</div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="text-sm font-medium text-neutral-700 mb-2">Features:</div>
                        <ul className="space-y-1">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-neutral-600 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Note:</strong> Package pricing is currently managed in code. To update prices, edit the
                    configuration file and redeploy. Database-driven pricing management coming soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
