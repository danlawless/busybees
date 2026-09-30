import { describe, expect, it } from 'vitest';
import { requiresChildSelection, hasAgeRestriction } from '@/lib/utils/ageUtils';

/**
 * A "Day Pass - Child (2+)" was sold twice on an account whose only child was
 * one year old, because the age check runs as `if (child_id && ...)` and no
 * child was attached — so it never ran. The customer paid $10 over the infant
 * rate each time. These tests pin down which products may not be sold without
 * naming a child.
 */
describe('requiresChildSelection', () => {
  it('requires a child for age-named day passes', () => {
    expect(requiresChildSelection('Day Pass - Child (2+)')).toBe(true);
    expect(requiresChildSelection('Day Pass - Infant')).toBe(true);
    expect(requiresChildSelection('Day Pass - Toddler')).toBe(true);
  });

  it('requires a child for age-named punch cards and memberships', () => {
    expect(requiresChildSelection('Punch Card (10 passes) - Toddler')).toBe(true);
    expect(requiresChildSelection('Punch Card (10 passes) - Infant')).toBe(true);
    expect(requiresChildSelection('Monthly Membership - Infant')).toBe(true);
  });

  it('does NOT require a child for the flat October products', () => {
    // From 1 October the age tiers retire and the names carry no age word, so
    // these must keep selling without a child — the account-wide punch card
    // has none by design.
    expect(requiresChildSelection('Day Pass')).toBe(false);
    expect(requiresChildSelection('Punch Card (10 passes)')).toBe(false);
    expect(requiresChildSelection('Punch Card (5 passes)')).toBe(false);
    expect(requiresChildSelection('Monthly Membership')).toBe(false);
  });

  it('does NOT require a child for non-pass products', () => {
    expect(requiresChildSelection('Queen Bee+ Party Package')).toBe(false);
    expect(requiresChildSelection('Juice Box')).toBe(false);
    expect(requiresChildSelection('Gift Card')).toBe(false);
  });

  it('leaves the combo pass alone, which validates ages in its own flow', () => {
    // hasAgeRestriction deliberately exempts the combo, and this must follow it
    // rather than diverge — the combo names two children, not one.
    expect(hasAgeRestriction('Child + Infant Discount')).toBe(false);
    expect(requiresChildSelection('Child + Infant Discount')).toBe(false);
  });

  it('tracks hasAgeRestriction exactly, so the two cannot drift apart', () => {
    const names = [
      'Day Pass - Child (2+)',
      'Day Pass',
      'Punch Card (10 passes)',
      'Punch Card (10 passes) - Infant',
      'Child + Infant Discount',
      'Queen Bee+ Party Package',
    ];
    for (const name of names) {
      expect(requiresChildSelection(name)).toBe(hasAgeRestriction(name));
    }
  });
});
