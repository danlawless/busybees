import { describe, expect, it } from 'vitest';
import {
  calculateBookingPrice,
  ADDITIONAL_KIDS_PRICE,
  GROUP_RATE_PRICE_PER_CHILD,
  PACKAGE_PRICING,
} from '@/lib/validations/party-booking';

/**
 * The October 2026 party ladder.
 *
 * The tiers differ only by how many children they include, so the whole thing
 * rests on one invariant: each step up must cost less than buying the same
 * children as extras on the tier below. An earlier $525/$595/$675 set broke
 * exactly that way and made the dearer packages pointless, which is why these
 * tests assert the ordering rather than just the numbers.
 */
describe('party package ladder', () => {
  const priceFor = (pkg: 'basic_bee' | 'worker_bee' | 'queen_bee', guests: number) =>
    calculateBookingPrice(pkg, 'private', guests).totalPrice;

  it('prices each tier at its own included count', () => {
    expect(priceFor('basic_bee', 10)).toBe(500);
    expect(priceFor('worker_bee', 15)).toBe(550);
    expect(priceFor('queen_bee', 20)).toBe(600);
  });

  it('steps by an even $50', () => {
    expect(priceFor('worker_bee', 15) - priceFor('basic_bee', 10)).toBe(50);
    expect(priceFor('queen_bee', 20) - priceFor('worker_bee', 15)).toBe(50);
  });

  it('keeps every step cheaper than buying those children as extras', () => {
    // The invariant. A $50 step must stay under 5 x the additional-child rate,
    // or the cheaper package plus extras always wins and the ladder collapses.
    expect(50).toBeLessThan(5 * ADDITIONAL_KIDS_PRICE);
  });

  it('makes each tier the cheapest option in its own band', () => {
    // 10 children: Basic Bee
    expect(priceFor('basic_bee', 10)).toBeLessThan(priceFor('worker_bee', 10));

    // 15 children: Worker Bee+ — the party 87% of bookings actually are
    expect(priceFor('worker_bee', 15)).toBeLessThan(priceFor('basic_bee', 15));
    expect(priceFor('worker_bee', 15)).toBeLessThan(priceFor('queen_bee', 15));

    // 20 children: Queen Bee+
    expect(priceFor('queen_bee', 20)).toBeLessThan(priceFor('worker_bee', 20));
    expect(priceFor('queen_bee', 20)).toBeLessThan(priceFor('basic_bee', 20));
  });

  it('charges the additional-child rate past the included count', () => {
    expect(priceFor('basic_bee', 12)).toBe(500 + 2 * ADDITIONAL_KIDS_PRICE);
    expect(priceFor('worker_bee', 17)).toBe(550 + 2 * ADDITIONAL_KIDS_PRICE);
  });

  it('includes the counts the ladder is built on', () => {
    expect(PACKAGE_PRICING.basic_bee.includedKids).toBe(10);
    expect(PACKAGE_PRICING.worker_bee.includedKids).toBe(15);
    expect(PACKAGE_PRICING.queen_bee.includedKids).toBe(20);
  });
});

describe('group rate', () => {
  it('charges one flat rate per child regardless of age', () => {
    expect(GROUP_RATE_PRICE_PER_CHILD).toBe(15);
    expect(calculateBookingPrice('group_rate', 'private', 12).totalPrice).toBe(
      12 * GROUP_RATE_PRICE_PER_CHILD
    );
  });

  it('raises no package base price or additional-child charge', () => {
    const quote = calculateBookingPrice('group_rate', 'private', 20);
    expect(quote.basePrice).toBe(0);
    expect(quote.additionalKidsPrice).toBe(0);
    expect(quote.additionalKids).toBe(0);
  });
});
