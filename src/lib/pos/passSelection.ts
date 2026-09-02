/**
 * Child-first pass selection.
 *
 * Staff and customers pick the child who wants to play, then the kind of pass —
 * Day Pass, Punch Card or Monthly — and the right product and rate are derived
 * from the child's age. Nobody has to know which product corresponds to which
 * age band, which is where mis-sells came from.
 *
 * The age boundary itself lives in ageUtils (TODDLER_AGE_THRESHOLD), so moving
 * it moves every rate that depends on it at once.
 */

import {
  getAgeGroupFromBirthdate,
  getProductAgeGroup,
  type AgeGroup,
} from '@/lib/utils/ageUtils';

export type PassKind = 'day' | 'punch' | 'monthly';

export const PASS_KINDS: readonly PassKind[] = ['day', 'punch', 'monthly'] as const;

export const PASS_KIND_LABEL: Record<PassKind, string> = {
  day: 'Day Pass',
  punch: 'Punch Card',
  monthly: 'Monthly Pass',
};

/**
 * Sibling pricing is a per-visit, per-child concept, so it only applies to day
 * passes. Punch cards and monthly passes are bought per child at full price.
 */
export const SIBLING_PRICED_KINDS: readonly PassKind[] = ['day'] as const;

export interface SelectablePass {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  sessions_included?: number | null;
}

export interface ChildLike {
  id: string;
  name: string;
  birthdate: string;
  waiverSigned?: boolean;
}

export interface SiblingRule {
  child_position: number;
  discount_percent: number;
  is_active: boolean;
  applies_to_monthly_only: boolean;
}

/**
 * Passes that cover more than one child in a single product (the family pass,
 * and the legacy child+infant combo). The child-first flow prices siblings
 * itself, so these are excluded from per-child resolution.
 */
export function isMultiChildPass(productName: string): boolean {
  const name = productName.toLowerCase();
  const isCombo =
    (name.includes('child') || name.includes('toddler')) && name.includes('infant');
  return isCombo || name.includes('family');
}

/** Which of the three purchasable kinds this product is, if any. */
export function getPassKind(pass: SelectablePass): PassKind | null {
  const name = pass.name.toLowerCase();
  const category = (pass.category ?? '').toLowerCase();

  if (category === 'monthly' || name.includes('monthly') || name.includes('membership')) {
    return 'monthly';
  }
  if (name.includes('punch')) return 'punch';
  if (category === 'day') return 'day';
  return null;
}

/**
 * Every product of this kind that suits the child's age, best match first.
 *
 * Products naming an age band win over unrestricted ones, so today's
 * "Day Pass - Infant" is picked for an infant while a single flat "Day Pass"
 * serves every child once the age tiers retire. Ordering puts the most sessions
 * first so a 10-visit punch card leads a 5-visit one.
 */
export function resolvePassOptions(
  child: ChildLike,
  kind: PassKind,
  passes: readonly SelectablePass[]
): SelectablePass[] {
  const band: AgeGroup = getAgeGroupFromBirthdate(child.birthdate);

  const candidates = passes.filter(
    (p) => getPassKind(p) === kind && !isMultiChildPass(p.name)
  );

  const bandMatched = candidates.filter((p) => getProductAgeGroup(p.name) === band);
  const unrestricted = candidates.filter((p) => getProductAgeGroup(p.name) === null);
  const chosen = bandMatched.length > 0 ? bandMatched : unrestricted;

  return [...chosen].sort(
    (a, b) =>
      (b.sessions_included ?? 0) - (a.sessions_included ?? 0) || a.price - b.price
  );
}

/** The single best product of this kind for this child, or null if none fits. */
export function resolvePassForChild(
  child: ChildLike,
  kind: PassKind,
  passes: readonly SelectablePass[]
): SelectablePass | null {
  return resolvePassOptions(child, kind, passes)[0] ?? null;
}

export interface PricedLine {
  child: ChildLike;
  pass: SelectablePass;
  /** 1 for the first child in the visit, 2 for the next, and so on. */
  position: number;
  basePrice: number;
  discountPercent: number;
  price: number;
  /** Lines sharing a groupId are bought together on a single product. */
  groupId: string;
  /** This child is covered by another child's product at no extra charge. */
  includedFree: boolean;
}

export interface PassQuote {
  lines: PricedLine[];
  /** Children with no product of this kind available for their age. */
  unresolved: ChildLike[];
  total: number;
  savings: number;
  /** Distinct products in this quote — one charge is raised per product. */
  productCount: number;
}

/**
 * Price a group of children for one kind of pass.
 *
 * The most expensive child takes position 1, so a sibling discount always comes
 * off the cheaper pass and the family gets the better of the two orderings.
 */
