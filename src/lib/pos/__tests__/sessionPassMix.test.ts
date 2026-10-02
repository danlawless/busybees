import { describe, expect, it } from 'vitest';
import { countSessionsByPassKind } from '@/lib/pos/sessionPassMix';

const purchases = [
  { id: 'p10', type: 'day_pass', name: 'Punch Card (10 passes)' },
  { id: 'p5old', type: 'day_pass', name: 'Punch Card (10 passes) - Child' },
  { id: 'm1', type: 'monthly_pass', name: 'Monthly Membership - 1 Kid' },
  { id: 'fam', type: 'monthly_pass', name: 'Monthly Membership - Family (2 Kids)' },
  { id: 'day', type: 'day_pass', name: 'Day Pass' },
];

const customer = (purchaseIds: string[]) => ({
  purchases,
  activeSessions: purchaseIds.map((purchaseId, i) => ({ id: `s${i}`, purchaseId })),
});

describe('countSessionsByPassKind', () => {
  it('splits open sessions into punch card, monthly and other', () => {
    expect(
      countSessionsByPassKind([
        customer(['p10', 'p10', 'day']),
        customer(['fam', 'fam', 'm1']),
        customer(['p5old']),
      ])
    ).toEqual({ punch: 3, monthly: 3, other: 1 });
  });

  it('counts each child on a family membership as one session', () => {
    expect(countSessionsByPassKind([customer(['fam', 'fam'])]).monthly).toBe(2);
  });

  it('treats a session whose purchase is not loaded as other', () => {
    expect(countSessionsByPassKind([customer(['missing'])])).toEqual({ punch: 0, monthly: 0, other: 1 });
  });

  it('is zero for nobody checked in', () => {
    expect(countSessionsByPassKind([])).toEqual({ punch: 0, monthly: 0, other: 0 });
  });
});
