import { describe, expect, it } from 'vitest';
import { loadPartyShiftsConfig } from '@/lib/party-shifts/config';

const FULL = {
  SEVENSHIFTS_SYNC_MODE: 'dry-run',
  SEVENSHIFTS_ACCESS_TOKEN: 'tok',
  SEVENSHIFTS_COMPANY_ID: '404191',
  SEVENSHIFTS_LOCATION_ID: '490587',
  SEVENSHIFTS_ROLE_ID: '2664998',
  SEVENSHIFTS_DEPARTMENT_ID: '779751',
  PARTY_SHIFTS_ALERT_EMAIL: 'tim@busybeesipc.com',
  SEVENSHIFTS_SYNC_START: '2026-10-02T00:00:00Z',
};

describe('loadPartyShiftsConfig', () => {
  it('reads a complete configuration', () => {
    expect(loadPartyShiftsConfig(FULL)).toEqual({
      ok: true,
      config: {
        mode: 'dry-run',
        token: 'tok',
        companyId: 404191,
        locationId: 490587,
        roleId: 2664998,
        departmentId: 779751,
        alertEmail: 'tim@busybeesipc.com',
        syncStart: '2026-10-02T00:00:00.000Z',
      },
    });
  });

  it('defaults to off and needs nothing when off', () => {
    expect(loadPartyShiftsConfig({})).toEqual({ ok: false, mode: 'off', missing: [] });
  });

  it('lists what is missing when switched on', () => {
    const result = loadPartyShiftsConfig({ SEVENSHIFTS_SYNC_MODE: 'live' });
    expect(result).toEqual({
      ok: false,
      mode: 'live',
      missing: [
        'SEVENSHIFTS_ACCESS_TOKEN',
        'SEVENSHIFTS_COMPANY_ID',
        'SEVENSHIFTS_LOCATION_ID',
        'SEVENSHIFTS_ROLE_ID',
        'SEVENSHIFTS_SYNC_START',
      ],
    });
  });

  it('rejects an unknown mode as off', () => {
    expect(loadPartyShiftsConfig({ ...FULL, SEVENSHIFTS_SYNC_MODE: 'yes' })).toEqual({ ok: false, mode: 'off', missing: [] });
  });

  it('treats an unparseable start time as missing', () => {
    const result = loadPartyShiftsConfig({ ...FULL, SEVENSHIFTS_SYNC_START: 'soon' });
    expect(result).toMatchObject({ ok: false, missing: ['SEVENSHIFTS_SYNC_START'] });
  });

  it('allows no department and no alert email', () => {
    const { SEVENSHIFTS_DEPARTMENT_ID: _d, PARTY_SHIFTS_ALERT_EMAIL: _a, ...rest } = FULL;
    const result = loadPartyShiftsConfig(rest);
    expect(result).toMatchObject({ ok: true, config: { departmentId: null, alertEmail: null } });
  });
});
