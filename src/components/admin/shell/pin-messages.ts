const MISMATCH = "That code didn't match.";

export function pinErrorMessage(
  status: number,
  body: { remaining?: number; retryAfterSeconds?: number },
): string {
  if (status === 429) {
    return `Too many tries. Try again in ${Math.ceil((body.retryAfterSeconds ?? 600) / 60)} minutes.`;
  }
  if (status === 503) return 'No staff code is set yet. The owner sets the codes during setup.';
  if (status === 401) {
    const left = body.remaining;
    if (typeof left === 'number' && left <= 2) {
      return `${MISMATCH} ${left} ${left === 1 ? 'try' : 'tries'} left.`;
    }
    return MISMATCH;
  }
  if (status === 400) return MISMATCH;
  return 'Something went wrong. Please try again.';
}
