/**
 * Party Bookings Service Layer
 * CRUD operations and availability checking for party bookings
 */

import { createClient } from '../supabase/server';
import { createAdminClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import {
  CompleteBooking,
  calculateBookingPrice,
  getAvailableTimeSlots,
  isValidBookingDate,
} from '../validations/party-booking';
import { formatDateToYYYYMMDD, parseDateString } from '../utils';

type PartyBooking = Database['public']['Tables']['party_bookings']['Row'];
type PartyBookingInsert = Database['public']['Tables']['party_bookings']['Insert'];
type PartyBookingUpdate = Database['public']['Tables']['party_bookings']['Update'];

export interface TimeSlotAvailability {
  startTime: string;
  endTime: string;
  label: string;
  available: boolean;
  bookingId?: string;
}

export interface DateAvailability {
  date: string;
  hasPrivateSlots: boolean;
  hasSemiPrivateSlots: boolean;
  slots: TimeSlotAvailability[];
}

/**
 * Get a single party booking by ID
 */
export async function getPartyBooking(id: string): Promise<PartyBooking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching party booking:', error);
    return null;
  }

  return data;
}

/**
 * Get all bookings for a specific date
 */
export async function getBookingsForDate(date: string): Promise<PartyBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .eq('party_date', date)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for date:', error);
    return [];
  }

  return data || [];
}

/**
 * Get bookings for a date range (for calendar display)
 */
export async function getBookingsForDateRange(
  startDate: string,
  endDate: string
): Promise<PartyBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .gte('party_date', startDate)
    .lte('party_date', endDate)
    .neq('status', 'cancelled')
    .order('party_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for date range:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a specific time slot is available for booking
 */
export async function isTimeSlotAvailable(
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase
    .from('party_bookings')
    .select('id')
    .eq('party_date', date)
    .neq('status', 'cancelled')
    .or(
      `and(start_time.lte.${startTime},end_time.gt.${startTime}),` +
        `and(start_time.lt.${endTime},end_time.gte.${endTime}),` +
        `and(start_time.gte.${startTime},end_time.lte.${endTime})`
    );

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }

  return !data || data.length === 0;
}

/**
 * Get availability for a specific date with all time slots
 */
export async function getDateAvailability(
  date: string,
  partyType: 'private' | 'semi_private'
): Promise<TimeSlotAvailability[]> {
  // Use parseDateString to avoid UTC vs local timezone bug
  const dateObj = parseDateString(date);

  // Get possible time slots for this date and party type
  const possibleSlots = getAvailableTimeSlots(dateObj, partyType);

  if (possibleSlots.length === 0) {
    return [];
  }

  // Get existing bookings for this date
  const bookings = await getBookingsForDate(date);

  // Check availability for each slot
  const availability: TimeSlotAvailability[] = possibleSlots.map((slot) => {
    const conflictingBooking = bookings.find((booking) => {
      // Check for time overlap
      return (
        (slot.startTime >= booking.start_time && slot.startTime < booking.end_time) ||
        (slot.endTime > booking.start_time && slot.endTime <= booking.end_time) ||
        (slot.startTime <= booking.start_time && slot.endTime >= booking.end_time)
      );
    });

    return {
      ...slot,
      available: !conflictingBooking,
      bookingId: conflictingBooking?.id,
    };
  });

  return availability;
}

/**
 * Get availability for a month (for calendar display)
 */
