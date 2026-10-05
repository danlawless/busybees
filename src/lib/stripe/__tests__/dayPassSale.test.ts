import { describe, expect, it } from 'vitest';
import { planDayPassSale, type DayPassChild } from '@/lib/stripe/dayPassSale';
import { CatalogPriceError, PRICE_CHANGED_ERROR } from '@/lib/stripe/catalogPrice';
import type { SiblingRule } from '@/lib/pos/passSelection';

// The live catalogue on 5 Oct 2026.
const passes = [
  { id: 'infant', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1 },
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'punch5', name: 'Punch Card (5 passes)', price: 90, category: 'day', sessions_included: 5 },
];
const half = (child_position: number): SiblingRule => ({
  child_position, discount_percent: 50, is_active: true, applies_to_monthly_only: false,
});
const rules = [half(2), half(3), half(4), half(5)];

// Ages relative to today, so the infant stays an infant whenever this runs.
const monthsAgo = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};
const kid = (id: string, months: number, waiverSigned = true): DayPassChild => ({ id, name: id, birthdate: monthsAgo(months), waiverSigned });
const will = kid('Will', 60);
const maggie = kid('Maggie', 40);
const baby = kid('Baby', 4);

const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof CatalogPriceError) return { status: e.status, message: e.message };
    throw e;
  }
  throw new Error('expected a refusal');
};

describe('planDayPassSale', () => {
  it('gives the second child half price, as at the front desk', () => {
    const sale = planDayPassSale([will, maggie], passes, rules, false, 30);
    expect(sale.total).toBe(30);
    expect(sale.lines.map((l) => [l.child.id, l.pass.id, l.price])).toEqual([
      ['Maggie', 'day', 20],
      ['Will', 'day', 10],
    ]);
    expect(sale.label).toBe('Day Passes × 2 (Maggie, Will)');
  });

  it('prices a baby on the infant rate, outside the sibling ladder', () => {
    const sale = planDayPassSale([will, maggie, baby], passes, rules, false, 40);
    expect(sale.lines.find((l) => l.child.id === 'Baby')).toMatchObject({ pass: { id: 'infant' }, price: 10 });
    expect(sale.total).toBe(40);
  });

  it('charges one child the full day pass', () => {
    const sale = planDayPassSale([will], passes, rules, false, 20);
    expect(sale.total).toBe(20);
    expect(sale.label).toBe('Day Pass (Will)');
  });

  it('refuses a total that is not the real one', () => {
    expect(refusal(() => planDayPassSale([will, maggie], passes, rules, false, 40))).toEqual({
      status: 409, message: PRICE_CHANGED_ERROR,
    });
    expect(refusal(() => planDayPassSale([will, maggie], passes, rules, false, 0.01)).status).toBe(409);
  });

  it('refuses a child without a signed waiver, by name', () => {
    expect(refusal(() => planDayPassSale([will, kid('Sam', 50, false)], passes, rules, false, 30)))
      .toEqual({ status: 400, message: 'Sam needs a signed waiver before a day pass can be bought.' });
  });

  it('refuses an empty selection and a child no day pass suits', () => {
    expect(refusal(() => planDayPassSale([], passes, rules, false, 0)).status).toBe(400);
    const onlyInfantPass = passes.filter((p) => p.id === 'infant');
    expect(refusal(() => planDayPassSale([will], onlyInfantPass, rules, false, 10)).status).toBe(400);
  });
});
