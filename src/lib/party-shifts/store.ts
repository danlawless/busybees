/**
 * Supabase implementation of the party shift store. Service-role client only:
 * party_shifts has RLS on and no policies.
 */

import type { createAdminClient } from '@/lib/supabase/server';
import type { BookingForShifts, RecordedShift } from '@/lib/party-shifts/plan';
import type { ShiftStore } from '@/lib/party-shifts/sync';

type Admin = ReturnType<typeof createAdminClient>;

type ShiftRow = {
  id: string;
  party_booking_id: string;
  slot: number;
  seven_shifts_shift_id: number | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'active' | 'deleted';
};

const toRecorded = (r: ShiftRow): RecordedShift => ({
  id: r.id,
  slot: r.slot as 1 | 2,
  sevenShiftsShiftId: r.seven_shifts_shift_id === null ? null : Number(r.seven_shifts_shift_id),
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status,
});

export function createSupabaseShiftStore(supabase: Admin): ShiftStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  return {
    async loadBookings(syncStartIso, todayEastern) {
      const { data, error } = await supabase
        .from('party_bookings')
        .select('id, status, party_date, start_time, end_time, package_name, guest_count, child_name')
        .gte('created_at', syncStartIso)
        .gte('party_date', todayEastern);
      fail('load party_bookings', error);
      return (data ?? []) as BookingForShifts[];
    },

    async loadShifts(bookingIds) {
      const map = new Map<string, RecordedShift[]>();
      if (bookingIds.length === 0) return map;
      const { data, error } = await supabase
        .from('party_shifts')
        .select('id, party_booking_id, slot, seven_shifts_shift_id, starts_at, ends_at, status')
        .in('party_booking_id', bookingIds);
      fail('load party_shifts', error);
      for (const row of (data ?? []) as ShiftRow[]) {
        map.set(row.party_booking_id, [...(map.get(row.party_booking_id) ?? []), toRecorded(row)]);
      }
      return map;
    },

    async upsertPending(bookingId, slot, window) {
      const { data, error } = await supabase
        .from('party_shifts')
        .upsert(
          {
            party_booking_id: bookingId,
            slot,
            seven_shifts_shift_id: null,
            starts_at: window.startsAt,
            ends_at: window.endsAt,
            status: 'pending',
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'party_booking_id,slot' }
        )
        .select('id, party_booking_id, slot, seven_shifts_shift_id, starts_at, ends_at, status')
        .single();
      fail('record pending shift', error);
      return toRecorded(data as ShiftRow);
    },

    async markActive(id, sevenShiftsShiftId, window) {
      const { error } = await supabase
        .from('party_shifts')
        .update({
          seven_shifts_shift_id: sevenShiftsShiftId,
          starts_at: window.startsAt,
          ends_at: window.endsAt,
          status: 'active',
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      fail('mark shift active', error);
    },

    async markDeleted(id) {
      const { error } = await supabase
        .from('party_shifts')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      fail('mark shift deleted', error);
    },

    async setError(id, message) {
      const { error } = await supabase
        .from('party_shifts')
        .update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', id);
      fail('record shift error', error);
    },
  };
}
