/**
 * Pricing consistency check.
 *
 * Prices come from two stores: the `passes` table for day passes, punch cards
 * and memberships, and PACKAGE_PRICING in the code for party packages. A third
 * table, `party_packages`, is read by the customer account page, so it has to
 * agree with the code that charges.
 *
 * Run this after changing prices to confirm every store agrees and to see
 * exactly what each customer-facing surface will render:
 *
 *   npx tsx scripts/verify-pricing.ts
 *
 * Exits non-zero if anything disagrees, so it can gate a deploy.
 */

import { readFileSync } from 'fs';
import { PACKAGE_PRICING, ADDITIONAL_KIDS_PRICE } from '../src/lib/validations/party-booking';
import { partyPackages, dayPasses, punchCards, memberships, type CatalogPass } from '../src/lib/pricing/catalog';

const env: Record<string, string> = {};
readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function table<T>(name: string, select: string): Promise<T[]> {
  const res = await fetch(`${URL_BASE}/rest/v1/${name}?select=${select}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${name}: ${JSON.stringify(body)}`);
  return body as T[];
}

const problems: string[] = [];
const money = (n: number) => `$${Number(n).toFixed(2).replace(/\.00$/, '')}`;

async function main() {
  const passes = (await table<CatalogPass & { is_active: boolean }>(
    'passes',
    'id,name,price,category,sessions_included,is_active'
  )).filter((p) => p.is_active);

  const dbPackages = await table<{ name: string; base_price: number; capacity: number; is_active: boolean }>(
    'party_packages',
    'name,base_price,capacity,is_active'
  );

  const siblings = await table<{ child_position: number; discount_percent: number; is_active: boolean; applies_to_monthly_only: boolean }>(
    'sibling_discounts',
    'child_position,discount_percent,is_active,applies_to_monthly_only'
  );

  console.log('\n=== DAY PASSES  (passes table → homepage, My Account, POS) ===');
  for (const p of dayPasses(passes)) console.log(`  ${p.name.padEnd(42)} ${money(p.price)}`);

  console.log('\n=== PUNCH CARDS ===');
  for (const p of punchCards(passes)) console.log(`  ${p.name.padEnd(42)} ${money(p.price)}  (${p.sessions_included} visits)`);

  console.log('\n=== MEMBERSHIPS ===');
  for (const p of memberships(passes)) console.log(`  ${p.name.padEnd(42)} ${money(p.price)}`);

  console.log('\n=== SIBLING DISCOUNTS ===');
  for (const s of [...siblings].sort((a, b) => a.child_position - b.child_position)) {
    console.log(`  child ${s.child_position}: ${s.discount_percent}% off   active=${s.is_active}  members only=${s.applies_to_monthly_only}`);
  }

  console.log('\n=== PARTY PACKAGES  (PACKAGE_PRICING → homepage, /parties, booking, checkout) ===');
  const pkgs = partyPackages();
  for (const pkg of pkgs) {
    console.log(`  ${pkg.name.padEnd(14)} ${money(pkg.price).padStart(6)}   ${pkg.includedKids} included, max ${pkg.maxGuests}`);
  }
  console.log(`  Additional child: ${money(ADDITIONAL_KIDS_PRICE)}`);

  // The guest-count ladder only holds while stepping up costs less than buying
  // the same children as extras. Otherwise the dearer package is never worth it.
  console.log('\n=== LADDER CHECK ===');
  for (let i = 1; i < pkgs.length; i++) {
    const lower = pkgs[i - 1], upper = pkgs[i];
    const gap = upper.includedKids - lower.includedKids;
    const asExtras = lower.price + gap * ADDITIONAL_KIDS_PRICE;
    const ok = upper.price < asExtras;
    console.log(
      `  ${upper.name.padEnd(14)} ${money(upper.price)} vs ${lower.name} + ${gap} extras ${money(asExtras)}` +
      `  ${ok ? `OK (saves ${money(asExtras - upper.price)})` : 'DOMINATED'}`
    );
    if (!ok) problems.push(`${upper.name} costs ${money(upper.price)} but ${lower.name} plus ${gap} extra children is only ${money(asExtras)} — nobody should ever buy it.`);
  }

  // My Account reads party_packages; checkout reads PACKAGE_PRICING.
  console.log('\n=== party_packages TABLE vs PACKAGE_PRICING ===');
  for (const pkg of pkgs) {
    const row = dbPackages.find(
      (r) => r.is_active && r.name.toLowerCase().replace(/\+/g, '').trim() === pkg.name.toLowerCase().replace(/\+/g, '').trim()
    );
    if (!row) {
      console.log(`  ${pkg.name.padEnd(14)} no active row in party_packages`);
      problems.push(`${pkg.name} has no active row in party_packages — My Account will not list it.`);
      continue;
    }
    const priceOk = Number(row.base_price) === pkg.price;
    const capOk = Number(row.capacity) === pkg.includedKids;
    console.log(
      `  ${pkg.name.padEnd(14)} code ${money(pkg.price)}/${pkg.includedKids} kids   table ${money(row.base_price)}/${row.capacity} kids   ` +
      `${priceOk && capOk ? 'match' : 'MISMATCH'}`
    );
    if (!priceOk) problems.push(`${pkg.name}: party_packages says ${money(row.base_price)} but checkout charges ${money(pkg.price)}.`);
    if (!capOk) problems.push(`${pkg.name}: party_packages says ${row.capacity} included but the package includes ${pkg.includedKids}.`);
  }

  console.log('');
  if (problems.length === 0) {
    console.log('✅ Every price store agrees.\n');
    process.exit(0);
  }
  console.log(`❌ ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  problems.forEach((p) => console.log(`   • ${p}`));
  console.log('');
  process.exit(1);
}

main().catch((err) => {
  console.error('verify-pricing failed:', err.message);
  process.exit(1);
});
