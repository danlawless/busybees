import { NextResponse } from 'next/server';

/** Retired: sign in through /admin/login. Removed entirely in Plan 2. */
export function POST() {
  return NextResponse.json({ error: 'gone', use: '/admin/login' }, { status: 410 });
}
