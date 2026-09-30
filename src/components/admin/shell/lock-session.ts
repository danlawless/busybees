/** Ends the admin session. True only when the server confirmed it; a failed or unreachable call is false. */
export async function lockSession(fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn('/api/admin/session', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export const LOCK_FAILED = 'Could not lock. Try again.';
