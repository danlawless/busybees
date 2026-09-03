import { describe, expect, it } from 'vitest';
import { classifyPassScope } from '@/lib/utils/purchaseDefaults';

describe('classifyPassScope', () => {
  it('scopes a punch card to the whole account', () => {
    expect(classifyPassScope({ name: 'Punch Card (10 passes)', category: 'weekly' })).toBe('account');
  });

  it('scopes a day pass to one child', () => {
    expect(classifyPassScope({ name: 'Day Pass', category: 'day' })).toBe('child');
  });

  it('scopes a monthly pass to one child', () => {
    expect(classifyPassScope({ name: 'Monthly Membership', category: 'monthly' })).toBe('child');
  });

  it('fails safe to child when the product is missing', () => {
    expect(classifyPassScope(null)).toBe('child');
    expect(classifyPassScope(undefined)).toBe('child');
  });

  it('scopes a non-pass product (e.g. food/beverage) to one child', () => {
    expect(classifyPassScope({ name: 'Pretzel Bites', category: 'snack' })).toBe('child');
  });
});
