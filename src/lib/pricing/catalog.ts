/**
 * One place to read prices from.
 *
 * Prices live in two authoritative stores and nowhere else:
 *
 *   - Passes (day passes, punch cards, memberships) live in the `passes` table.
 *     Editing a row changes the price everywhere, with no deploy.
 *   - Party packages live in PACKAGE_PRICING, because that is what
 *     calculateBookingPrice charges. Anything that shows a party price must
 *     read the same constant that takes the money.
 *
 * Marketing pages used to restate all of this in their own arrays, which meant
 * a price change had to be made in four places and the homepage quietly
 * advertised last month's rates when it wasn't. These helpers exist so a page
 * can render prices without ever holding its own copy.
 */

import {
  PACKAGE_PRICING,
  ADDITIONAL_KIDS_PRICE,
} from '@/lib/validations/party-booking';

/** A pass as the passes API returns it. */
export interface CatalogPass {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  sessions_included?: number | null;
  duration?: number | null;
}

export const ADDITIONAL_CHILD_PRICE = ADDITIONAL_KIDS_PRICE;

/**
 * Find one pass by category and a fragment of its name.
 *
 * Matching on a fragment rather than the exact string means a rename like
 * "Day Pass - Child (2+)" to "Day Pass" doesn't blank the row — the page keeps
 * rendering whatever the catalogue currently calls it.
 */
export function findPass(
  passes: readonly CatalogPass[],
  category: string,
  ...nameFragments: string[]
): CatalogPass | null {
  const wanted = nameFragments.map((f) => f.toLowerCase());
  return (
    passes.find((p) => {
      if (p.category !== category) return false;
      const name = p.name.toLowerCase();
      return wanted.every((f) => name.includes(f));
    }) ?? null
  );
}

/** Single-visit day passes, excluding punch cards, cheapest first. */
export function dayPasses(passes: readonly CatalogPass[]): CatalogPass[] {
  return passes
    .filter((p) => p.category === 'day' && !/punch/i.test(p.name))
    .sort((a, b) => a.price - b.price);
}

/** Punch cards, most sessions first. */
export function punchCards(passes: readonly CatalogPass[]): CatalogPass[] {
  return passes
    .filter((p) => /punch/i.test(p.name))
    .sort((a, b) => (b.sessions_included ?? 0) - (a.sessions_included ?? 0));
}

/** Monthly memberships, cheapest first. */
export function memberships(passes: readonly CatalogPass[]): CatalogPass[] {
  return passes
    .filter((p) => p.category === 'monthly')
    .sort((a, b) => a.price - b.price);
}

export interface PartyPackageDisplay {
  key: string;
  name: string;
  price: number;
  includedKids: number;
  maxGuests: number;
  duration: number;
  description: string;
  features: readonly string[];
}

/**
 * The bookable party packages, cheapest first, priced at the private rate that
 * customers are actually charged.
 *
 * Group rate is excluded: it is priced per child rather than as a package, so
 * it has no single price to show on a card.
 */
export function partyPackages(): PartyPackageDisplay[] {
  return Object.entries(PACKAGE_PRICING)
    .filter(([key, pkg]) => key !== 'group_rate' && 'includedKids' in pkg)
    .map(([key, pkg]) => {
      const withKids = pkg as typeof pkg & { includedKids: number };
      return {
        key,
        name: pkg.name,
        price: pkg.privatePrice,
        includedKids: withKids.includedKids,
        maxGuests: pkg.maxGuests,
        duration: pkg.duration,
        description: pkg.description,
        features: pkg.features,
      };
    })
    .sort((a, b) => a.price - b.price);
}

/**
 * How many children each package includes, phrased for display — the packages
 * differ only by this number, so it is the line that has to be right.
 */
export function includedKidsLabel(pkg: PartyPackageDisplay): string {
  return `Up to ${pkg.includedKids} kids · ${pkg.duration} hours`;
}

/** The sentence explaining what happens past the included count. */
export function additionalChildrenNote(pkg: PartyPackageDisplay): string {
  return `${pkg.includedKids} kids included. Additional kids are $${ADDITIONAL_CHILD_PRICE} each (maximum ${pkg.maxGuests} children total).`;
}