export async function getMonthAvailability(
  year: number,
  month: number
): Promise<Map<string, DateAvailability>> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const startDateStr = formatDateToYYYYMMDD(startDate);
  const endDateStr = formatDateToYYYYMMDD(endDate);

  // Get all bookings for the month
  const bookings = await getBookingsForDateRange(startDateStr, endDateStr);

  const availabilityMap = new Map<string, DateAvailability>();

  // Iterate through each day in the month
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = formatDateToYYYYMMDD(currentDate);
    const dayBookings = bookings.filter((b) => b.party_date === dateStr);

    // Get slots for both party types
    const privateSlots = getAvailableTimeSlots(currentDate, 'private');
    const semiPrivateSlots = getAvailableTimeSlots(currentDate, 'semi_private');

    // Check availability
    const checkSlotAvailability = (
      slots: Array<{ startTime: string; endTime: string; label: string }>
    ): TimeSlotAvailability[] => {
      return slots.map((slot) => {
        const conflicting = dayBookings.find(
          (b) =>
            (slot.startTime >= b.start_time && slot.startTime < b.end_time) ||
            (slot.endTime > b.start_time && slot.endTime <= b.end_time) ||
            (slot.startTime <= b.start_time && slot.endTime >= b.end_time)
        );
        return {
          ...slot,
          available: !conflicting,
          bookingId: conflicting?.id,
        };
      });
    };

    const privateAvailability = checkSlotAvailability(privateSlots);
    const semiPrivateAvailability = checkSlotAvailability(semiPrivateSlots);

    availabilityMap.set(dateStr, {
      date: dateStr,
      hasPrivateSlots: privateAvailability.some((s) => s.available),
      hasSemiPrivateSlots: semiPrivateAvailability.some((s) => s.available),
      slots: [...privateAvailability, ...semiPrivateAvailability],
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availabilityMap;
}

/**
 * Create a new party booking
 */
export async function createPartyBooking(
  bookingData: CompleteBooking,
  customerId?: string
): Promise<PartyBooking> {
  const supabase = createAdminClient();

  // Calculate pricing
  const pricing = calculateBookingPrice(
    bookingData.packageName,
    bookingData.partyType,
    bookingData.guestCount
  );

  // Check availability first
  const isAvailable = await isTimeSlotAvailable(
    bookingData.partyDate,
    bookingData.startTime,
    bookingData.endTime
  );

  if (!isAvailable) {
    throw new Error('This time slot is no longer available');
  }

  // Validate booking date (at least 1 week in advance)
  // Use parseDateString to avoid UTC vs local timezone bug
  const partyDate = parseDateString(bookingData.partyDate);
  if (!isValidBookingDate(partyDate)) {
    throw new Error('Parties must be booked at least 1 week in advance');
  }

  const insertData: PartyBookingInsert = {
    customer_name: bookingData.customerName,
    customer_email: bookingData.customerEmail,
    customer_phone: bookingData.customerPhone,
    customer_address: bookingData.customerAddress,
    party_type: bookingData.partyType,
    package_name: bookingData.packageName,
    party_date: bookingData.partyDate,
    start_time: bookingData.startTime,
    end_time: bookingData.endTime,
    child_name: bookingData.childName,
    child_age: bookingData.childAge,
    guest_count: bookingData.guestCount,
    additional_kids: pricing.additionalKids,
    base_price: pricing.basePrice,
    additional_kids_price: pricing.additionalKidsPrice,
    total_price: pricing.totalPrice,
    status: 'pending',
    notes: bookingData.notes,
    customer_id: customerId,
  };

  const { data, error } = await supabase
    .from('party_bookings')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating party booking:', error);
    throw new Error('Failed to create party booking');
  }

  return data;
}

/**
 * Update a party booking
 */
export async function updatePartyBooking(
  id: string,
  updates: PartyBookingUpdate
): Promise<PartyBooking> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating party booking:', error);
    throw new Error('Failed to update party booking');
  }

  return data;
}

/**
 * Update booking with Stripe session ID
 */
export async function updateBookingWithStripeSession(
  bookingId: string,
  sessionId: string
): Promise<PartyBooking> {
  return updatePartyBooking(bookingId, {
    stripe_checkout_session_id: sessionId,
    payment_status: 'pending',
  });
}

/**
 * Confirm booking after successful payment
 */
export async function confirmBookingPayment(
  bookingId: string,
  paymentIntentId: string
): Promise<PartyBooking> {
  return updatePartyBooking(bookingId, {
    stripe_payment_intent_id: paymentIntentId,
    payment_status: 'paid',
    status: 'confirmed',
  });
}

/**
 * Cancel a party booking
 */
export async function cancelPartyBooking(id: string): Promise<PartyBooking> {
  return updatePartyBooking(id, { status: 'cancelled' });
}

