import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { parseDateString } from '@/lib/utils'
import type { Categorized, SchedulableEvent } from '@/lib/events/schedule'

export interface FeaturedEvent extends SchedulableEvent {
  id: string
  title: string
  is_bookable: boolean | null
}

/**
 * A single line above the hero saying what is on next.
 *
 * It sits inside the page rather than in the sticky header on purpose: the
 * header can already stack an announcement marquee and a promo banner, and a
 * third bar pinned to the top of the screen is one too many.
 *
 * Renders nothing at all when there is no event to name — an empty bar is
 * worse than no bar.
 */
export function FeaturedEventStrip({ event }: { event: Categorized<FeaturedEvent> | null }) {
  if (!event) return null

  const happeningNow = event.category === 'happening-now'
  const when = happeningNow
    ? 'On now'
    : parseDateString(event.event_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York',
      })

  return (
    <aside className="bg-honey-400/90 border-b border-honey-500/40">
      <Link
        href="/events"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-charcoal-900 transition-colors hover:bg-honey-400 sm:px-8 lg:px-12"
      >
        <CalendarDays className="h-4 w-4 flex-none" aria-hidden />
        <span className="text-sm font-bold uppercase tracking-wide">{when}</span>
        <span aria-hidden className="text-charcoal-900/40">&middot;</span>
        {/* Event titles are written by staff and often carry their own emoji,
            so the strip adds no decoration of its own. */}
        <span className="text-sm font-semibold">{event.title}</span>
        <span className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2">
          {event.is_bookable ? 'Book a place' : 'See details'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    </aside>
  )
}
