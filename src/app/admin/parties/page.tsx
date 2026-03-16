/**
 * Admin Party Management Page
 * Manage party bookings, packages, and calendar
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WaiverModal } from '@/components/ui/WaiverModal';
import { StaffDiscountApplicator } from '@/components/admin/StaffDiscountApplicator';
import { logger } from '@/lib/client-logger';
import { Database } from '@/lib/supabase/database.types';
import { PACKAGE_PRICING } from '@/lib/validations/party-booking';
import { parseDateString, formatDateToYYYYMMDD } from '@/lib/utils';

type PartyBooking = Database['public']['Tables']['party_bookings']['Row'];
type PartyPackage = Database['public']['Tables']['party_packages']['Row'];
type PartyTimeSlot = Database['public']['Tables']['party_time_slots']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'done';
type PartyType = 'all' | 'private' | 'semi_private';
type SlotPartyType = 'private' | 'semi_private';
type DayType = 'weekday' | 'weekend';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  done: 'bg-blue-100 text-blue-800 border-blue-300',
};

const PARTY_TYPE_LABELS = {
  private: 'Private Party',
  semi_private: 'Semi-Private Party',
};

const PACKAGE_LABELS = {
  queen_bee: 'Queen Bee',
  worker_bee: 'Worker Bee',
  basic_bee: 'Basic Bee',
  group_rate: 'Group Rate',
};

const PACKAGE_BADGE_COLORS: Record<string, string> = {
  queen_bee: 'bg-amber-100 text-amber-800 border-amber-300',
  worker_bee: 'bg-orange-100 text-orange-800 border-orange-300',
  basic_bee: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  group_rate: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function AdminPartiesPage() {
  // PIN lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
  const [showDoneBookings, setShowDoneBookings] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active view
  const [activeView, setActiveView] = useState<'bookings' | 'calendar' | 'packages' | 'time-slots'>('bookings');

  // Package config (legacy hardcoded)
  const [packageConfig, setPackageConfig] = useState(PACKAGE_PRICING);

  // Party packages from database
  const [partyPackages, setPartyPackages] = useState<PartyPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: '',
    base_price: 350,
    capacity: 15,
    duration: 2,
    description: '',
    included_items: [] as string[],
    is_active: true,
  });
  const [newFeature, setNewFeature] = useState('');

  // Time slots state
  const [timeSlots, setTimeSlots] = useState<PartyTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    partyType: 'semi_private' as SlotPartyType,
    dayType: 'weekend' as DayType,
    startTime: '13:00',
    endTime: '15:00',
    label: '',
    isActive: true,
    sortOrder: 0,
  });

  // Events state (for blocking party slots)
  const [events, setEvents] = useState<Event[]>([]);

  // Manual booking state
  const [showManualBookForm, setShowManualBookForm] = useState(false);
  const [isCreatingManualBooking, setIsCreatingManualBooking] = useState(false);
  const [manualBooking, setManualBooking] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partyType: 'private' as SlotPartyType,
    packageName: 'basic_bee' as 'queen_bee' | 'worker_bee' | 'basic_bee' | 'group_rate',
    startTime: '',
    endTime: '',
    childName: '',
    childAge: null as number | null,
    guestCount: 15,
    notes: '',
  });

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Booking detail / guest list state
  const [selectedBooking, setSelectedBooking] = useState<PartyBooking | null>(null);
  const [guests, setGuests] = useState<{ id: string; child_name: string; age: number | null; waiver_signed: boolean; waiver_signed_date: string | null; created_at: string }[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [addGuestForm, setAddGuestForm] = useState({ firstName: '', lastName: '', age: '' });
  const [addingGuest, setAddingGuest] = useState(false);
  const [signingGuestWaiver, setSigningGuestWaiver] = useState<string | null>(null);
  const [removingGuest, setRemovingGuest] = useState<string | null>(null);
  const [viewingWaiverGuest, setViewingWaiverGuest] = useState<{ name: string; signedDate: string | null } | null>(null);

  // Overage payment state
  const [savedCards, setSavedCards] = useState<{ id: string; stripe_payment_method_id: string; last4: string; brand: string; is_default: boolean }[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'saved_card' | 'cash'>('saved_card');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [overagePaid, setOveragePaid] = useState(false);

  const INCLUDED_KIDS = 15;
  const EXTRA_KID_PRICE = 15;

  // Only fetch data after PIN is entered
  useEffect(() => {
    if (isUnlocked) {
      fetchBookings();
      fetchEvents();
      fetchPartyPackages();
      fetchTimeSlots();
    }
  }, [isUnlocked]);

  const fetchPartyPackages = async () => {
    try {
      setIsLoadingPackages(true);
      const response = await fetch('/api/parties?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch party packages');
      }
      const data = await response.json();
      setPartyPackages(data.parties || []);
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch party packages');
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const createPartyPackage = async () => {
    try {
      setIsCreating(true);
      setError('');

      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPackage.name,
          basePrice: newPackage.base_price,
          capacity: newPackage.capacity,
          duration: newPackage.duration,
          description: newPackage.description,
          includedItems: newPackage.included_items,
          isActive: newPackage.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create party package');
      }

      const data = await response.json();
      setPartyPackages((prev) => [data.party, ...prev]);
      setSuccessMessage(`Party package "${newPackage.name}" created successfully!`);
      setShowCreateForm(false);
      setNewPackage({
        name: '',
        base_price: 350,
        capacity: 15,
        duration: 2,
        description: '',
        included_items: [],
        is_active: true,
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to create party package');
      setError(err instanceof Error ? err.message : 'Failed to create party package');
    } finally {
      setIsCreating(false);
    }
  };

  const togglePackageStatus = async (pkg: PartyPackage) => {
    try {
      setError('');
      const response = await fetch(`/api/parties/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update package');
      }

      const data = await response.json();
      setPartyPackages((prev) => prev.map((p) => (p.id === pkg.id ? data.party : p)));
      setSuccessMessage(`Package ${pkg.is_active ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to toggle package status');
      setError(err instanceof Error ? err.message : 'Failed to update package');
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setNewPackage((prev) => ({
        ...prev,
        included_items: [...prev.included_items, newFeature.trim()],
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setNewPackage((prev) => ({
      ...prev,
      included_items: prev.included_items.filter((_, i) => i !== index),
    }));
  };

  // Time slots functions
  const fetchTimeSlots = async () => {
    try {
      setIsLoadingSlots(true);
      const response = await fetch('/api/admin/party-time-slots');
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      const data = await response.json();
      setTimeSlots(data || []);
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch time slots');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const createTimeSlot = async () => {
    try {
      setIsCreatingSlot(true);
      setError('');

      // Auto-generate label if not provided
      const label = newSlot.label || formatTimeRange(newSlot.startTime, newSlot.endTime);

      const response = await fetch('/api/admin/party-time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSlot,
          label,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create time slot');
      }

      const data = await response.json();
      setTimeSlots((prev) => [...prev, data]);
      setSuccessMessage('Time slot created successfully!');
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

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to create time slot');
      setError(err instanceof Error ? err.message : 'Failed to create time slot');
    } finally {
      setIsCreatingSlot(false);
    }
  };

  const toggleSlotStatus = async (slot: PartyTimeSlot) => {
    try {
      setError('');
      const response = await fetch(`/api/admin/party-time-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slot.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update time slot');
      }

      const data = await response.json();
      setTimeSlots((prev) => prev.map((s) => (s.id === slot.id ? data : s)));
      setSuccessMessage(`Time slot ${slot.is_active ? 'disabled' : 'enabled'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to toggle slot status');
      setError(err instanceof Error ? err.message : 'Failed to update time slot');
    }
  };

  const deleteTimeSlot = async (slot: PartyTimeSlot) => {
    if (!confirm(`Are you sure you want to delete this time slot? (${slot.label})`)) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/admin/party-time-slots/${slot.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete time slot');
      }

      setTimeSlots((prev) => prev.filter((s) => s.id !== slot.id));
      setSuccessMessage('Time slot deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to delete time slot');
      setError(err instanceof Error ? err.message : 'Failed to delete time slot');
    }
  };

  const createManualBooking = async () => {
    if (!selectedCalendarDate || !manualBooking.startTime || !manualBooking.endTime) {
      setError('Please select a date and time slot');
      return;
    }
    if (!manualBooking.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    try {
      setIsCreatingManualBooking(true);
      setError('');

      const response = await fetch('/api/admin/party-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualBooking,
          partyDate: selectedCalendarDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const newBooking = await response.json();
      setBookings((prev) => [newBooking, ...prev]);
      setSuccessMessage('Manual booking created successfully!');
      setShowManualBookForm(false);
      setManualBooking({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        partyType: 'private',
        packageName: 'basic_bee',
        startTime: '',
        endTime: '',
        childName: '',
        childAge: null,
        guestCount: 15,
        notes: '',
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err }, 'Failed to create manual booking');
      setError(err instanceof Error ? err.message : 'Failed to create manual booking');
    } finally {
      setIsCreatingManualBooking(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      logger.error({ error: err }, 'Failed to fetch events');
    }
  };

  const getEventsForDate = (date: Date): Event[] => {
    const dateStr = formatDateToYYYYMMDD(date);
    return events.filter((e) => {
      const eventEnd = e.event_date_end || e.event_date;
      return e.event_date <= dateStr && eventEnd >= dateStr && e.status === 'published';
    });
  };

  const formatTimeRange = (start: string, end: string) => {
    const formatSingleTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
  };

  // Calendar helper functions
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week the month starts on (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();
    // Total days in the month
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Add days from next month to complete the grid (6 rows x 7 days = 42)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return bookings.filter((b) => b.party_date === dateStr);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCalendarDate(new Date());
    setSelectedCalendarDate(formatDateToYYYYMMDD(new Date()));
  };

  const getStatusDot = (status: PartyBooking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'done':
        return 'bg-blue-500';
      default:
        return 'bg-neutral-400';
    }
  };

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
    const today = formatDateToYYYYMMDD(new Date());
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

  const deleteBooking = async (bookingId: string, customerName: string) => {
    if (!confirm(`Permanently delete party booking for ${customerName}? This cannot be undone.`)) {
      return;
    }
    try {
      setError('');
      setSuccessMessage('');
      const response = await fetch(`/api/admin/party-bookings/${bookingId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSuccessMessage('Booking deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      logger.error({ error: err, bookingId }, 'Failed to delete booking');
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  };

  // Guest list functions
  const fetchGuests = async (bookingId: string) => {
    setGuestsLoading(true);
    try {
      const response = await fetch(`/api/admin/party-bookings/${bookingId}/guests`);
      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests || []);
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
    } finally {
      setGuestsLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!selectedBooking || !addGuestForm.firstName || !addGuestForm.lastName) return;
    setAddingGuest(true);
    try {
      const response = await fetch(`/api/admin/party-bookings/${selectedBooking.id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: `${addGuestForm.firstName.trim()} ${addGuestForm.lastName.trim()}`,
          age: addGuestForm.age ? parseInt(addGuestForm.age) : null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setGuests(prev => [...prev, data.guest]);
        setAddGuestForm({ firstName: '', lastName: '', age: '' });
      }
    } catch (err) {
      console.error('Error adding guest:', err);
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSignGuestWaiver = async (guestId: string) => {
    if (!selectedBooking) return;
    setSigningGuestWaiver(guestId);
    try {
      const response = await fetch(`/api/admin/party-bookings/${selectedBooking.id}/guests/${guestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiver_signed: true }),
      });
      if (response.ok) {
        setGuests(prev => prev.map(g =>
          g.id === guestId ? { ...g, waiver_signed: true, waiver_signed_date: new Date().toISOString() } : g
        ));
      }
    } catch (err) {
      console.error('Error signing waiver:', err);
    } finally {
      setSigningGuestWaiver(null);
    }
  };

  const handleRemoveGuest = async (guestId: string) => {
    if (!selectedBooking) return;
    setRemovingGuest(guestId);
    try {
      const response = await fetch(`/api/admin/party-bookings/${selectedBooking.id}/guests/${guestId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setGuests(prev => prev.filter(g => g.id !== guestId));
      }
    } catch (err) {
      console.error('Error removing guest:', err);
    } finally {
      setRemovingGuest(null);
    }
  };

  const fetchSavedCards = async (bookingId: string) => {
    setLoadingCards(true);
    try {
      const response = await fetch(`/api/admin/party-bookings/${bookingId}/overage-payment`);
      if (response.ok) {
        const data = await response.json();
        setSavedCards(data.savedCards || []);
        if (data.savedCards?.length > 0) {
          const defaultCard = data.savedCards.find((c: { is_default: boolean }) => c.is_default) || data.savedCards[0];
          setSelectedCardId(defaultCard.stripe_payment_method_id);
        }
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleOveragePayment = async () => {
    if (!selectedBooking) return;
    if (selectedPaymentMethod === 'saved_card' && !selectedCardId) {
      setError('Please select a payment method');
      return;
    }

    setProcessingPayment(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/party-bookings/${selectedBooking.id}/overage-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: selectedPaymentMethod,
          payment_method_id: selectedPaymentMethod === 'saved_card' ? selectedCardId : undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setOveragePaid(true);
        setSuccessMessage(`Overage payment of ${formatCurrency(data.payment.amount)} processed successfully!`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.error || 'Payment failed');
      }
    } catch (err) {
      console.error('Error processing overage payment:', err);
      setError('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const openBookingDetail = (booking: PartyBooking) => {
    setSelectedBooking(booking);
    setOveragePaid(false);
    fetchGuests(booking.id);
    fetchSavedCards(booking.id);
    setAddGuestForm({ firstName: '', lastName: '', age: '' });
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

  // PIN verification - authenticates via staff login API
  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;

    setIsAuthenticating(true);
    setPinError('');

    try {
      const response = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (response.ok) {
        setIsUnlocked(true);
        setPinError('');
      } else {
        const data = await response.json();
        setPinError(data.error || 'Invalid PIN. Please try again.');
        setPinInput('');
      }
    } catch (err) {
      logger.error({ error: err }, 'Staff login failed');
      setPinError('Authentication failed. Please try again.');
      setPinInput('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit();
    }
  };

  // Stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    upcoming: bookings.filter((b) => b.party_date >= formatDateToYYYYMMDD(new Date())).length,
    totalRevenue: bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + Number(b.total_price), 0),
  };

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white flex items-center justify-center p-8 pos-page-static">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">🔒 Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-center text-neutral-600">
                Enter the admin PIN to access Party Management
              </p>
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={handlePinKeyDown}
                  placeholder="Enter PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 disabled:opacity-50"
                  autoFocus
                  disabled={isAuthenticating}
                />
              </div>
              {pinError && (
                <p className="text-red-600 text-sm text-center">{pinError}</p>
              )}
              <Button
                onClick={handlePinSubmit}
                className="w-full"
                disabled={pinInput.length < 4 || isAuthenticating}
              >
                {isAuthenticating ? 'Authenticating...' : 'Unlock'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8 pos-page-static">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-yellow to-white p-8 pos-page-static">
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
        <div className="flex space-x-2 border-b border-neutral-200 overflow-x-auto">
          <button
            onClick={() => setActiveView('bookings')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeView === 'bookings'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📋 Bookings
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeView === 'calendar'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveView('packages')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeView === 'packages'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            📦 Packages
          </button>
          <button
            onClick={() => setActiveView('time-slots')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeView === 'time-slots'
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            🕐 Time Slots
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
                      <option value="done">Done</option>
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

            {/* Booking Detail View */}
            {selectedBooking && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                      ← Back to Bookings
                    </Button>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[selectedBooking.status]}`}>
                      {selectedBooking.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-charcoal-800 mb-2">Party Details</h3>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p><strong>Date:</strong> {formatDate(selectedBooking.party_date)}</p>
                        <p><strong>Time:</strong> {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
                        <p><strong>Package:</strong> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${PACKAGE_BADGE_COLORS[selectedBooking.package_name] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>{PACKAGE_LABELS[selectedBooking.package_name as keyof typeof PACKAGE_LABELS] || selectedBooking.package_name}</span></p>
                        <p><strong>Type:</strong> {PARTY_TYPE_LABELS[selectedBooking.party_type]}</p>
                        <p><strong>Birthday Child:</strong> {selectedBooking.child_name}{selectedBooking.child_age ? ` (${selectedBooking.child_age} yrs)` : ''}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-charcoal-800 mb-2">Contact Info</h3>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p><strong>Name:</strong> {selectedBooking.customer_name}</p>
                        <p><strong>Email:</strong> {selectedBooking.customer_email}</p>
                        <p><strong>Phone:</strong> {selectedBooking.customer_phone}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-charcoal-800 mb-2">Payment</h3>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p><strong>Base Price:</strong> {formatCurrency(Number(selectedBooking.base_price))}</p>
                        <p><strong>Total:</strong> <span className="text-lg font-bold text-honey-600">{formatCurrency(Number(selectedBooking.total_price))}</span></p>
                        <p><strong>Status:</strong> <span className="capitalize">{selectedBooking.payment_status || 'pending'}</span></p>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.notes && (
                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                      <strong>Notes:</strong> {selectedBooking.notes}
                    </div>
                  )}

                  {/* Guest List */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-charcoal-800">
                        Guest List ({guests.length}/{INCLUDED_KIDS} included)
                      </h3>
                    </div>

                    {/* Add Guest Form */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                          <input
                            type="text"
                            value={addGuestForm.firstName}
                            onChange={(e) => setAddGuestForm(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="First name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={addGuestForm.lastName}
                            onChange={(e) => setAddGuestForm(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Last name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                          <input
                            type="number"
                            value={addGuestForm.age}
                            onChange={(e) => setAddGuestForm(prev => ({ ...prev, age: e.target.value }))}
                            placeholder="Age"
                            min="0"
                            max="18"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={handleAddGuest}
                            disabled={addingGuest || !addGuestForm.firstName || !addGuestForm.lastName}
                            size="sm"
                            className="w-full"
                          >
                            {addingGuest ? 'Adding...' : '+ Add Guest'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Guests Table */}
                    {guestsLoading ? (
                      <p className="text-gray-500 text-center py-8">Loading guest list...</p>
                    ) : guests.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2 font-medium text-gray-600">#</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-600">Name</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-600">Age</th>
                              <th className="text-center py-3 px-2 font-medium text-gray-600">Waiver</th>
                              <th className="text-right py-3 px-2 font-medium text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {guests.map((guest, index) => (
                              <tr key={guest.id} className={`border-b border-gray-100 ${index >= INCLUDED_KIDS ? 'bg-red-50' : ''}`}>
                                <td className="py-3 px-2 text-gray-500">{index + 1}</td>
                                <td className="py-3 px-2 font-medium text-gray-900">
                                  {guest.child_name}
                                  {index >= INCLUDED_KIDS && (
                                    <span className="ml-2 text-xs text-red-600 font-medium">+${EXTRA_KID_PRICE}</span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-gray-600">{guest.age ?? '—'}</td>
                                <td className="py-3 px-2 text-center">
                                  {guest.waiver_signed ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                          Signed
                                        </span>
                                        <button
                                          onClick={() => setViewingWaiverGuest({ name: guest.child_name, signedDate: guest.waiver_signed_date })}
                                          className="px-2 py-1 text-xs font-medium border border-blue-300 text-blue-700 rounded-full hover:bg-blue-50"
                                        >
                                          View
                                        </button>
                                      </div>
                                      {guest.waiver_signed_date && (
                                        <span className="text-[10px] text-gray-500">
                                          {new Date(guest.waiver_signed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleSignGuestWaiver(guest.id)}
                                      disabled={signingGuestWaiver === guest.id}
                                      className="px-2 py-1 text-xs font-medium border border-amber-300 text-amber-700 rounded-full hover:bg-amber-50"
                                    >
                                      {signingGuestWaiver === guest.id ? 'Signing...' : 'Sign Waiver'}
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => handleRemoveGuest(guest.id)}
                                    disabled={removingGuest === guest.id}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    {removingGuest === guest.id ? 'Removing...' : 'Remove'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No guests added yet. Add guests using the form above.</p>
                    )}

                    {/* Overage Summary & Payment */}
                    {guests.length > INCLUDED_KIDS && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-red-800">Additional Children Overage</p>
                            <p className="text-sm text-red-600">
                              {guests.length - INCLUDED_KIDS} extra {guests.length - INCLUDED_KIDS === 1 ? 'child' : 'children'} beyond the included {INCLUDED_KIDS} @ ${EXTRA_KID_PRICE}/child
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-700">
                              {formatCurrency((guests.length - INCLUDED_KIDS) * EXTRA_KID_PRICE)}
                            </p>
                            {overagePaid ? (
                              <p className="text-xs text-green-600 mt-1 font-semibold">Paid</p>
                            ) : (
                              <p className="text-xs text-red-600 mt-1">Balance Due</p>
                            )}
                          </div>
                        </div>

                        {!overagePaid && (
                          <div className="border-t border-red-200 pt-4">
                            <p className="text-sm font-medium text-gray-800 mb-3">Collect Overage Payment</p>
                            <div className="flex items-center gap-4 mb-3">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="saved_card"
                                  checked={selectedPaymentMethod === 'saved_card'}
                                  onChange={() => setSelectedPaymentMethod('saved_card')}
                                  className="text-honey-500 focus:ring-honey-500"
                                />
                                Saved Card
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value="cash"
                                  checked={selectedPaymentMethod === 'cash'}
                                  onChange={() => setSelectedPaymentMethod('cash')}
                                  className="text-honey-500 focus:ring-honey-500"
                                />
                                Cash
                              </label>
                            </div>

                            {selectedPaymentMethod === 'saved_card' && (
                              <div className="mb-3">
                                {loadingCards ? (
                                  <p className="text-sm text-gray-500">Loading payment methods...</p>
                                ) : savedCards.length > 0 ? (
                                  <select
                                    value={selectedCardId}
                                    onChange={(e) => setSelectedCardId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                                  >
                                    {savedCards.map((card) => (
                                      <option key={card.id} value={card.stripe_payment_method_id}>
                                        {card.brand.toUpperCase()} ending in {card.last4} {card.is_default ? '(default)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="text-sm text-amber-600">No saved cards on file. Use cash payment instead.</p>
                                )}
                              </div>
                            )}

                            <Button
                              onClick={handleOveragePayment}
                              disabled={processingPayment || (selectedPaymentMethod === 'saved_card' && (!selectedCardId || savedCards.length === 0))}
                              size="sm"
                              className="w-full"
                            >
                              {processingPayment
                                ? 'Processing...'
                                : `Charge ${formatCurrency((guests.length - INCLUDED_KIDS) * EXTRA_KID_PRICE)} ${selectedPaymentMethod === 'cash' ? '(Cash)' : ''}`
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guest Stats */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
                        <p className="text-xs text-gray-600">Total Guests</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-700">{guests.filter(g => g.waiver_signed).length}</p>
                        <p className="text-xs text-green-600">Waivers Signed</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-amber-700">{guests.filter(g => !g.waiver_signed).length}</p>
                        <p className="text-xs text-amber-600">Waivers Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Bookings List */}
            {!selectedBooking && (
            <div className="space-y-4">
              {(() => {
                const activeBookings = filteredBookings.filter(b => b.status !== 'done');
                const doneBookings = filteredBookings.filter(b => b.status === 'done');

                // Assign colors to dates that have multiple bookings
                const DATE_COLORS = [
                  'bg-amber-50 border-l-4 border-l-amber-400',
                  'bg-blue-50 border-l-4 border-l-blue-400',
                  'bg-green-50 border-l-4 border-l-green-400',
                  'bg-purple-50 border-l-4 border-l-purple-400',
                  'bg-pink-50 border-l-4 border-l-pink-400',
                  'bg-teal-50 border-l-4 border-l-teal-400',
                  'bg-orange-50 border-l-4 border-l-orange-400',
                ];
                const dateCounts = new Map<string, number>();
                activeBookings.forEach(b => dateCounts.set(b.party_date, (dateCounts.get(b.party_date) || 0) + 1));
                const dateColorMap = new Map<string, string>();
                let colorIndex = 0;
                dateCounts.forEach((count, date) => {
                  if (count > 1) {
                    dateColorMap.set(date, DATE_COLORS[colorIndex % DATE_COLORS.length]);
                    colorIndex++;
                  }
                });

                const renderBookingCard = (booking: PartyBooking, useColors = true) => {
                  const dateColor = useColors ? dateColorMap.get(booking.party_date) : undefined;
                  return (
                  <Card key={booking.id} hover={false} padding="sm" className={dateColor}>
                    <div
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start cursor-pointer hover:bg-gray-50/50 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => openBookingDetail(booking)}
                    >
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
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${PACKAGE_BADGE_COLORS[booking.package_name] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                            {PACKAGE_LABELS[booking.package_name as keyof typeof PACKAGE_LABELS] || booking.package_name}
                          </span>
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
                                onClick={(e) => { e.stopPropagation(); updateBookingStatus(booking.id, 'confirmed'); }}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateBookingStatus(booking.id, 'cancelled'); }}
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); updateBookingStatus(booking.id, 'done'); }}
                              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Mark Done
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteBooking(booking.id, booking.customer_name); }}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
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

                    {/* Staff Discount Applicator - only for pending unpaid bookings */}
                    {booking.status === 'pending' && booking.payment_status !== 'paid' && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <StaffDiscountApplicator
                          bookingId={booking.id}
                          currentPromoId={booking.applied_promo_id}
                          currentDiscountPercent={booking.discount_percent}
                          currentDiscountAmount={booking.discount_amount}
                          originalTotal={booking.total_price}
                          onDiscountApplied={() => fetchBookings()}
                          onDiscountRemoved={() => fetchBookings()}
                        />
                      </div>
                    )}
                  </Card>
                  );
                };

                if (filteredBookings.length === 0) {
                  return (
                    <Card>
                      <div className="text-center py-12">
                        <p className="text-neutral-600">No bookings found matching your filters.</p>
                      </div>
                    </Card>
                  );
                }

                return (
                  <>
                    {/* Active Bookings */}
                    {activeBookings.map(b => renderBookingCard(b))}

                    {/* Done Bookings - Collapsible */}
                    {doneBookings.length > 0 && (
                      <div className="mt-6">
                        <button
                          onClick={() => setShowDoneBookings(!showDoneBookings)}
                          className="w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 hover:bg-blue-100 transition-colors"
                        >
                          <span className="font-semibold text-blue-800">
                            Completed Parties ({doneBookings.length})
                          </span>
                          <span className="text-blue-600 text-sm">
                            {showDoneBookings ? '▲ Collapse' : '▼ Expand'}
                          </span>
                        </button>
                        {showDoneBookings && (
                          <div className="space-y-4 mt-4">
                            {doneBookings.map(b => renderBookingCard(b, false))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigateCalendar('prev')}>
                        ←
                      </Button>
                      <Button size="sm" variant="outline" onClick={goToToday}>
                        Today
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigateCalendar('next')}>
                        →
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-neutral-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays().map((dayInfo, idx) => {
                      const dateStr = formatDateToYYYYMMDD(dayInfo.date);
                      const dayBookings = getBookingsForDate(dayInfo.date);
                      const dayEvents = getEventsForDate(dayInfo.date);
                      const isToday = dateStr === formatDateToYYYYMMDD(new Date());
                      const isSelected = dateStr === selectedCalendarDate;
                      const totalIndicators = dayBookings.length + dayEvents.length;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedCalendarDate(dateStr)}
                          className={`
                            min-h-[80px] p-1 border rounded-lg text-left transition-all
                            ${dayInfo.isCurrentMonth ? 'bg-white' : 'bg-neutral-50'}
                            ${isSelected ? 'border-honey-500 ring-2 ring-honey-200' : 'border-neutral-200'}
                            ${isToday ? 'bg-honey-50' : ''}
                            hover:border-honey-400
                          `}
                        >
                          <div className={`
                            text-xs font-medium mb-1
                            ${dayInfo.isCurrentMonth ? 'text-charcoal-800' : 'text-neutral-400'}
                            ${isToday ? 'text-honey-600' : ''}
                          `}>
                            {dayInfo.date.getDate()}
                          </div>

                          {/* Event indicators (shown first) */}
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className="text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 bg-amber-100 text-amber-800"
                              >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500" />
                                <span className="truncate">{event.title}</span>
                              </div>
                            ))}
                            {/* Booking indicators */}
                            {dayBookings.slice(0, Math.max(1, 3 - dayEvents.length)).map((booking) => (
                              <div
                                key={booking.id}
                                className={`
                                  text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                                  ${booking.party_type === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                                `}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(booking.status)}`} />
                                <span className="truncate">{formatTime(booking.start_time)}</span>
                              </div>
                            ))}
                            {totalIndicators > 3 && (
                              <div className="text-xs text-neutral-500 pl-1">
                                +{totalIndicators - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Confirmed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Done</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Cancelled</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-4">
                        <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
                        <span>Private</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
                        <span>Semi-Private</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
                        <span>Event (blocks slot)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Date Details */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedCalendarDate
                      ? formatDate(selectedCalendarDate)
                      : 'Select a Date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCalendarDate && (
                    <div className="mb-4">
                      <Button
                        size="sm"
                        onClick={() => setShowManualBookForm(!showManualBookForm)}
                        className="w-full"
                      >
                        {showManualBookForm ? 'Cancel' : '+ Manual Book / Block Slot'}
                      </Button>
                    </div>
                  )}

                  {showManualBookForm && selectedCalendarDate && (
                    <div className="mb-4 p-3 bg-honey-50 border border-honey-200 rounded-lg space-y-3">
                      <h4 className="font-medium text-sm text-charcoal-800">Manual Booking</h4>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Customer Name *</label>
                        <input
                          type="text"
                          value={manualBooking.customerName}
                          onChange={(e) => setManualBooking((prev) => ({ ...prev, customerName: e.target.value }))}
                          placeholder="Name or 'BLOCKED'"
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Party Type</label>
                          <select
                            value={manualBooking.partyType}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, partyType: e.target.value as SlotPartyType }))}
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          >
                            <option value="private">Private</option>
                            <option value="semi_private">Semi-Private</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Package</label>
                          <select
                            value={manualBooking.packageName}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, packageName: e.target.value as typeof manualBooking.packageName }))}
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          >
                            <option value="basic_bee">Basic Bee</option>
                            <option value="worker_bee">Worker Bee</option>
                            <option value="queen_bee">Queen Bee</option>
                            <option value="group_rate">Group Rate</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Start Time *</label>
                          <input
                            type="time"
                            value={manualBooking.startTime}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, startTime: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">End Time *</label>
                          <input
                            type="time"
                            value={manualBooking.endTime}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, endTime: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={manualBooking.customerEmail}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, customerEmail: e.target.value }))}
                            placeholder="Optional"
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={manualBooking.customerPhone}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, customerPhone: e.target.value }))}
                            placeholder="Optional"
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Child Name</label>
                          <input
                            type="text"
                            value={manualBooking.childName}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, childName: e.target.value }))}
                            placeholder="Optional"
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">Guests</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={manualBooking.guestCount}
                            onChange={(e) => setManualBooking((prev) => ({ ...prev, guestCount: parseInt(e.target.value) || 15 }))}
                            className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={manualBooking.notes}
                          onChange={(e) => setManualBooking((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="e.g., Phone booking, walk-in, slot block..."
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        onClick={createManualBooking}
                        disabled={isCreatingManualBooking || !manualBooking.customerName || !manualBooking.startTime || !manualBooking.endTime}
                      >
                        {isCreatingManualBooking ? 'Creating...' : 'Create Booking'}
                      </Button>
                    </div>
                  )}

                  {!selectedCalendarDate ? (
                    <p className="text-neutral-600 text-sm">
                      Click on a date in the calendar to view its bookings.
                    </p>
                  ) : (
                    (() => {
                      const selectedBookings = bookings.filter(
                        (b) => b.party_date === selectedCalendarDate
                      );
                      const selectedEvents = events.filter(
                        (e) => {
                          const eventEnd = e.event_date_end || e.event_date;
                          return e.event_date <= selectedCalendarDate && eventEnd >= selectedCalendarDate && e.status === 'published';
                        }
                      );

                      if (selectedBookings.length === 0 && selectedEvents.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <p className="text-neutral-600 text-sm">No parties or events for this date.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {/* Published events shown first as blocked time */}
                          {selectedEvents.map((event) => (
                            <div
                              key={event.id}
                              className="p-3 rounded-lg border bg-amber-50 border-amber-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="font-medium text-sm text-charcoal-800">
                                    {formatTime(event.event_time_start)}
                                    {event.event_time_end && ` - ${formatTime(event.event_time_end)}`}
                                  </span>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  event
                                </span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="font-medium text-amber-900">{event.title}</div>
                                {event.description && (
                                  <div className="text-xs text-amber-700 line-clamp-2">{event.description}</div>
                                )}
                                <div className="text-xs text-amber-600 mt-1 pt-1 border-t border-amber-200">
                                  Blocks party bookings during this time
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Party bookings */}
                          {selectedBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className={`p-3 rounded-lg border ${
                                booking.status === 'cancelled'
                                  ? 'bg-red-50 border-red-200 opacity-60'
                                  : booking.party_type === 'private'
                                  ? 'bg-purple-50 border-purple-200'
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${getStatusDot(booking.status)}`} />
                                  <span className="font-medium text-sm text-charcoal-800">
                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status]}`}
                                >
                                  {booking.status}
                                </span>
                              </div>

                              <div className="text-sm space-y-1">
                                <div>
                                  <span className="text-neutral-600">Child: </span>
                                  <span className="font-medium">{booking.child_name}</span>
                                  {booking.child_age && <span className="text-neutral-500"> ({booking.child_age} yrs)</span>}
                                </div>
                                <div>
                                  <span className="text-neutral-600">Contact: </span>
                                  <span>{booking.customer_name}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-600">Phone: </span>
                                  <span>{booking.customer_phone}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
                                  <span className="text-xs text-neutral-600">
                                    {PARTY_TYPE_LABELS[booking.party_type]} • {booking.guest_count} guests
                                  </span>
                                  <span className="font-bold text-honey-600">
                                    {formatCurrency(booking.total_price)}
                                  </span>
                                </div>
                              </div>

                              {/* Quick actions */}
                              {booking.status === 'pending' && (
                                <div className="flex gap-1 mt-2 pt-2 border-t border-neutral-200">
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    className="flex-1 text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="flex-1 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                              {booking.status === 'confirmed' && (
                                <div className="mt-2 pt-2 border-t border-neutral-200">
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'done')}
                                    className="w-full text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                  >
                                    Mark Done
                                  </button>
                                </div>
                              )}
                              <div className="mt-1">
                                <button
                                  onClick={() => deleteBooking(booking.id, booking.customer_name)}
                                  className="w-full text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Packages View */}
        {activeView === 'packages' && (
          <div className="space-y-6">
            {/* Create New Package Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? '✕ Cancel' : '+ Create Party Package'}
              </Button>
            </div>

            {/* Create Package Form */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Party Package</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Package Name *</label>
                        <input
                          type="text"
                          value={newPackage.name}
                          onChange={(e) => setNewPackage((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Basic Bee (Semi-Private)"
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Base Price ($) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newPackage.base_price}
                          onChange={(e) => setNewPackage((prev) => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Capacity (guests)</label>
                        <input
                          type="number"
                          min="1"
                          value={newPackage.capacity}
                          onChange={(e) => setNewPackage((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 15 }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Duration (hours)</label>
                        <input
                          type="number"
                          min="1"
                          value={newPackage.duration}
                          onChange={(e) => setNewPackage((prev) => ({ ...prev, duration: parseInt(e.target.value) || 2 }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Description</label>
                      <textarea
                        value={newPackage.description}
                        onChange={(e) => setNewPackage((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what's included in this party package..."
                        rows={3}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Included Features</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                          placeholder="Add a feature..."
                          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                        <Button type="button" variant="outline" onClick={addFeature}>
                          Add
                        </Button>
                      </div>
                      {newPackage.included_items.length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {newPackage.included_items.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between bg-neutral-50 px-3 py-1 rounded">
                              <span className="text-sm">{item}</span>
                              <button
                                type="button"
                                onClick={() => removeFeature(idx)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={newPackage.is_active}
                        onChange={(e) => setNewPackage((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded border-neutral-300"
                      />
                      <label htmlFor="is_active" className="text-sm text-neutral-700">
                        Active (visible to customers)
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={createPartyPackage}
                        disabled={isCreating || !newPackage.name || newPackage.base_price <= 0}
                      >
                        {isCreating ? 'Creating...' : 'Create Package'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Party Packages from Database */}
            <Card>
              <CardHeader>
                <CardTitle>Party Packages</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPackages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500"></div>
                  </div>
                ) : partyPackages.length === 0 ? (
                  <div className="text-center py-8 text-neutral-600">
                    <p>No party packages found in the database.</p>
                    <p className="text-sm mt-2">Click "Create Party Package" above to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partyPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`border rounded-lg p-4 ${pkg.is_active ? 'border-green-200 bg-green-50' : 'border-neutral-200 bg-neutral-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-charcoal-800">{pkg.name}</h3>
                            <p className="text-sm text-neutral-600 mt-1">{pkg.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              {pkg.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => togglePackageStatus(pkg)}>
                              {pkg.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-neutral-600">Base Price</div>
                            <div className="text-xl font-bold text-honey-600">{formatCurrency(pkg.base_price)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-neutral-600">Capacity</div>
                            <div className="text-lg font-medium text-charcoal-800">{pkg.capacity} guests</div>
                          </div>
                          <div>
                            <div className="text-sm text-neutral-600">Duration</div>
                            <div className="text-lg font-medium text-charcoal-800">{pkg.duration} hours</div>
                          </div>
                          <div>
                            <div className="text-sm text-neutral-600">Stripe</div>
                            <div className="text-sm">
                              {pkg.stripe_product_id ? (
                                <span className="text-green-600">✓ Synced</span>
                              ) : (
                                <span className="text-yellow-600">Not synced</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {pkg.included_items && Array.isArray(pkg.included_items) && pkg.included_items.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-neutral-700 mb-1">Included:</div>
                            <div className="flex flex-wrap gap-1">
                              {(pkg.included_items as string[]).map((item, idx) => (
                                <span key={idx} className="bg-white px-2 py-1 rounded text-xs text-neutral-700 border border-neutral-200">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legacy Config Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Legacy Package Configuration (Reference)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-900">
                    <strong>Note:</strong> The configuration below is hardcoded for reference. New packages should be created using the form above.
                  </p>
                </div>
                <div className="space-y-4">
                  {Object.entries(packageConfig).map(([key, pkg]) => (
                    <div key={key} className="border border-neutral-200 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-charcoal-800 mb-2">{pkg.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-neutral-600">Semi-Private:</span>{' '}
                          <span className="font-medium">{formatCurrency(pkg.semiPrivatePrice)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Private:</span>{' '}
                          <span className="font-medium">{formatCurrency(pkg.privatePrice)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Max Guests:</span>{' '}
                          <span className="font-medium">{pkg.maxGuests}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Duration:</span>{' '}
                          <span className="font-medium">{pkg.duration}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time Slots View */}
        {activeView === 'time-slots' && (
          <div className="space-y-6">
            {/* Create New Time Slot Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowSlotForm(!showSlotForm)}>
                {showSlotForm ? '✕ Cancel' : '+ Add Time Slot'}
              </Button>
            </div>

            {/* Create Time Slot Form */}
            {showSlotForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Time Slot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Party Type *</label>
                        <select
                          value={newSlot.partyType}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, partyType: e.target.value as SlotPartyType }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        >
                          <option value="semi_private">Semi-Private</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Day Type *</label>
                        <select
                          value={newSlot.dayType}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, dayType: e.target.value as DayType }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        >
                          <option value="weekend">Weekend (Sat-Sun)</option>
                          <option value="weekday">Weekday (Mon-Fri)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Start Time *</label>
                        <input
                          type="time"
                          value={newSlot.startTime}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">End Time *</label>
                        <input
                          type="time"
                          value={newSlot.endTime}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, endTime: e.target.value }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Display Label (optional)</label>
                        <input
                          type="text"
                          value={newSlot.label}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="Auto-generated if empty"
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Sort Order</label>
                        <input
                          type="number"
                          value={newSlot.sortOrder}
                          onChange={(e) => setNewSlot((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="slot_is_active"
                        checked={newSlot.isActive}
                        onChange={(e) => setNewSlot((prev) => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded border-neutral-300"
                      />
                      <label htmlFor="slot_is_active" className="text-sm text-neutral-700">
                        Active (available for booking)
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                      <Button variant="outline" onClick={() => setShowSlotForm(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={createTimeSlot}
                        disabled={isCreatingSlot || !newSlot.startTime || !newSlot.endTime}
                      >
                        {isCreatingSlot ? 'Creating...' : 'Create Time Slot'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time Slots Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Party Booking Time Slots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Configure when parties can be booked. Time slots are organized by party type (Private/Semi-Private) and day type (Weekday/Weekend).
                  </p>
                </div>

                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500"></div>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-center py-8 text-neutral-600">
                    <p>No time slots configured.</p>
                    <p className="text-sm mt-2">Click "Add Time Slot" above to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group by party type and day type */}
                    {(['private', 'semi_private'] as const).map((partyType) => (
                      <div key={partyType} className="space-y-4">
                        <h3 className="text-lg font-bold text-charcoal-800 border-b pb-2">
                          {partyType === 'private' ? '🎉 Private Parties' : '👥 Semi-Private Parties'}
                        </h3>

                        {(['weekend', 'weekday'] as const).map((dayType) => {
                          const slots = timeSlots.filter(
                            (s) => s.party_type === partyType && s.day_type === dayType
                          );

                          if (slots.length === 0) return null;

                          return (
                            <div key={dayType} className="ml-4">
                              <h4 className="text-sm font-medium text-neutral-700 mb-2">
                                {dayType === 'weekend' ? '📅 Weekend (Sat-Sun)' : '📅 Weekday (Mon-Fri)'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {slots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`p-3 rounded-lg border ${
                                      slot.is_active
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-neutral-100 border-neutral-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium text-charcoal-800">{slot.label}</div>
                                        <div className="text-xs text-neutral-600">
                                          {slot.start_time} - {slot.end_time}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => toggleSlotStatus(slot)}
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            slot.is_active
                                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                                          }`}
                                        >
                                          {slot.is_active ? 'ON' : 'OFF'}
                                        </button>
                                        <button
                                          onClick={() => deleteTimeSlot(slot)}
                                          className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Show message if no slots for this party type */}
                        {timeSlots.filter((s) => s.party_type === partyType).length === 0 && (
                          <p className="ml-4 text-sm text-neutral-500 italic">
                            No time slots configured for {partyType === 'private' ? 'private' : 'semi-private'} parties.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* View Waiver Modal (read-only) */}
      <WaiverModal
        isOpen={viewingWaiverGuest !== null}
        onClose={() => setViewingWaiverGuest(null)}
        childName={viewingWaiverGuest?.name}
        signedDate={viewingWaiverGuest?.signedDate}
      />
    </div>
  );
}
