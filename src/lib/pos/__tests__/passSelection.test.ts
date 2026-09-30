import { describe, expect, it } from 'vitest';
import { punchCardOptions, type SelectablePass } from '@/lib/pos/passSelection';

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
