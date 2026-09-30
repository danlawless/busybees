export type PinChangeVerdict = 'ok' | 'invalid' | 'same-as-other';

/** Decide whether a requested access code change may proceed. `otherMatches` is true when the new code equals the other kind's current code. */
export function validatePinChange(kind: unknown, pin: unknown, otherMatches: boolean): PinChangeVerdict {
  if (kind !== 'staff' && kind !== 'admin') return 'invalid';
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return 'invalid';
  return otherMatches ? 'same-as-other' : 'ok';
}
