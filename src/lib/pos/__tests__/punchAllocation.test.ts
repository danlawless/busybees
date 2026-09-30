import { describe, expect, it } from 'vitest';
import { allocatePunches, groupDayPassLines } from '@/lib/pos/punchAllocation';
import type { ChildLike, SelectablePass, SiblingRule } from '@/lib/pos/passSelection';

// October 2026 catalogue: one flat day pass, one under-1 rate, no combo.
const PASSES: SelectablePass[] = [
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'baby', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1 },
];

// Legacy catalogue with combo product (may still exist at launch).
const PASSES_WITH_COMBO: SelectablePass[] = [
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'baby', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1 },
  { id: 'combo', name: 'Day Pass - Child + Infant', price: 20, category: 'day', sessions_included: 1 },
];

// 50% for everyone from the second child, per the October restructure.
const SIBLING_RULES: SiblingRule[] = [
  { child_position: 2, discount_percent: 50, is_active: true, applies_to_monthly_only: false },
  { child_position: 3, discount_percent: 50, is_active: true, applies_to_monthly_only: false },
];

// Ages are relative to the run, not fixed dates. A hardcoded birthdate makes a
// child a year older every year, so "Mia is under 1" would quietly stop being
// true and these tests would start asserting something else.
const monthsAgo = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};

// TODDLER_AGE_THRESHOLD is 2 today and 1 from October. These ages sit clear of
// both boundaries, so the tests mean the same thing either side of the change.
const ava: ChildLike = { id: 'a', name: 'Ava', birthdate: monthsAgo(52), waiverSigned: true };
const noah: ChildLike = { id: 'n', name: 'Noah', birthdate: monthsAgo(40), waiverSigned: true };
const mia: ChildLike = { id: 'm', name: 'Mia', birthdate: monthsAgo(8), waiverSigned: true };

const alloc = (
  candidates: { child: ChildLike; preferPunch?: boolean }[],
  punches: number
) => allocatePunches(candidates, punches, PASSES, SIBLING_RULES, false);

describe('allocatePunches', () => {
  it('spends a punch for each full-rate child when the card is deep enough', () => {
    const result = alloc([{ child: ava }, { child: noah }], 7);
    expect(result.lines.map((l) => l.method)).toEqual(['punch', 'punch']);
    expect(result.punchesSpent).toBe(2);
    expect(result.punchesRemainingAfter).toBe(5);
    expect(result.total).toBe(0);
  });

  it('defaults an under-1 to the day rate rather than a punch', () => {
    const result = alloc([{ child: ava }, { child: mia }], 7);
    const miaLine = result.lines.find((l) => l.child.id === 'm');
    expect(miaLine?.method).toBe('day_pass');
    expect(result.punchesSpent).toBe(1);
  });

  it('spends a punch on an under-1 when staff override', () => {
    const result = alloc([{ child: ava }, { child: mia, preferPunch: true }], 7);
    expect(result.lines.every((l) => l.method === 'punch')).toBe(true);
    expect(result.punchesSpent).toBe(2);
    expect(result.total).toBe(0);
  });

  it('sells a day pass for the shortfall when the card runs out', () => {
    const result = alloc([{ child: ava }, { child: noah }, { child: mia }], 2);
    expect(result.punchesSpent).toBe(2);
    expect(result.punchesRemainingAfter).toBe(0);
    const miaLine = result.lines.find((l) => l.child.id === 'm');
    expect(miaLine?.method).toBe('day_pass');
  });

  it('gives the shortfall child a sibling position behind the punch payers', () => {
    // Ava and Noah hold positions 1 and 2 on punches, so Mia is position 3 and
    // takes the 50% sibling rate off the $10 under-1 pass.
    const result = alloc([{ child: ava }, { child: noah }, { child: mia }], 2);
    expect(result.total).toBe(5);
  });

  it('spends nothing and charges everyone when the card is empty', () => {
    const result = alloc([{ child: ava }, { child: noah }], 0);
    expect(result.punchesSpent).toBe(0);
    expect(result.lines.every((l) => l.method === 'day_pass')).toBe(true);
    // Ava $20 at position 1, Noah 50% off $20 at position 2.
    expect(result.total).toBe(30);
  });

  it('never spends more punches than the card holds', () => {
    const result = alloc([{ child: ava }, { child: noah }, { child: mia, preferPunch: true }], 1);
    expect(result.punchesSpent).toBe(1);
    expect(result.punchesRemainingAfter).toBe(0);
  });

  it('reports a child with no day pass for their age as unresolved', () => {
    const result = allocatePunches([{ child: ava }], 0, [], SIBLING_RULES, false);
    expect(result.unresolved.map((c) => c.id)).toEqual(['a']);
    expect(result.lines).toEqual([]);
  });

  it('returns an empty allocation for an empty selection', () => {
    const result = alloc([], 10);
    expect(result.lines).toEqual([]);
    expect(result.punchesSpent).toBe(0);
    expect(result.total).toBe(0);
  });

  it('does not apply multi-child combo pricing to punch-covered children', () => {
    // Noah (toddler, 40mo) takes a punch. Mia (infant, 8mo) takes a day pass.
    // The combo product "Child + Infant" would normally pair them, giving Mia
    // a free slot (includedFree: true, price 0). But Noah is not buying his half,
    // so Mia gets the real under-1 rate at her sibling position: $10 at position 2
    // becomes $5 (50% off).
    const result = allocatePunches(
      [{ child: noah }, { child: mia }],
      1, // One punch available, goes to Noah
      PASSES_WITH_COMBO,
      SIBLING_RULES,
      false
    );
    const miaLine = result.lines.find((l) => l.child.id === 'm');
    expect(miaLine?.price).toBe(5);
  });
});

