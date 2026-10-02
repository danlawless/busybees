import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

type Result = { data?: unknown; error: { message: string } | null };

// A chainable stand-in for the Supabase query builder: records each table and
// terminal call, and answers from `responses` keyed by "table:operation".
const calls: string[] = [];
const filters: { call: string; method: string; args: unknown[] }[] = [];
let responses: Record<string, Result> = {};

function query(table: string) {
  let op = 'select';
  const result = (): Result => responses[`${table}:${op}`] ?? { data: null, error: null };
  const record = (method: string, args: unknown[]) => {
    filters.push({ call: `${table}:${op}`, method, args });
    return builder;
  };
  const builder = {
    select: () => builder,
    delete: () => {
      op = 'delete';
      return builder;
    },
    eq: (...args: unknown[]) => record('eq', args),
    in: (...args: unknown[]) => record('in', args),
    gt: (...args: unknown[]) => record('gt', args),
    or: (...args: unknown[]) => record('or', args),
    limit: () => builder,
    single: () => Promise.resolve(result()),
    then: (resolve: (r: Result) => unknown) => {
      calls.push(`${table}:${op}`);
      return Promise.resolve(result()).then(resolve);
    },
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: (table: string) => query(table) }),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const { DELETE } = await import('./route');
const params = { params: Promise.resolve({ id: 'b1' }) };
const request = {} as NextRequest;

describe('DELETE /api/admin/party-bookings/[id]', () => {
  beforeEach(() => {
    calls.length = 0;
    filters.length = 0;
    responses = {};
  });

  const filtersFor = (call: string) =>
    filters.filter((f) => f.call === call).map((f) => [f.method, ...f.args]);

  it('refuses with 409 while the party has live shifts, deleting nothing', async () => {
    responses['party_shifts:select'] = { data: [{ id: 's1' }], error: null };
    const response = await DELETE(request, params);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/^This party has shifts in 7shifts\. Cancel the party first/);
    expect(calls).toEqual(['party_shifts:select']);
  });

  it('deletes as before when no shifts are live', async () => {
    responses['party_shifts:select'] = { data: [], error: null };
    responses['party_bookings:select'] = { data: { purchase_id: 'p1' }, error: null };
    const response = await DELETE(request, params);
    expect(response.status).toBe(200);
    expect(calls).toEqual(['party_shifts:select', 'party_shifts:delete', 'purchases:delete', 'party_bookings:delete']);
  });

  it('fails closed when the shift check errors', async () => {
    responses['party_shifts:select'] = { data: null, error: { message: 'db down' } };
    const response = await DELETE(request, params);
    expect(response.status).toBe(500);
    expect(calls).toEqual(['party_shifts:select']);
  });

  it('only blocks on pending or active shifts that start after now', async () => {
    responses['party_shifts:select'] = { data: [{ id: 's1' }], error: null };
    await DELETE(request, params);
    const check = filtersFor('party_shifts:select');
    expect(check).toContainEqual(['eq', 'party_booking_id', 'b1']);
    expect(check).toContainEqual(['in', 'status', ['pending', 'active']]);
    const gt = check.find((f) => f[0] === 'gt');
    expect(gt?.[1]).toBe('starts_at');
    expect(Number.isNaN(Date.parse(String(gt?.[2])))).toBe(false);
  });

  it('clears only deleted or started rows of this booking, never all rows', async () => {
    responses['party_shifts:select'] = { data: [], error: null };
    await DELETE(request, params);
    const clear = filtersFor('party_shifts:delete');
    expect(clear).toHaveLength(2);
    expect(clear[0]).toEqual(['eq', 'party_booking_id', 'b1']);
    const [method, expression] = clear[1];
    expect(method).toBe('or');
    expect(String(expression)).toMatch(/^status\.eq\.deleted,starts_at\.lte\.\d{4}-\d{2}-\d{2}T/);
  });

  it('uses the same instant for the check and the clearing step', async () => {
    responses['party_shifts:select'] = { data: [], error: null };
    await DELETE(request, params);
    const gt = filtersFor('party_shifts:select').find((f) => f[0] === 'gt');
    const or = filtersFor('party_shifts:delete').find((f) => f[0] === 'or');
    expect(String(or?.[1])).toBe(`status.eq.deleted,starts_at.lte.${String(gt?.[2])}`);
  });

  it('deletes a party whose only live rows have already started, clearing them first', async () => {
    // The started rows are still status active, but the check (starts_at > now) finds none.
    responses['party_shifts:select'] = { data: [], error: null };
    responses['party_bookings:select'] = { data: { purchase_id: null }, error: null };
    const response = await DELETE(request, params);
    expect(response.status).toBe(200);
    expect(calls).toEqual(['party_shifts:select', 'party_shifts:delete', 'party_bookings:delete']);
  });
});
