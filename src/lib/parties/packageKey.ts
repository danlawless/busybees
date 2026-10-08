/**
 * Turn whatever names a party package -- the key ('queen_bee'), a purchase's
 * friendly name ('Queen Bee', 'Queen Bee+', 'Queen Bee Party Package') or an
 * old synonym -- into its package key.
 *
 * Purchases store friendly names; party_bookings and the confirmation email
 * work in keys. The booking sync has always translated; the confirmation email
 * did not, so a party scheduled from a bought package matched no package and
 * went out without its schedule, arrival, supplies or cancellation policy.
 * Both now use this.
 */

export type PackageKey = 'queen_bee' | 'worker_bee' | 'basic_bee';

export function toPackageKey(name: string): PackageKey | null {
  const n = name.toLowerCase();
  if (n.includes('queen') || n.includes('premium') || n.includes('deluxe')) return 'queen_bee';
  if (n.includes('worker') || n.includes('standard') || n.includes('classic')) return 'worker_bee';
  if (n.includes('basic') || n.includes('simple') || n.includes('starter')) return 'basic_bee';
  // Legacy party types: private was the top tier, semi-private the middle.
  // 'semi-private' contains 'private', so it lands on queen_bee, as it always has.
  if (n.includes('private')) return 'queen_bee';
  if (n.includes('semi')) return 'worker_bee';
  return null;
}
