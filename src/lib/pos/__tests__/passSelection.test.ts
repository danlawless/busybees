import { describe, expect, it } from 'vitest';
import {
  groupQuoteByProduct,
  punchCardOptions,
  quotePasses,
  type ChildLike,
  type SelectablePass,
  type SiblingRule,
} from '@/lib/pos/passSelection';

const CARDS: SelectablePass[] = [
  { id: 'p5', name: 'Punch Card (5 passes)', price: 90, category: 'weekly', sessions_included: 5 },
  { id: 'p10', name: 'Punch Card (10 passes)', price: 170, category: 'weekly', sessions_included: 10 },
  { id: 'd1', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'm1', name: 'Monthly Membership', price: 65, category: 'monthly', sessions_included: 999 },
];

describe('punchCardOptions', () => {
  it('returns only punch cards, most sessions first', () => {
    expect(punchCardOptions(CARDS).map((p) => p.id)).toEqual(['p10', 'p5']);
  });

  it('excludes day passes and memberships', () => {
    expect(punchCardOptions(CARDS).some((p) => p.id === 'd1' || p.id === 'm1')).toBe(false);
  });

  it('returns an empty list when the catalogue carries no punch card', () => {
    expect(punchCardOptions(CARDS.filter((p) => !p.name.includes('Punch')))).toEqual([]);
  });

  it('falls back to cheapest-first when sessions_included is missing', () => {
    // Documents why the POS must carry `sessions_included` through its own
    // API mapping and not rename it: with the primary sort key undefined the
    // list quietly reverses, putting the $90 5-punch card above the $170
    // 10-punch card and handing resolvePassForChild the wrong product.
    const unmapped: SelectablePass[] = CARDS.map((card) => ({
      id: card.id,
      name: card.name,
      price: card.price,
      category: card.category,
    }));
    expect(punchCardOptions(unmapped).map((p) => p.id)).toEqual(['p5', 'p10']);
  });
});

// ---------------------------------------------------------------------------
// October 1st rules, as set by Busy Bees on launch night (30 Sep 2026):
// - an infant (under 1) always pays the infant rate, never discounted;
// - the sibling half-price applies only to additional toddlers (1+);
// - monthly is chosen by head count: 1 Kid / Family (2 Kids) / Family (3+ Kids).
// ---------------------------------------------------------------------------

function birthdateYearsAgo(years: number, extraMonths = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return d.toISOString().slice(0, 10);
}

const OCT_PASSES: SelectablePass[] = [
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'baby', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1 },
  { id: 'm1', name: 'Monthly Membership - 1 Kid', price: 65, category: 'monthly', sessions_included: 999 },
  { id: 'm2', name: 'Monthly Membership - Family (2 Kids)', price: 105, category: 'monthly', sessions_included: 999 },
  { id: 'm3', name: 'Monthly Membership - Family (3+ Kids)', price: 135, category: 'monthly', sessions_included: 999 },
];

const HALF_OFF: SiblingRule[] = [2, 3, 4, 5].map((child_position) => ({
  child_position,
  discount_percent: 50,
  is_active: true,
  applies_to_monthly_only: false,
}));

const toddler = (id: string): ChildLike => ({ id, name: id, birthdate: birthdateYearsAgo(3) });
const infant = (id: string): ChildLike => ({ id, name: id, birthdate: birthdateYearsAgo(0, 6) });

const dayQuote = (children: ChildLike[]) =>
  quotePasses(children, 'day', OCT_PASSES, HALF_OFF, false);
const monthlyQuote = (children: ChildLike[]) =>
  quotePasses(children, 'monthly', OCT_PASSES, HALF_OFF, false);

describe('quotePasses: day passes from October 1st', () => {
  it('two toddlers: the second is half price', () => {
    expect(dayQuote([toddler('George'), toddler('Olivia')]).total).toBe(30);
  });

  it('two infants: $10 each, no discount', () => {
    expect(dayQuote([infant('A'), infant('B')]).total).toBe(20);
  });

  it('a toddler and an infant: $20 + $10', () => {
    expect(dayQuote([toddler('George'), infant('A')]).total).toBe(30);
  });

  it('an infant does not take a toddler\'s sibling position', () => {
    // Toddlers are $20 then $10; the infant is $10 whatever the order.
    expect(dayQuote([infant('A'), toddler('George'), toddler('Olivia')]).total).toBe(40);
  });

  it('two toddlers and two infants', () => {
    expect(dayQuote([toddler('G'), toddler('O'), infant('A'), infant('B')]).total).toBe(50);
  });
});

describe('quotePasses: monthly by head count', () => {
  it('one child is the 1 Kid membership', () => {
    const q = monthlyQuote([toddler('George')]);
    expect(q.total).toBe(65);
    expect(q.lines.map((l) => l.pass.id)).toEqual(['m1']);
  });

  it('two children are one Family (2 Kids) membership at $105', () => {
    const q = monthlyQuote([toddler('George'), toddler('Olivia')]);
    expect(q.total).toBe(105);
    expect(new Set(q.lines.map((l) => l.pass.id))).toEqual(new Set(['m2']));
    expect(q.productCount).toBe(1);
  });

  it('three children are one Family (3+ Kids) membership at $135', () => {
    const q = monthlyQuote([toddler('G'), toddler('O'), infant('A')]);
    expect(q.total).toBe(135);
    expect(new Set(q.lines.map((l) => l.pass.id))).toEqual(new Set(['m3']));
  });

  it('five children still use the 3+ membership', () => {
    const kids = ['a', 'b', 'c', 'd', 'e'].map(toddler);
    expect(monthlyQuote(kids).total).toBe(135);
  });

  it('the family membership is bought once, covering every child', () => {
    const groups = groupQuoteByProduct(monthlyQuote([toddler('George'), toddler('Olivia')]));
    expect(groups).toHaveLength(1);
    expect(groups[0].lines.map((l) => l.child.id).sort()).toEqual(['George', 'Olivia']);
    expect(groups[0].total).toBe(105);
  });

  it('shows the saving against two single memberships', () => {
    expect(monthlyQuote([toddler('George'), toddler('Olivia')]).savings).toBe(25);
  });
});
