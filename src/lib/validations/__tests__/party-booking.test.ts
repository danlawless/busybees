import { describe, expect, it } from 'vitest';
import {
  calculateBookingPrice,
  ADDITIONAL_KIDS_PRICE,
  GROUP_RATE_PRICE_PER_CHILD,
  GROUP_RATE_PRIVATE_MINIMUM,
  GROUP_RATE_MIN_CHILDREN,
  GROUP_RATE_MAX_CHILDREN,
  calculateGroupRatePrice,
  PACKAGE_PRICING,
  includedKidsForBooking,
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

describe('included children for an existing booking', () => {
  const beforeCutover = new Date('2026-09-15T14:00:00-04:00');
  const afterCutover = new Date('2026-10-03T10:00:00-04:00');

  it('keeps the count a pre-October booking was quoted', () => {
    // Every Basic Bee party on the books was sold with 15 included. The ladder
    // drops that to 10, and charging those families $75 for "five extra" would
    // break the promise in the announcement that booked prices are locked in.
    expect(includedKidsForBooking('basic_bee', beforeCutover)).toBe(15);
    expect(includedKidsForBooking('worker_bee', beforeCutover)).toBe(15);
    expect(includedKidsForBooking('queen_bee', beforeCutover)).toBe(20);
  });

  it('uses the ladder for bookings made from 1 October', () => {
    expect(includedKidsForBooking('basic_bee', afterCutover)).toBe(
      PACKAGE_PRICING.basic_bee.includedKids
    );
    expect(includedKidsForBooking('worker_bee', afterCutover)).toBe(15);
    expect(includedKidsForBooking('queen_bee', afterCutover)).toBe(20);
  });

  it('cuts over at midnight Eastern, not UTC', () => {
    // 23:30 on 30 September in New York is already 1 October in UTC.
    expect(includedKidsForBooking('basic_bee', new Date('2026-09-30T23:30:00-04:00'))).toBe(15);
    expect(includedKidsForBooking('basic_bee', new Date('2026-10-01T00:00:00-04:00'))).toBe(10);
  });

  it('accepts the ISO string a database row carries', () => {
    expect(includedKidsForBooking('basic_bee', '2026-08-02T15:22:10.123+00:00')).toBe(15);
  });

  it('includes nobody for the group rate', () => {
    expect(includedKidsForBooking('group_rate', beforeCutover)).toBe(0);
    expect(includedKidsForBooking('group_rate', afterCutover)).toBe(0);
  });
});

describe('group rate with exclusive use', () => {
  it('charges per child when the group shares the floor', () => {
    expect(calculateGroupRatePrice(10, { exclusiveUse: false }).total).toBe(150);
    expect(calculateGroupRatePrice(30, { exclusiveUse: false }).total).toBe(450);
  });

  it('puts a floor under an exclusive booking', () => {
    // A private two-hour slot for ten children at $150 undercuts the identical
    // Basic Bee party at $500, and the $450 we have actually charged for a
    // private playgroup. The floor is that proven price.
    const small = calculateGroupRatePrice(10, { exclusiveUse: true });
    expect(small.total).toBe(GROUP_RATE_PRIVATE_MINIMUM);
    expect(small.minimumApplied).toBe(true);
  });

  it('charges per child once the group is big enough to clear the floor', () => {
    const full = calculateGroupRatePrice(30, { exclusiveUse: true });
    expect(full.total).toBe(450);
    expect(full.minimumApplied).toBe(false);

    const over = calculateGroupRatePrice(30, { exclusiveUse: true });
    expect(over.perChildTotal).toBe(30 * GROUP_RATE_PRICE_PER_CHILD);
  });

  it('never prices an exclusive booking below a shared one', () => {
    for (let n = GROUP_RATE_MIN_CHILDREN; n <= GROUP_RATE_MAX_CHILDREN; n++) {
      expect(calculateGroupRatePrice(n, { exclusiveUse: true }).total).toBeGreaterThanOrEqual(
        calculateGroupRatePrice(n, { exclusiveUse: false }).total
      );
    }
  });

  it('leaves the booking-flow quote per-child, since a booking is not exclusive use', () => {
    // party_type 'private' means a private party room, not the run of the
    // place -- a group booking is not automatically an exclusive hire.
    expect(calculateBookingPrice('group_rate', 'private', 12).totalPrice).toBe(180);
  });
});
