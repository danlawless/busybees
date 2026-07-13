import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/server';
import { parseDateString } from '@/lib/utils';

// Always render per-request from the database; never statically prerender.
export const dynamic = 'force-dynamic';

// Brand colors are applied via inline styles rather than Tailwind arbitrary
// values (bg-[#...]) because those arbitrary utilities are not reliably emitted
// in this project's production Tailwind build — they render fine in dev but drop
// out in `next build`, which washed the header/button out in production.
const COLORS = {
  page: '#f5f0e1',
  brand: '#d97706',
  brandCream: '#fef3c7',
  detailBg: '#fefce8',
  detailBorder: '#fde68a',
  rsvpBg: '#f0f9ff',
  rsvpBorder: '#bae6fd',
  rsvpLabel: '#0369a1',
  link: '#0369a1',
};

const VENUE = {
  name: "Busy Bee's Indoor Play Center",
  plaza: 'Lunenburg Crossing',
  street: '301 Massachusetts Avenue Rt. 2A',
  cityStateZip: 'Lunenburg, MA 01462',
};
const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(
  `${VENUE.name}, ${VENUE.street}, ${VENUE.cityStateZip}`,
)}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InviteBooking {
  child_name: string;
  child_age: number | null;
  party_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
}

async function getBooking(id: string): Promise<InviteBooking | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createAdminClient();
  // Only invite-safe columns — never pricing, emails, or Stripe identifiers.
  const { data } = await supabase
    .from('party_bookings')
    .select('child_name, child_age, party_date, start_time, end_time, customer_name, customer_phone, status')
    .eq('id', id)
    .maybeSingle();
  return (data as InviteBooking | null) ?? null;
}

function firstName(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || name;
}

// "4" -> "4th Birthday", null/0 -> "Birthday"
function birthdayLabel(age: number | null): string {
  if (!age || age <= 0) return 'Birthday';
  const v = age % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][age % 10] || 'th';
  return `${age}${suffix} Birthday`;
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking || booking.status === 'cancelled') {
    return { title: 'Party Invitation • Busy Bees' };
  }
  const child = firstName(booking.child_name);
  const title = `You're invited to ${child}'s Birthday Party!`;
  const description = `Join us to celebrate ${child}'s ${birthdayLabel(booking.child_age)} at ${VENUE.name} on ${formatDate(
    booking.party_date,
  )}.`;
  return {
    title: `${title} • Busy Bees`,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) notFound();

  if (booking.status === 'cancelled') {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6 py-16"
        style={{ backgroundColor: COLORS.page }}
      >
        <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-soft">
          <div className="mb-4 text-5xl">🐝</div>
          <h1 className="mb-2 text-2xl font-bold text-charcoal-800">Invitation unavailable</h1>
          <p className="text-charcoal-600">
            This party invitation is no longer available. Please reach out to the party host or{' '}
            <a href="mailto:info@busybeesipc.com" className="font-semibold underline" style={{ color: COLORS.link }}>
              info@busybeesipc.com
            </a>{' '}
            with any questions.
          </p>
        </div>
      </main>
    );
  }

  const child = firstName(booking.child_name);
  const timeRange = `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`;
  const rsvpPhone = formatPhone(booking.customer_phone);
  const rsvpLine = rsvpPhone ? `${booking.customer_name} · ${rsvpPhone}` : booking.customer_name;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12" style={{ backgroundColor: COLORS.page }}>
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
          {/* Header */}
          <div className="px-6 py-8 text-center" style={{ backgroundColor: COLORS.brand }}>
            <div className="mx-auto mb-4 inline-block rounded-2xl bg-white px-5 py-3">
              <Image
                src="/busy-bees-logo.png"
                alt="Busy Bee's Indoor Play Center"
                width={200}
                height={98}
                style={{ width: 200, height: 'auto' }}
                priority
              />
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: '#ffffff' }}>
              You&apos;re Invited!
            </h1>
            <p className="mt-2 text-lg font-medium" style={{ color: COLORS.brandCream }}>
              Join us to celebrate {child}&apos;s {birthdayLabel(booking.child_age)}!
            </p>
          </div>

          {/* Details */}
          <div className="space-y-5 px-6 py-8 sm:px-8">
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: COLORS.detailBg, border: `1px solid ${COLORS.detailBorder}` }}
            >
              <dl className="space-y-3 text-[15px]">
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 font-medium text-charcoal-600">🗓️ When</dt>
                  <dd className="font-semibold text-charcoal-900">{formatDate(booking.party_date)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 font-medium text-charcoal-600">⏰ Time</dt>
                  <dd className="font-semibold text-charcoal-900">{timeRange}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 font-medium text-charcoal-600">📍 Where</dt>
                  <dd className="font-semibold text-charcoal-900">
                    {VENUE.name}
                    <span className="block font-normal text-charcoal-600">
                      {VENUE.plaza}
                      <br />
                      {VENUE.street}
                      <br />
                      {VENUE.cityStateZip}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="text-center">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full px-8 py-3.5 text-base font-bold shadow-md transition"
                style={{ backgroundColor: COLORS.brand, color: '#ffffff' }}
              >
                📍 Get Directions
              </a>
            </div>

            {/* RSVP */}
            <div
              className="rounded-2xl px-5 py-4 text-center"
              style={{ backgroundColor: COLORS.rsvpBg, border: `1px solid ${COLORS.rsvpBorder}` }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.rsvpLabel }}>
                Please RSVP
              </p>
              <p className="mt-1 font-semibold text-charcoal-900">{rsvpLine}</p>
            </div>

            {/* Questions */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-center">
              <p className="text-sm text-charcoal-600">
                Have a question for Busy Bees? Email{' '}
                <a href="mailto:info@busybeesipc.com" className="font-semibold hover:underline" style={{ color: COLORS.link }}>
                  info@busybeesipc.com
                </a>
              </p>
            </div>

            {/* Good to know */}
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="mb-3 font-bold text-charcoal-800">🐝 Good to Know</p>
              <ul className="space-y-2 text-sm text-charcoal-600">
                <li>🧦 Grip socks are required for everyone on the play floor (available to purchase if you forget).</li>
                <li>🅿️ Free parking is available at Lunenburg Crossing.</li>
                <li>📝 Upon arrival, please check in with the receptionist to sign a quick waiver.</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-6 text-center">
            <p className="font-semibold text-charcoal-800">We can&apos;t wait to play! 🎈🐝</p>
            <p className="mt-1 text-sm text-charcoal-500">📍 {VENUE.name}</p>
            <a href={siteUrl} className="text-sm font-medium" style={{ color: COLORS.brand }}>
              busybeesipc.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
