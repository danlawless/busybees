import { describe, it, expect } from 'vitest';
import { toPackageKey } from '../packageKey';

describe('toPackageKey', () => {
  it('passes keys through', () => {
    expect(toPackageKey('queen_bee')).toBe('queen_bee');
    expect(toPackageKey('worker_bee')).toBe('worker_bee');
    expect(toPackageKey('basic_bee')).toBe('basic_bee');
  });

  it('maps friendly purchase names, including the October "+" names', () => {
    expect(toPackageKey('Queen Bee')).toBe('queen_bee');
    expect(toPackageKey('Queen Bee+')).toBe('queen_bee');
    expect(toPackageKey('Worker Bee+ Party Package')).toBe('worker_bee');
    expect(toPackageKey('Basic Bee')).toBe('basic_bee');
  });

  it('keeps the legacy synonyms the booking sync accepted', () => {
    expect(toPackageKey('Deluxe Party')).toBe('queen_bee');
    expect(toPackageKey('Classic Party')).toBe('worker_bee');
    expect(toPackageKey('Starter Party')).toBe('basic_bee');
    expect(toPackageKey('Semi-Private Party')).toBe('queen_bee');
  });

  it('returns null for something it cannot place', () => {
    expect(toPackageKey('Group Rate')).toBeNull();
  });
});
