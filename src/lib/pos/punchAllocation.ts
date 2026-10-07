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
  isMultiChildPass,
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
  // Filter out multi-child products (combos, family packs) to prevent punch-covered
  // children from being folded into a joint product on behalf of a sibling who may
  // not be paying their half. This preserves the correct price for the day-pass
  // children even when the punch payer would have qualified for combo pricing.
  const singleChildPasses = passes.filter((p) => !isMultiChildPass(p.name));
  const quote = quotePasses(
    candidates.map((c) => c.child),
    'day',
    singleChildPasses,
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
    // Defensive: quotePasses guarantees every child is in either lines or unresolved,
    // never both, so !line alone would suffice. This double-check makes the intent explicit.
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

export interface DayPassGroup {
  pass: SelectablePass;
  lines: AllocationLine[];
  /** Sum of this group's line prices, rounded once. */
  total: number;
}

/**
 * Group an allocation's day-pass lines by the product they resolved to.
 *
 * allocatePunches resolves a day-pass product per child by age (quotePasses ->
 * resolvePassForChild), so an infant defaulting to the under-1 rate and an
 * older sibling shortfall in the same visit can land on two different
 * products. Charging and labeling that mixed group under just one child's
 * product would be wrong, so check-in must buy one purchase per product, not
 * one purchase for the whole shortfall.
 *
 * This keys by `pass.id`, not by quotePasses' own `groupId` (the way
 * groupQuoteByProduct does for a direct pass purchase) -- that is only safe
 * here because allocatePunches strips multi-child products (combos, family
 * packs) out of the passes it quotes before this ever sees a line. If that
 * filter is ever relaxed, two combo pairs sharing a groupId but resolving to
 * the same product id would silently collapse into one request the purchase
 * route rejects.
 */
export function groupDayPassLines(lines: readonly AllocationLine[]): DayPassGroup[] {
  const groups = new Map<string, { pass: SelectablePass; lines: AllocationLine[] }>();
  for (const line of lines) {
    if (line.method !== 'day_pass') continue;
    if (!line.pass) throw new Error(`No day pass resolved for ${line.child.name}`);
    const existing = groups.get(line.pass.id);
    if (existing) existing.lines.push(line);
    else groups.set(line.pass.id, { pass: line.pass, lines: [line] });
  }
  return [...groups.values()].map((g) => ({
    pass: g.pass,
    lines: g.lines,
    total: round2(g.lines.reduce((sum, l) => sum + l.price, 0)),
  }));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
