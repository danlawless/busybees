/**
 * How the children checked in right now got in: on a punch card, on a monthly
 * membership, or on anything else (day passes, comps).
 *
 * Shown beside Today's Revenue on the admin dashboard: punch and membership
 * visits bring in no money on the day, so this is the part of the floor the
 * revenue figure does not account for.
 *
 * A session names the purchase it used; the purchase says what it was. Punch
 * cards are recognised by name, the same rule the POS and the database use to
 * scope them (see getPassKind in passSelection.ts).
 */

export interface PassMix {
  punch: number;
  monthly: number;
  other: number;
}

interface PurchaseLike {
  id: string;
  type: string;
  name: string;
}

interface CustomerLike {
  purchases: readonly PurchaseLike[];
  activeSessions?: readonly { purchaseId: string }[];
}

export function countSessionsByPassKind(customers: readonly CustomerLike[]): PassMix {
  const mix: PassMix = { punch: 0, monthly: 0, other: 0 };

  for (const customer of customers) {
    const byId = new Map(customer.purchases.map((p) => [p.id, p]));
    for (const session of customer.activeSessions ?? []) {
      const purchase = byId.get(session.purchaseId);
      if (purchase?.type === 'monthly_pass') mix.monthly += 1;
      else if (purchase && /punch/i.test(purchase.name)) mix.punch += 1;
      else mix.other += 1;
    }
  }

  return mix;
}
