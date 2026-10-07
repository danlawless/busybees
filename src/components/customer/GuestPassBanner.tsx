'use client';

/**
 * Guest pass line for My Account.
 * Shows a monthly member how many "bring a friend" passes they have left.
 * Renders nothing for non-members and on any failure.
 */

import { useEffect, useState } from 'react';

interface GuestPassStatus {
  open: boolean;
  hasMembership: boolean;
  allowance: number;
  remaining: number;
}

function isGuestPassStatus(value: unknown): value is GuestPassStatus {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.open === 'boolean' &&
    typeof v.hasMembership === 'boolean' &&
    typeof v.allowance === 'number' &&
    typeof v.remaining === 'number'
  );
}

export function GuestPassBanner({ customerId }: { customerId: string }) {
  const [status, setStatus] = useState<GuestPassStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/guest-passes?customer_id=${encodeURIComponent(customerId)}`);
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!cancelled && isGuestPassStatus(data)) setStatus(data);
      } catch {
        // Nothing to show if the status can't be loaded.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!status || !status.hasMembership) return null;

  const message = status.open
    ? `You have ${status.remaining} guest pass${status.remaining === 1 ? '' : 'es'} left this membership — bring a friend who's new to Busy Bees. Just tell the front desk.`
    : `From November 1st, bring a friend who's new to Busy Bees — ${status.allowance} free guest passes each membership.`;

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-400 px-4 py-2">
      <span className="text-xl">🐝</span>
      <span className="text-sm font-bold text-amber-900">{message}</span>
    </div>
  );
}
