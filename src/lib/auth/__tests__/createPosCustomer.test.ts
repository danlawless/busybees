import { describe, it, expect } from 'vitest';
import { posCustomerSchema } from '../createPosCustomer';

describe('posCustomerSchema', () => {
  it('normalizes a formatted phone to 10 digits and trims', () => {
    const r = posCustomerSchema.parse({ phone: '(555) 123-4567', name: ' Ana ', email: ' a@b.co ' });
    expect(r).toEqual({ phone: '5551234567', name: 'Ana', email: 'a@b.co' });
  });
  it('refuses a short phone', () => {
    expect(posCustomerSchema.safeParse({ phone: '555-1234', name: 'A', email: 'a@b.co' }).success).toBe(false);
  });
  it('refuses a bad email', () => {
    expect(posCustomerSchema.safeParse({ phone: '5551234567', name: 'A', email: 'nope' }).success).toBe(false);
  });
});
