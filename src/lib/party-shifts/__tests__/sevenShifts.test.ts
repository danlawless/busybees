import { describe, expect, it, vi } from 'vitest';
import { createSevenShiftsClient, isHeld, SevenShiftsError } from '@/lib/party-shifts/sevenShifts';

const CFG = { token: 'tok', companyId: 404191, locationId: 490587, roleId: 2664998, departmentId: 779751 };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );
}

describe('createSevenShiftsClient', () => {
  it('creates a published open shift for everyone to request', async () => {
    const f = fakeFetch(201, { data: { id: 77, start: 's', end: 'e', user_id: null, notes: 'n' } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    const shift = await client.createOpenShift({ startsAt: 's', endsAt: 'e', notes: 'n' });

    expect(shift.id).toBe(77);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.7shifts.com/v2/company/404191/shifts');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({
      location_id: 490587,
      department_id: 779751,
      role_id: 2664998,
      start: 's',
      end: 'e',
      open: true,
      open_offer_type: 1,
      draft: false,
      notes: 'n',
    });
  });

  it('gives every request a timeout signal', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const f = fakeFetch(200, { data: { id: 5, start: 's', end: 'e', user_id: null, notes: null } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    await client.getShift(5);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(15000);
    timeout.mockRestore();
  });

  it('returns null for a shift that is gone', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(404, { message: 'nope' }) as unknown as typeof fetch);
    expect(await client.getShift(5)).toBeNull();
  });

  it('returns null for a soft-deleted shift', async () => {
    const f = fakeFetch(200, { data: { id: 5, start: 's', end: 'e', user_id: null, notes: null, deleted: true } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    expect(await client.getShift(5)).toBeNull();
  });

  it('treats deleting a missing shift as done', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(404, {}) as unknown as typeof fetch);
    await expect(client.deleteShift(5)).resolves.toBeUndefined();
  });

  it('throws SevenShiftsError with the status on other failures', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(500, { message: 'boom' }) as unknown as typeof fetch);
    await expect(client.createOpenShift({ startsAt: 's', endsAt: 'e', notes: 'n' })).rejects.toMatchObject({
      name: 'SevenShiftsError',
      status: 500,
    });
    expect(new SevenShiftsError(429, 'x').status).toBe(429);
  });

  it('lists shifts in a time range for the location', async () => {
    const f = fakeFetch(200, { data: [{ id: 1, start: 's', end: 'e', user_id: 0, notes: null }] });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    const shifts = await client.findShiftsBetween('2026-10-18T04:00:00.000Z', '2026-10-19T04:00:00.000Z');
    expect(shifts).toHaveLength(1);
    const url = new URL((f.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toBe('/v2/company/404191/shifts');
    expect(url.searchParams.get('location_id')).toBe('490587');
    expect(url.searchParams.get('start[gte]')).toBe('2026-10-18T04:00:00.000Z');
    expect(url.searchParams.get('start[lte]')).toBe('2026-10-19T04:00:00.000Z');
  });

  it('formats a user name from 7shifts', async () => {
    const f = fakeFetch(200, { data: { preferred_first_name: 'JAMIE', last_name: 'SMITH' } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    expect(await client.getUserName(9)).toBe('Jamie S.');
  });
});

describe('isHeld', () => {
  it('is true only when a user holds the shift', () => {
    expect(isHeld({ id: 1, start: '', end: '', user_id: 42, notes: null })).toBe(true);
    expect(isHeld({ id: 1, start: '', end: '', user_id: 0, notes: null })).toBe(false);
    expect(isHeld({ id: 1, start: '', end: '', user_id: null, notes: null })).toBe(false);
  });
});
