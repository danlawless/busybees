/**
 * Supervised live test of the 7shifts client: creates one clearly-labelled
 * test shift far in the future, reads it, finds it by date range, moves it,
 * deletes it. Always tries to delete the shift, even if a step fails.
 * Run only with Tim's OK:  npx -y tsx scripts/party-shifts-smoke.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSevenShiftsClient, isHeld } from '../src/lib/party-shifts/sevenShifts';

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])
);

const client = createSevenShiftsClient({
  token: env.SEVENSHIFTS_ACCESS_TOKEN,
  companyId: 404191,
  locationId: 490587,
  roleId: 2664998,
  departmentId: 779751,
});

async function main() {
  const notes = 'TEST — automated party shift check, will be deleted [bb:00000000-0000-0000-0000-000000000000:1]';
  const created = await client.createOpenShift({
    startsAt: '2027-01-10T14:00:00.000Z',
    endsAt: '2027-01-10T15:00:00.000Z',
    notes,
  });
  console.log('created', created.id, created.start, created.end);

  try {
    const read = await client.getShift(created.id);
    console.log('read back', read?.id, 'user_id:', read?.user_id, '| open:', read !== null && !isHeld(read));

    // The sync finds its own shifts by date range and the tag in the notes.
    const found = await client.findShiftsBetween('2027-01-10T05:00:00.000Z', '2027-01-11T05:00:00.000Z');
    const mine = found.find((s) => s.id === created.id);
    console.log('found in range:', mine !== undefined, '| notes returned:', mine?.notes === notes);
    const outside = await client.findShiftsBetween('2027-01-11T05:00:00.000Z', '2027-01-12T05:00:00.000Z');
    console.log('absent from next day (end of range honoured):', !outside.some((s) => s.id === created.id));

    const moved = await client.moveShift(created.id, {
      startsAt: '2027-01-10T15:00:00.000Z',
      endsAt: '2027-01-10T16:00:00.000Z',
      notes,
    });
    console.log('moved to', moved.start, moved.end, '| user_id:', moved.user_id, '| still open:', !isHeld(moved));
  } finally {
    await client.deleteShift(created.id);
    console.log('deleted; read now returns', await client.getShift(created.id));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
