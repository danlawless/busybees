import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

type Result = { data?: unknown; error: { message: string } | null };

// A chainable stand-in for the Supabase query builder: records each table and
// terminal call, and answers from `responses` keyed by "table:operation".
const calls: string[] = [];
let responses: Record<string, Result> = {};

function query(table: string) {
  let op = 'select';
  const result = (): Result => responses[`${table}:${op}`] ?? { data: null, error: null };
  const builder = {
    select: () => builder,
    delete: () => {
      op = 'delete';
      return builder;
    },
    eq: () => builder,
    in: () => builder,
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
    responses = {};
  });

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
});