/**
 * Get all bookings for a customer
 */
export async function getCustomerBookings(
  customerEmail: string
): Promise<PartyBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .eq('customer_email', customerEmail)
    .order('party_date', { ascending: false });

  if (error) {
    console.error('Error fetching customer bookings:', error);
    return [];
  }

  return data || [];
}

/**
 * Get upcoming confirmed bookings (for admin/staff)
 */
export async function getUpcomingBookings(limit = 10): Promise<PartyBooking[]> {
  const supabase = await createClient();
  const today = formatDateToYYYYMMDD(new Date());

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .gte('party_date', today)
    .in('status', ['pending', 'confirmed'])
    .order('party_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming bookings:', error);
    return [];
  }

  return data || [];
}

/**
 * Data needed to create/update a party booking from a purchase
 */
export interface PurchasePartyData {
  purchaseId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  packageName: string;
  price: number;
  partyDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  notes?: string;
}

/**
 * Create or update a party booking from a customer dashboard purchase
 * This syncs party scheduling data from the purchases table to party_bookings
 * so that it appears in the admin POS module.
 */
export async function createOrUpdateBookingFromPurchase(
  data: PurchasePartyData
): Promise<PartyBooking> {
  const supabase = createAdminClient();

  // Check if a booking already exists for this purchase
  const { data: existingBooking, error: findError } = await supabase
    .from('party_bookings')
    .select('*')
    .eq('purchase_id', data.purchaseId)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - that's expected for new bookings
    console.error('Error finding existing booking:', findError);
    throw new Error('Failed to check for existing booking');
  }

  // Map package name to party_bookings package format
  // The purchases store friendly names like "Queen Bee Party Package"
  // party_bookings expects: queen_bee, worker_bee, or basic_bee
  const packageNameLower = data.packageName.toLowerCase();
  let mappedPackageName: 'queen_bee' | 'worker_bee' | 'basic_bee' = 'basic_bee';
  if (packageNameLower.includes('queen')) {
    mappedPackageName = 'queen_bee';
  } else if (packageNameLower.includes('worker')) {
    mappedPackageName = 'worker_bee';
  }

  // Calculate additional kids count for planning purposes (staffing, supplies)
  // but use the actual purchase price - don't override what was paid
  const additionalKidsCount = Math.max(0, data.guestCount - 15);

  const bookingData: PartyBookingInsert | PartyBookingUpdate = {
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone,
    party_type: 'private' as const, // Default to private for dashboard bookings
    package_name: mappedPackageName,
    party_date: data.partyDate,
    start_time: data.startTime,
    end_time: data.endTime,
    child_name: 'TBD', // Customer will provide on party day
    child_age: null, // Will be updated when customer provides details
    guest_count: data.guestCount,
    additional_kids: additionalKidsCount,
    base_price: data.price, // Actual purchase price
    additional_kids_price: 0, // Already included in purchase price
    total_price: data.price, // Actual purchase price
    status: 'confirmed' as const, // Already paid via purchase
    payment_status: 'paid',
    notes: data.notes || null,
    customer_id: data.customerId,
    purchase_id: data.purchaseId,
  };

  if (existingBooking) {
    // Update existing booking
    const { data: updated, error: updateError } = await supabase
      .from('party_bookings')
      .update(bookingData)
      .eq('id', existingBooking.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating party booking from purchase:', updateError);
      throw new Error('Failed to update party booking');
    }

    return updated;
  } else {
    // Create new booking - bookingData already has all required fields including pricing
    const insertData: PartyBookingInsert = bookingData as PartyBookingInsert;

    const { data: created, error: createError } = await supabase
      .from('party_bookings')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating party booking from purchase:', createError);
      throw new Error('Failed to create party booking');
    }

    return created;
  }
}

/**
 * Get a party booking by purchase ID
 */
export async function getBookingByPurchaseId(purchaseId: string): Promise<PartyBooking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_bookings')
    .select('*')
    .eq('purchase_id', purchaseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No booking found for this purchase
      return null;
    }
    console.error('Error fetching booking by purchase ID:', error);
    return null;
  }

  return data;
}
