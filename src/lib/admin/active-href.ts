/** The nav href that owns this pathname: exact /admin root, otherwise the longest section prefix. */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  if (pathname === '/admin') return '/admin';
  return (
    hrefs
      .filter(h => h !== '/admin' && (pathname === h || pathname.startsWith(h + '/')))
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}