describe('groupDayPassLines', () => {
  it('gives each product resolved for a mixed-age shortfall its own group, with aligned prices', () => {
    // No punches: Ava (toddler) resolves to the flat day pass, Mia (infant)
    // resolves to the under-1 day pass -- two different products in one
    // shortfall, exactly the case a single grouped purchase would mislabel.
    const result = alloc([{ child: ava }, { child: mia }], 0);
    const groups = groupDayPassLines(result.lines);

    expect(groups).toHaveLength(2);

    const dayGroup = groups.find((g) => g.pass.id === 'day');
    expect(dayGroup?.lines.map((l) => l.child.id)).toEqual(['a']);
    expect(dayGroup?.lines.map((l) => l.price)).toEqual([20]);
    expect(dayGroup?.total).toBe(20);

    const babyGroup = groups.find((g) => g.pass.id === 'baby');
    // Mia holds sibling position 2 behind Ava, so the 50% rule applies to
    // her $10 under-1 rate.
    expect(babyGroup?.lines.map((l) => l.child.id)).toEqual(['m']);
    expect(babyGroup?.lines.map((l) => l.price)).toEqual([5]);
    expect(babyGroup?.total).toBe(5);
  });

  it('keeps a single-product shortfall as one group covering every child', () => {
    // No punches, both full-rate: Ava and Noah both resolve to the same flat
    // day pass.
    const result = alloc([{ child: ava }, { child: noah }], 0);
    const groups = groupDayPassLines(result.lines);

    expect(groups).toHaveLength(1);
    expect(groups[0].pass.id).toBe('day');
    expect(groups[0].lines.map((l) => l.child.id)).toEqual(['a', 'n']);
    // Ava full price at position 1, Noah 50% off at position 2.
    expect(groups[0].lines.map((l) => l.price)).toEqual([20, 10]);
    expect(groups[0].total).toBe(30);
  });

  it('ignores punch-covered lines and returns nothing when the whole visit is on punches', () => {
    const result = alloc([{ child: ava }, { child: noah }], 7);
    expect(groupDayPassLines(result.lines)).toEqual([]);
  });

  it('refuses to group a day-pass line with no resolved product', () => {
    const brokenLine = {
      child: ava,
      method: 'day_pass' as const,
      price: 20,
      pass: null,
    };
    expect(() => groupDayPassLines([brokenLine])).toThrow(/no day pass resolved/i);
  });
});
