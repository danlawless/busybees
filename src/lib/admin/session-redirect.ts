/** Where an ended admin session is sent, remembering the page it was on. */
export function loginUrlFor(pathname: string): string {
  return '/admin/login?to=' + encodeURIComponent(pathname);
}

/**
 * Call on the response of any /api/admin/* fetch. On 401 (session ended) it
 * sends the browser to the login page and returns true so the caller can stop.
 */
export function redirectIfSessionEnded(res: Response): boolean {
  if (res.status !== 401) return false;
  window.location.href = loginUrlFor(window.location.pathname);
  return true;
}
