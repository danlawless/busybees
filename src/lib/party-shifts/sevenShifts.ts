/**
 * Thin client for the 7shifts REST API v2, authenticated with a company
 * access token. Only what the party shifts sync needs.
 *
 * Endpoints confirmed against Busy Bees' account on 1 Oct 2026 (read-only):
 * GET /whoami, /company/{id}/locations, /departments, /roles, /shifts (with
 * start[gte]), /shifts/{id}. POST/PUT/DELETE are confirmed by the supervised
 * smoke test (scripts/party-shifts-smoke.ts).
 */

import type { PartyShiftsConfig } from '@/lib/party-shifts/config';

const API = 'https://api.7shifts.com/v2';

export interface SevenShiftsShift {
  id: number;
  start: string;
  end: string;
  user_id: number | null;
  notes: string | null;
  deleted?: boolean;
}

export class SevenShiftsError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SevenShiftsError';
    this.status = status;
  }
}

export interface SevenShiftsClient {
  createOpenShift(input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  getShift(id: number): Promise<SevenShiftsShift | null>;
  moveShift(id: number, input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  deleteShift(id: number): Promise<void>;
  findShiftsBetween(fromIso: string, toIso: string): Promise<SevenShiftsShift[]>;
  getUserName(userId: number): Promise<string>;
}

export function isHeld(shift: SevenShiftsShift): boolean {
  return typeof shift.user_id === 'number' && shift.user_id > 0;
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

export function createSevenShiftsClient(
  config: Pick<PartyShiftsConfig, 'token' | 'companyId' | 'locationId' | 'roleId' | 'departmentId'>,
  fetchImpl: typeof fetch = fetch
): SevenShiftsClient {
  const company = `${API}/company/${config.companyId}`;

  async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!response.ok) {
      throw new SevenShiftsError(response.status, `7shifts ${method} ${new URL(url).pathname} → ${response.status}: ${text.slice(0, 200)}`);
    }
    const json = text ? JSON.parse(text) : {};
    return (json.data ?? json) as T;
  }

  const shiftBody = (input: { startsAt: string; endsAt: string; notes: string }) => ({
    location_id: config.locationId,
    ...(config.departmentId ? { department_id: config.departmentId } : {}),
    role_id: config.roleId,
    start: input.startsAt,
    end: input.endsAt,
    open: true,
    open_offer_type: 1,
    draft: false,
    notes: input.notes,
  });

  return {
    createOpenShift: (input) => call<SevenShiftsShift>('POST', `${company}/shifts`, shiftBody(input)),

    async getShift(id) {
      try {
        const shift = await call<SevenShiftsShift>('GET', `${company}/shifts/${id}`);
        return shift.deleted ? null : shift;
      } catch (error) {
        if (error instanceof SevenShiftsError && error.status === 404) return null;
        throw error;
      }
    },

    moveShift: (id, input) =>
      call<SevenShiftsShift>('PUT', `${company}/shifts/${id}`, {
        start: input.startsAt,
        end: input.endsAt,
        notes: input.notes,
      }),

    async deleteShift(id) {
      try {
        await call<void>('DELETE', `${company}/shifts/${id}`);
      } catch (error) {
        if (error instanceof SevenShiftsError && error.status === 404) return;
        throw error;
      }
    },

    async findShiftsBetween(fromIso, toIso) {
      const params = new URLSearchParams({
        location_id: String(config.locationId),
        'start[gte]': fromIso,
        'start[lte]': toIso,
        limit: '200',
      });
      const shifts = await call<SevenShiftsShift[]>('GET', `${company}/shifts?${params}`);
      return (shifts ?? []).filter((s) => !s.deleted);
    },

    async getUserName(userId) {
      const user = await call<{ preferred_first_name?: string; first_name?: string; last_name?: string }>(
        'GET',
        `${company}/users/${userId}`
      );
      const first = titleCase(user.preferred_first_name || user.first_name || 'Someone');
      const last = user.last_name ? ` ${user.last_name.charAt(0).toUpperCase()}.` : '';
      return `${first}${last}`;
    },
  };
}
