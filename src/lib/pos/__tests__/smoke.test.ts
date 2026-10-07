import { describe, expect, it } from 'vitest';
import { getPassKind } from '@/lib/pos/passSelection';

describe('test harness', () => {
  it('resolves the @/ alias and imports project code', () => {
    expect(getPassKind({ id: '1', name: 'Punch Card (10 passes)', price: 170 })).toBe('punch');
  });
});
