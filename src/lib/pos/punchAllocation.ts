/**
 * Who spends a punch, and what the rest pay.
 *
 * A punch card belongs to the account from 1 October 2026, so a visit is a set
 * of children drawing on one shared balance. Two things here carry money:
 *
 *   - An under-1 defaults to the under-1 day rate rather than a punch. A punch
 *     is worth $17 and the under-1 rate is $10, so spending one on a baby costs
 *     the family $7 without telling them. Staff can override per child.
 *   - Day passes for a shortfall are priced by quotePasses over the whole
 *     visit, punch payers included as position-holders that raise no charge.
 *     One family on one visit is one sibling ladder, and check-in never forms
 *     its own opinion about day pass pricing.
 */

import { getAgeGroupFromBirthdate } from '@/lib/utils/ageUtils';
import {
  quotePasses,
  type ChildLike,
  type SelectablePass,
  type SiblingRule,
} from '@/lib/pos/passSelection';

export interface AllocationCandidate {
  child: ChildLike;
  /** Staff chose to spend a punch on this under-1 anyway. */
  preferPunch?: boolean;
}

export type AllocationMethod = 'punch' | 'day_pass';

export interface AllocationLine {
  child: ChildLike;
  method: AllocationMethod;
  /** Charged now. Always 0 for a punch — the card was paid for already. */
  price: number;
  /** The day pass to buy, or null when a punch covers this child. */
  pass: SelectablePass | null;
}

export interface PunchAllocation {
  lines: AllocationLine[];
  punchesSpent: number;
  punchesRemainingAfter: number;
  /** Total to charge now, for the day passes only. */
  total: number;
  /** Children with no day pass in the catalogue for their age. */
  unresolved: ChildLike[];
}

export function allocatePunches(
  candidates: readonly AllocationCandidate[],
  punchesRemaining: number,
  passes: readonly SelectablePass[],
  siblingRules: readonly SiblingRule[],
  qualifiesForMemberPricing: boolean
): PunchAllocation {
  // An under-1 takes the cheaper day rate unless staff say otherwise.
  const wantsPunch = (c: AllocationCandidate): boolean =>
    c.preferPunch === true || getAgeGroupFromBirthdate(c.child.birthdate) !== 'infant';

  // Punches go out in display order, so the screen and the charge agree.
  let budget = Math.max(0, punchesRemaining);
  const punchIds = new Set<string>();
  for (const candidate of candidates) {
    if (budget === 0) break;
    if (!wantsPunch(candidate)) continue;
    punchIds.add(candidate.child.id);
    budget -= 1;
  }

  // Every child in the visit holds a sibling position, punch payers included.
  const quote = quotePasses(
    candidates.map((c) => c.child),
    'day',
    passes,
    siblingRules,
    qualifiesForMemberPricing
  );
  const quoted = new Map(quote.lines.map((l) => [l.child.id, l]));
  const unresolvedIds = new Set(quote.unresolved.map((c) => c.id));

  const lines: AllocationLine[] = [];
  const unresolved: ChildLike[] = [];

  for (const { child } of candidates) {
    if (punchIds.has(child.id)) {
      lines.push({ child, method: 'punch', price: 0, pass: null });
      continue;
    }
    const line = quoted.get(child.id);
    if (!line || unresolvedIds.has(child.id)) {
      unresolved.push(child);
      continue;
    }
    lines.push({ child, method: 'day_pass', price: line.price, pass: line.pass });
  }

  return {
    lines,
    punchesSpent: punchIds.size,
    punchesRemainingAfter: Math.max(0, punchesRemaining) - punchIds.size,
    total: round2(lines.reduce((sum, l) => sum + l.price, 0)),
    unresolved,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
