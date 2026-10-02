/**
 * Settings for the party shifts sync, from the environment. Off unless
 * SEVENSHIFTS_SYNC_MODE says otherwise; switched on, every required value
 * must be present or the job does nothing.
 */

export type SyncMode = 'off' | 'dry-run' | 'live';

export interface PartyShiftsConfig {
  mode: SyncMode;
  token: string;
  companyId: number;
  locationId: number;
  roleId: number;
  departmentId: number | null;
  alertEmail: string | null;
  syncStart: string;
}

const REQUIRED = [
  'SEVENSHIFTS_ACCESS_TOKEN',
  'SEVENSHIFTS_COMPANY_ID',
  'SEVENSHIFTS_LOCATION_ID',
  'SEVENSHIFTS_ROLE_ID',
  'SEVENSHIFTS_SYNC_START',
] as const;

export function loadPartyShiftsConfig(
  env: Record<string, string | undefined>
): { ok: true; config: PartyShiftsConfig } | { ok: false; mode: SyncMode; missing: string[] } {
  const rawMode = env.SEVENSHIFTS_SYNC_MODE?.trim();
  const mode: SyncMode = rawMode === 'dry-run' || rawMode === 'live' ? rawMode : 'off';
  if (mode === 'off') return { ok: false, mode, missing: [] };

  const value = (key: string) => env[key]?.trim() || '';
  const missing: string[] = REQUIRED.filter((key) => !value(key));

  const syncStartMs = Date.parse(value('SEVENSHIFTS_SYNC_START'));
  if (value('SEVENSHIFTS_SYNC_START') && Number.isNaN(syncStartMs)) missing.push('SEVENSHIFTS_SYNC_START');

  for (const key of ['SEVENSHIFTS_COMPANY_ID', 'SEVENSHIFTS_LOCATION_ID', 'SEVENSHIFTS_ROLE_ID']) {
    if (value(key) && !/^\d+$/.test(value(key))) missing.push(key);
  }

  if (missing.length > 0) return { ok: false, mode, missing };

  const department = value('SEVENSHIFTS_DEPARTMENT_ID');
  return {
    ok: true,
    config: {
      mode,
      token: value('SEVENSHIFTS_ACCESS_TOKEN'),
      companyId: Number(value('SEVENSHIFTS_COMPANY_ID')),
      locationId: Number(value('SEVENSHIFTS_LOCATION_ID')),
      roleId: Number(value('SEVENSHIFTS_ROLE_ID')),
      departmentId: /^\d+$/.test(department) ? Number(department) : null,
      alertEmail: value('PARTY_SHIFTS_ALERT_EMAIL') || null,
      syncStart: new Date(syncStartMs).toISOString(),
    },
  };
}