export function quotePasses(
  children: readonly ChildLike[],
  kind: PassKind,
  passes: readonly SelectablePass[],
  siblingRules: readonly SiblingRule[],
  qualifiesForMemberPricing: boolean
): PassQuote {
  const comboLines: PricedLine[] = [];
  let remaining: readonly ChildLike[] = children;

  // A toddler-plus-infant combo isn't a positional sibling discount — it's its
  // own product where the infant plays free — so it has to be matched before
  // the sibling ladder is applied. Pair off as many toddler/infant couples as
  // the selection allows and price each pair on the combo. Once the combo
  // product retires this finds nothing and every child falls through to the
  // sibling ladder below.
  const combo = kind === 'day' ? findComboPass(passes) : null;
  if (combo) {
    const infants = children.filter((c) => getAgeGroupFromBirthdate(c.birthdate) === 'infant');
    const toddlers = children.filter((c) => getAgeGroupFromBirthdate(c.birthdate) === 'toddler');
    const pairCount = Math.min(infants.length, toddlers.length);
    const pairedIds = new Set<string>();

    for (let i = 0; i < pairCount; i++) {
      const toddler = toddlers[i];
      const infant = infants[i];
      const groupId = `combo-${i}`;
      pairedIds.add(toddler.id);
      pairedIds.add(infant.id);

      comboLines.push({
        child: toddler,
        pass: combo,
        position: 1,
        basePrice: combo.price,
        discountPercent: 0,
        price: combo.price,
        groupId,
        includedFree: false,
      });
      comboLines.push({
        child: infant,
        pass: combo,
        position: 2,
        basePrice: combo.price,
        discountPercent: 100,
        price: 0,
        groupId,
        includedFree: true,
      });
    }

    remaining = children.filter((c) => !pairedIds.has(c.id));
  }

  const resolved: { child: ChildLike; pass: SelectablePass }[] = [];
  const unresolved: ChildLike[] = [];

  for (const child of remaining) {
    const pass = resolvePassForChild(child, kind, passes);
    if (pass) resolved.push({ child, pass });
    else unresolved.push(child);
  }

  // Most expensive first, so the discount lands on the cheaper sibling. Ties
  // break by name so the order on screen stays put no matter which child was
  // tapped first — once the age tiers retire every pass costs the same and
  // every comparison is a tie.
  resolved.sort(
    (a, b) => b.pass.price - a.pass.price || a.child.name.localeCompare(b.child.name)
  );

  const discountByPosition = new Map<number, number>();
  if (SIBLING_PRICED_KINDS.includes(kind)) {
    for (const rule of siblingRules) {
      if (!rule.is_active) continue;
      if (rule.applies_to_monthly_only && !qualifiesForMemberPricing) continue;
      discountByPosition.set(rule.child_position, rule.discount_percent);
    }
  }

  const siblingLines: PricedLine[] = resolved.map(({ child, pass }, index) => {
    const position = index + 1;
    const discountPercent = discountByPosition.get(position) ?? 0;
    const price = round2(pass.price * (1 - discountPercent / 100));
    return {
      child,
      pass,
      position,
      basePrice: pass.price,
      discountPercent,
      price,
      groupId: `pass-${pass.id}`,
      includedFree: false,
    };
  });

  const lines = [...comboLines, ...siblingLines];
  const total = round2(lines.reduce((sum, l) => sum + l.price, 0));

  // What the same children would cost bought one at a time, so the saving
  // reflects both the combo and the sibling ladder.
  const listTotal = round2(
    lines.reduce((sum, l) => {
      if (!l.includedFree) return sum + l.basePrice;
      const standalone = resolvePassForChild(l.child, kind, passes);
      return sum + (standalone?.price ?? 0);
    }, 0)
  );

  return {
    lines,
    unresolved,
    total,
    savings: round2(listTotal - total),
    productCount: new Set(lines.map((l) => l.groupId)).size,
  };
}

/** The child-plus-infant combo product, if the catalogue still carries one. */
function findComboPass(passes: readonly SelectablePass[]): SelectablePass | null {
  return (
    passes.find((p) => {
      const name = p.name.toLowerCase();
      const isCombo =
        (name.includes('child') || name.includes('toddler')) && name.includes('infant');
      return isCombo && getPassKind(p) === 'day';
    }) ?? null
  );
}

export interface QuoteGroup {
  pass: SelectablePass;
  lines: PricedLine[];
  total: number;
  /** True when this group is one child+infant combo, which the purchase API
      already knows how to split across its two children. */
  isCombo: boolean;
}

/**
 * Group a quote's lines into the purchases that will be made. Each group is one
 * product bought once. Grouping is by groupId rather than product, so two
 * combo pairs stay two purchases instead of collapsing into one four-child
 * request the API would reject.
 */
export function groupQuoteByProduct(quote: PassQuote): QuoteGroup[] {
  const groups = new Map<string, { pass: SelectablePass; lines: PricedLine[] }>();

  for (const line of quote.lines) {
    const existing = groups.get(line.groupId);
    if (existing) existing.lines.push(line);
    else groups.set(line.groupId, { pass: line.pass, lines: [line] });
  }

  return [...groups.values()].map((g) => ({
    ...g,
    total: round2(g.lines.reduce((sum, l) => sum + l.price, 0)),
    isCombo: g.lines.some((l) => l.includedFree),
  }));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
