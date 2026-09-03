'use client';

/**
 * Who is playing on this punch card.
 *
 * A punch card belongs to the account, so tapping it asks which children are
 * here rather than assuming one. Two things on this screen carry money and are
 * shown rather than hidden: an under-1 takes the cheaper under-1 day rate
 * instead of a punch unless staff say otherwise, and when the card runs short
 * the remaining children roll into day passes at the price they are quoted.
 */

import { useMemo, useState } from 'react';
import {
  allocatePunches,
  type AllocationCandidate,
  type PunchAllocation,
} from '@/lib/pos/punchAllocation';
import type { ChildLike, SelectablePass, SiblingRule } from '@/lib/pos/passSelection';
import { getAgeGroupFromBirthdate } from '@/lib/utils/ageUtils';
import { formatCurrency } from '@/lib/utils/productHelpers';

interface PunchCardCheckInProps {
  purchase: { id: string; name: string; totalSessions: number; usedSessions: number };
  children: ChildLike[];
  childrenInsideIds: readonly string[];
  passes: readonly SelectablePass[];
  siblingRules: readonly SiblingRule[];
  qualifiesForMemberPricing: boolean;
  onConfirm: (allocation: PunchAllocation) => Promise<void>;
  onCancel: () => void;
  /**
   * Set when a previous attempt already bought day passes for this card but
   * failed to open sessions. Shown as a persistent banner so staff don't
   * lose that context once the one-time alert is dismissed.
   */
  notice?: string | null;
  /**
   * True together with `notice`: day passes are already bought and this
   * screen must not let staff change who's selected and buy them again.
   * Confirm still fires, but the parent ignores the recomputed allocation
   * and retries opening sessions against what was already purchased.
   */
  locked?: boolean;
}

export function PunchCardCheckIn({
  purchase,
  children,
  childrenInsideIds,
  passes,
  siblingRules,
  qualifiesForMemberPricing,
  onConfirm,
  onCancel,
  notice = null,
  locked = false,
}: PunchCardCheckInProps) {
  const inside = new Set(childrenInsideIds);

  // A child already inside cannot be checked in again, and only a waiver
  // signed (BOOLEAN DEFAULT FALSE, nullable) explicitly true clears them to
  // play — null and false both mean "not signed."
  const eligible = children.filter((c) => !inside.has(c.id) && c.waiverSigned === true);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => eligible.map((c) => c.id));
  const [preferPunchIds, setPreferPunchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const remaining = Math.max(0, purchase.totalSessions - purchase.usedSessions);

  const allocation = useMemo(() => {
    const candidates: AllocationCandidate[] = eligible
      .filter((c) => selectedIds.includes(c.id))
      .map((child) => ({ child, preferPunch: preferPunchIds.includes(child.id) }));
    return allocatePunches(candidates, remaining, passes, siblingRules, qualifiesForMemberPricing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, preferPunchIds, remaining, passes, siblingRules, qualifiesForMemberPricing]);

  const toggleChild = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const togglePreferPunch = (id: string) =>
    setPreferPunchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(allocation);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h3 className="text-2xl font-bold">Who&apos;s playing?</h3>
      <p className="text-lg text-gray-600">
        {purchase.name} · {remaining} {remaining === 1 ? 'punch' : 'punches'} left
      </p>

      {notice && (
        <p className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4 text-lg font-medium text-yellow-900">
          {notice}
        </p>
      )}

      {eligible.length === 0 && (
        <p className="text-lg text-gray-600">
          Everyone on this account is already checked in.
        </p>
      )}

      <div className="space-y-3">
        {eligible.map((child) => {
          const line = allocation.lines.find((l) => l.child.id === child.id);
          const isBaby = getAgeGroupFromBirthdate(child.birthdate) === 'infant';
          return (
            <div key={child.id} className="rounded-xl border-2 border-gray-200 p-4">
              <label className="flex items-center gap-3 text-xl font-medium">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={selectedIds.includes(child.id)}
                  onChange={() => toggleChild(child.id)}
                  disabled={locked}
                />
                {child.name}
                {/* While locked, the parent is replaying a fixed set of
                    already-bought entries -- this line's live price can
                    have gone stale (a re-search, another till) and must not
                    be shown next to the banner's authoritative figure. */}
                {line && !locked && (
                  <span className="ml-auto text-lg text-gray-600">
                    {line.method === 'punch' ? '1 punch' : formatCurrency(line.price)}
                  </span>
                )}
              </label>
              {isBaby && selectedIds.includes(child.id) && (
                <label className="mt-2 flex items-center gap-2 text-base text-gray-600">
                  <input
                    type="checkbox"
                    checked={preferPunchIds.includes(child.id)}
                    onChange={() => togglePreferPunch(child.id)}
                    disabled={locked}
                  />
                  Use a punch instead — the under-1 day rate is cheaper
                </label>
              )}
            </div>
          );
        })}
      </div>

      {allocation.unresolved.length > 0 && (
        <p className="text-lg text-red-600">
          No day pass is set up for {allocation.unresolved.map((c) => c.name).join(', ')}.
        </p>
      )}

      {/* While locked, this box's numbers come from a live recompute the
          parent is ignoring -- the notice banner above is the only figure
          that's actually authoritative, so this is suppressed rather than
          risk a staff member reading a stale total to a parent. */}
      {!locked && (
        <div className="rounded-xl bg-gray-50 p-4 text-lg">
          <p>
            {allocation.punchesSpent} {allocation.punchesSpent === 1 ? 'punch' : 'punches'} ·{' '}
            {remaining} left, {allocation.punchesRemainingAfter} after
          </p>
          {allocation.total > 0 && (
            <p className="font-bold">Day passes {formatCurrency(allocation.total)}</p>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-gray-300 p-4 text-xl"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={
            submitting ||
            (!locked && (allocation.lines.length === 0 || allocation.unresolved.length > 0))
          }
          className="flex-1 rounded-xl bg-yellow-400 p-4 text-xl font-bold disabled:opacity-50"
        >
          {submitting ? 'Checking in…' : locked ? 'Finish Check-In' : 'Confirm Check-In'}
        </button>
      </div>
    </div>
  );
}
