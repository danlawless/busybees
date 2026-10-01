import { describe, expect, it } from 'vitest';
import { admissionAnswer, punchCardAnswer, type SiblingRuleLike } from '@/lib/pricing/faq';
import type { CatalogPass } from '@/lib/pricing/catalog';

// The catalogue as it stands from 1 October 2026.
const PASSES: CatalogPass[] = [
  { id: 'baby', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1, duration: 30 },
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1, duration: 30 },
  { id: 'p5', name: 'Punch Card (5 passes)', price: 90, category: 'day', sessions_included: 5, duration: 365 },
  { id: 'p10', name: 'Punch Card (10 passes)', price: 170, category: 'day', sessions_included: 10, duration: 365 },
  { id: 'm1', name: 'Monthly Membership - 1 Kid', price: 65, category: 'monthly', sessions_included: 999, duration: 30 },
];

const HALF_OFF: SiblingRuleLike[] = [2, 3, 4, 5].map((child_position) => ({
  child_position,
  discount_percent: 50,
  is_active: true,
  applies_to_monthly_only: false,
}));

describe('admissionAnswer', () => {
  it('states the October rates and the sibling rule', () => {
    expect(admissionAnswer(PASSES, HALF_OFF)).toBe(
      'A day pass is $20 per child ages 1 and up, and $10 for babies under 1. ' +
        'Each additional sibling ages 1 and up is 50% off. ' +
        'A day pass gives all-day access to our play areas with no time limits.'
    );
  });

  it('leaves the sibling sentence out when no discount applies to everyone', () => {
    const membersOnly = HALF_OFF.map((r) => ({ ...r, applies_to_monthly_only: true }));
    expect(admissionAnswer(PASSES, membersOnly)).not.toMatch(/sibling/);
    expect(admissionAnswer(PASSES, [])).not.toMatch(/sibling/);
  });

  it('never claims infants play free', () => {
    expect(admissionAnswer(PASSES, HALF_OFF)).not.toMatch(/free/i);
  });

  it('falls back to a price-free answer when the catalogue is unavailable', () => {
    expect(admissionAnswer([], HALF_OFF)).toBe(
      'See our current day pass prices above. A day pass gives all-day access to our play areas with no time limits.'
    );
  });
});

describe('punchCardAnswer', () => {
  it('states validity, sharing and both cards, most visits first', () => {
    expect(punchCardAnswer(PASSES)).toBe(
      'Punch cards are good for one year from purchase and are shared by all the children on your account: ' +
        '10 visits for $170 or 5 visits for $90.'
    );
  });

  it('describes a validity that is not a whole year in days', () => {
    const ninety = PASSES.map((p) => (p.id.startsWith('p') ? { ...p, duration: 90 } : p));
    expect(punchCardAnswer(ninety)).toMatch(/^Punch cards are good for 90 days from purchase/);
  });

  it('falls back to a price-free answer when there are no punch cards', () => {
    expect(punchCardAnswer(PASSES.filter((p) => !p.name.includes('Punch')))).toBe(
      'See our current punch card options above.'
    );
  });
});
