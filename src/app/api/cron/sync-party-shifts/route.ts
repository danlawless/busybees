/**
 * Cron: keep 7shifts in step with party bookings.
 * Every 10 minutes. Protected by CRON_SECRET, like the other cron routes.
 * Off unless SEVENSHIFTS_SYNC_MODE is dry-run or live.
 * See docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { easternToday } from '@/lib/events/schedule';
import { loadPartyShiftsConfig } from '@/lib/party-shifts/config';
import { createSevenShiftsClient } from '@/lib/party-shifts/sevenShifts';
import { createSupabaseShiftStore } from '@/lib/party-shifts/store';
import { runPartyShiftSync } from '@/lib/party-shifts/sync';

const LEASE = 'party_shifts';
const LEASE_SECONDS = 300;

export const dynamic = 'force-dynamic';
// Must stay below LEASE_SECONDS so a run never outlives its lease.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error({}, 'Party shifts sync: CRON_SECRET not configured');
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loaded = loadPartyShiftsConfig(process.env);
  if (!loaded.ok) {
    if (loaded.mode === 'off') return NextResponse.json({ skipped: 'SEVENSHIFTS_SYNC_MODE is off' });
    logger.error({ missing: loaded.missing }, 'Party shifts sync: settings missing');
    return NextResponse.json({ error: 'Party shifts sync is misconfigured', missing: loaded.missing }, { status: 500 });
  }
  const { config } = loaded;
  const mode = config.mode === 'live' ? 'live' : 'dry-run';

  const supabase = createAdminClient();
  const { data: acquired, error: leaseError } = await supabase.rpc('try_acquire_sync_lease', {
    p_name: LEASE,
    p_seconds: LEASE_SECONDS,
  });
  if (leaseError) {
    logger.error({ error: leaseError }, 'Party shifts sync: could not take lease');
    return NextResponse.json({ error: 'Lease unavailable' }, { status: 500 });
  }
  if (acquired !== true) return NextResponse.json({ skipped: 'another run is in progress' });

  try {
    const summary = await runPartyShiftSync({
      store: createSupabaseShiftStore(supabase),
      client: createSevenShiftsClient(config),
      mode,
      now: new Date(),
      todayEastern: easternToday().date,
      syncStart: config.syncStart,
      sendAlert: async (alert) => {
        if (!config.alertEmail) {
          // Live mode cannot get here (config requires the address); fail
          // loudly if it ever does rather than count the alert as sent.
          if (mode === 'live') throw new Error('PARTY_SHIFTS_ALERT_EMAIL not set');
          logger.warn({ subject: alert.subject }, 'Party shifts sync: no PARTY_SHIFTS_ALERT_EMAIL, alert not sent');
          return;
        }
        const result = await sendEmail({ to: config.alertEmail, subject: alert.subject, text: alert.text });
        // sendEmail reports failure in its result rather than throwing; the
        // executor only records an undelivered alert when this throws.
        if (!result.success) throw new Error(result.error ?? 'email not sent');
      },
    });

    if (summary.errors.length > 0) {
      logger.error({ errors: summary.errors }, 'Party shifts sync: some actions failed');
      Sentry.captureMessage(`Party shifts sync: ${summary.errors.length} action(s) failed`, {
        level: 'error',
        extra: { errors: summary.errors },
      });
    }
    logger.info({ ...summary, planned: summary.planned.length }, 'Party shifts sync finished');
    return NextResponse.json(summary);
  } catch (error) {
    logger.error({ error }, 'Party shifts sync crashed');
    Sentry.captureException(error, { tags: { component: 'party-shifts-sync' } });
    return NextResponse.json({ error: 'Party shifts sync failed' }, { status: 500 });
  } finally {
    const { error: releaseError } = await supabase.rpc('release_sync_lease', { p_name: LEASE });
    if (releaseError) logger.warn({ error: releaseError }, 'Party shifts sync: lease release failed');
  }
}
