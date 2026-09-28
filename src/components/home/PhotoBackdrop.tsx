import Image from 'next/image'

/**
 * A photograph behind a homepage section, under a scrim that keeps the text on
 * top of it legible.
 *
 * The scrim is a vertical gradient rather than a flat wash, and the shape of it
 * is the whole trick: it holds strong across the top, where a section header
 * sits, and opens up lower down, where the cards are opaque and can afford to
 * let the picture through. The near-solid edges melt into the white or cream of
 * the sections above and below, so a band reads as part of the page rather than
 * something pasted onto it.
 *
 * The stops are written out as a real gradient rather than assembled from
 * utility classes. Tailwind's arbitrary stop positions silently produced no
 * background at all here, which left three photographs running at full strength
 * under dark text -- a failure worth spending six lines to make impossible.
 *
 * Two tones, because the hero and the bands are not the same problem. The hero's
 * headline is huge and set in a heavy face, so it holds its own against far more
 * picture; a section standfirst is small, grey and much more easily lost.
 *
 * Decorative only — these carry no information the copy does not already, so
 * they are hidden from assistive technology. Only the hero takes `priority`:
 * it is the page's LCP, and the bands below should not compete for the network.
 */
const SCRIMS = {
  section:
    'linear-gradient(to bottom, rgba(255,253,247,0.88) 0%, rgba(255,253,247,0.82) 26%, rgba(255,248,231,0.52) 62%, rgba(255,253,247,0.88) 100%)',
  hero: 'linear-gradient(to bottom, rgba(255,253,247,0.72) 0%, rgba(255,253,247,0.62) 30%, rgba(255,248,231,0.42) 70%, rgba(255,253,247,0.80) 100%)',
} as const

export function PhotoBackdrop({
  src,
  tone = 'section',
  priority = false,
}: {
  src: string
  tone?: keyof typeof SCRIMS
  priority?: boolean
}) {
  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority={priority}
      />
      <div className="absolute inset-0" style={{ backgroundImage: SCRIMS[tone] }} />
    </div>
  )
}
