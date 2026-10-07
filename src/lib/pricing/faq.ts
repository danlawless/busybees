/**
 * FAQ answers that quote prices, written from the live catalogue.
 *
 * The /info FAQ used to hold its own copy of the admission and punch card
 * prices, in the visible answers and in the FAQPage structured data Google
 * reads. Neither moved on 1 October, so Google was being told $17 and
 * "punch cards never expire". These build the same sentences from the passes
 * and sibling discounts the checkout uses, so the answer is whatever is on sale.
 *
 * If the catalogue cannot be read, each falls back to a sentence with no
 * prices in it rather than an old one.
 */

import { dayPasses, punchCards, type CatalogPass } from '@/lib/pricing/catalog';
import { getProductAgeGroup, TODDLER_AGE_THRESHOLD } from '@/lib/utils/ageUtils';

export interface SiblingRuleLike {
  child_position: number;
  discount_percent: number;
  is_active: boolean;
  applies_to_monthly_only: boolean;
}

const ALL_DAY = 'A day pass gives all-day access to our play areas with no time limits.';

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function admissionAnswer(
  passes: readonly CatalogPass[],
  siblingRules: readonly SiblingRuleLike[]
): string {
  const day = dayPasses(passes);
  const infant = day.find((p) => getProductAgeGroup(p.name) === 'infant');
  const standard = day.find((p) => getProductAgeGroup(p.name) === null);
  if (!standard) return `See our current day pass prices above. ${ALL_DAY}`;

  const age = TODDLER_AGE_THRESHOLD;
  let answer = `A day pass is ${money(standard.price)} per child ages ${age} and up`;
  answer += infant ? `, and ${money(infant.price)} for babies under ${age}. ` : '. ';

  // Only a discount everyone gets belongs in a general admission answer.
  const second = siblingRules.find(
    (r) => r.child_position === 2 && r.is_active && !r.applies_to_monthly_only
  );
  if (second && second.discount_percent > 0) {
    answer += `Each additional sibling ages ${age} and up is ${second.discount_percent}% off. `;
  }

  return answer + ALL_DAY;
}

export function punchCardAnswer(passes: readonly CatalogPass[]): string {
  const cards = punchCards(passes);
  if (cards.length === 0) return 'See our current punch card options above.';

  const days = cards[0].duration ?? 365;
  const validity = days === 365 ? 'one year' : `${days} days`;
  const options = cards
    .map((c) => `${c.sessions_included} visits for ${money(c.price)}`)
    .join(' or ');

  return `Punch cards are good for ${validity} from purchase and are shared by all the children on your account: ${options}.`;
}
