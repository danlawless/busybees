import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === 'route.ts' ? [p.split(sep).join('/')] : [];
  });
}

/**
 * Non-secret env defaults that existed before the admin shell work (public site URLs, a sender
 * display name, a repo slug). Format: 'path::ENV_NAME' -> reason. Never add a secret here.
 */
const ALLOWED_DEFAULTS: Record<string, string> = {
  'src/app/api/gift-cards/checkout/route.ts::NEXT_PUBLIC_SITE_URL': 'public site URL',
  'src/app/api/after-dark/book-pos/route.ts::NEXT_PUBLIC_SITE_URL': 'public site URL',
  'src/app/api/party-booking/create/route.ts::NEXT_PUBLIC_APP_URL': 'public site URL',
  'src/app/api/admin/party-bookings/[id]/apply-discount/route.ts::NEXT_PUBLIC_APP_URL': 'public site URL',
  'src/app/api/newsletter/config/route.ts::RESEND_FROM_EMAIL': 'sender display name and address, not a secret',
  'src/app/api/editor/github/route.ts::GITHUB_REPO': 'repository slug, not a secret',
};

const DOT_OR_BRACKET = /process\.env(?:\.(\w+)|\[\s*['"`](\w+)['"`]\s*\])\s*(?:\|\||\?\?)\s*['"`]/g;
const DESTRUCTURED_DEFAULT = /const\s*\{[^}]*\b(\w+)\s*=\s*['"`][^}]*\}\s*=\s*process\.env/g;

function fallbacks(src: string): string[] {
  const found: string[] = [];
  for (const m of src.matchAll(DOT_OR_BRACKET)) found.push(m[1] ?? m[2]);
  for (const m of src.matchAll(DESTRUCTURED_DEFAULT)) found.push(m[1]);
  return found;
}

describe('no hardcoded access secrets', () => {
  const files = routeFiles('src/app/api');

  it('scans the whole API tree', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain('src/app/api/editor/content/route.ts');
  });

  it('has no env fallback literals in any API route (except the allowlist)', () => {
    for (const f of files) {
      for (const name of fallbacks(readFileSync(f, 'utf8'))) {
        expect(ALLOWED_DEFAULTS[`${f}::${name}`], `${f} falls back to a literal for ${name}`).toBeTruthy();
      }
    }
  });

  it('detects the bracket and destructured forms', () => {
    expect(fallbacks(`const a = process.env['JWT_SECRET'] || 'x'`)).toEqual(['JWT_SECRET']);
    expect(fallbacks(`const { JWT_SECRET = 'x' } = process.env`)).toEqual(['JWT_SECRET']);
    expect(fallbacks(`const a = process.env.JWT_SECRET ?? ""`)).toEqual(['JWT_SECRET']);
    expect(fallbacks(`const a = process.env.JWT_SECRET`)).toEqual([]);
  });

  it('keeps the retired PIN patterns out', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/DEFAULT_STAFF_PIN/);
      expect(src, f).not.toMatch(/\.eq\('key',\s*'(admin_pin|staff_pin)'\)/);
    }
  });
});
