import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const files = [
  'src/app/api/auth/staff-login/route.ts',
  'src/app/api/editor/auth/route.ts',
  'src/app/api/admin/gift-cards/send-reminders/route.ts',
];

describe('no hardcoded access secrets', () => {
  it('has no default PIN, password or JWT secret literals', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/DEFAULT_STAFF_PIN/);
      expect(src, f).not.toMatch(/process\.env\.\w+\s*(\|\||\?\?)\s*['"`]/); // env fallback literal
      expect(src, f).not.toMatch(/\.eq\('key',\s*'(admin_pin|staff_pin)'\)/);
    }
  });
});
