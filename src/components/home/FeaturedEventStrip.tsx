import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import type { Categorized, SchedulableEvent } from '@/lib/events/schedule'

export interface FeaturedEvent extends SchedulableEvent {
  id: string
  title: string
  is_bookable: boolean | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Turn a plain YYYY-MM-DD into "Mon, Oct 12".
 *
 * Deliberately never builds a local-time Date. This strip renders on the
 * server, which runs in UTC, so `new Date(2026, 9, 12)` was midnight UTC and
 * formatting that back into Eastern moved it to eight in the evening on the
 * 11th -- production advertised Bluey on Sunday the 11th for an event held on
 * Monday the 12th. A date with no time in it should never travel through a
 * timezone at all.
 */
function formatEventDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = DAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${weekday}, ${MONTHS[month - 1]} ${day}`
}

/**
 * A single line above the hero saying what is on next.
 *
 * It sits inside the page rather than in the sticky header on purpose: the
 * header can already stack an announcement marquee and a promo banner, and a
 * third bar pinned to the top of the screen is one too many.
 *
 * The colours and the spacing are inline styles rather than utility classes.
 * That is not a shortcut: `bg-honey-400/90`, `border-honey-500/40` and
 * `gap-x-3` were all silently dropped from the production stylesheet while the
 * rest of the file's classes generated fine, so the strip shipped unstyled --
 * the third time an opacity modifier has failed in this project. Anything this
 * component cannot render without is written where it cannot be dropped.
 *
 * Renders nothing at all when there is no event to name; an empty bar is worse
 * than no bar.
 */
export function FeaturedEventStrip({ event }: { event: Categorized<FeaturedEvent> | null }) {
  if (!event) return null

  const when = event.category === 'happening-now' ? 'On now' : formatEventDate(event.event_date)

  return (
    <aside style={{ backgroundColor: '#FFC933', borderBottom: '1px solid #E6A600' }}>
      <Link
        href="/events"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center px-6 py-2.5 text-charcoal-900 sm:px-8 lg:px-12"
        style={{ columnGap: '0.6rem', rowGap: '0.15rem' }}
      >
        <CalendarDays className="h-4 w-4 flex-none" aria-hidden />
        {/* Event titles are written by staff and often carry their own emoji,
            so the strip adds no decoration of its own. */}
        <span className="text-sm font-bold">{event.title}</span>
        <span aria-hidden style={{ color: '#8A6A00' }}>&middot;</span>
        <span className="text-sm">{when}</span>
        <span aria-hidden style={{ color: '#8A6A00' }}>&middot;</span>
        <span className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2">
          {event.is_bookable ? 'Register Now' : 'See details'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    </aside>
  )
}
