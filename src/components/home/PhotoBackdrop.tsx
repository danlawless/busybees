import Image from 'next/image'

/**
 * A photograph behind a homepage section, under a scrim that keeps the text on
 * top of it legible.
 *
 * The scrim is a vertical gradient rather than a flat wash, and the shape of it
 * is the whole trick: it holds near-solid through the top 15%, stays strong to
 * the 60% mark, and only then lets the picture through before closing up again
 * at the bottom. That strong zone is sized to cover a section header -- eyebrow,
 * heading and standfirst -- so their contrast never depends on what happens to
 * be behind them. An earlier, gentler gradient put the parties standfirst over a
 * dark pillar and the text lost its footing. The cards lower down are opaque, so
 * they can afford to let more of the photo show, and the near-solid edges melt
 * into the white or cream of the sections above and below, so a band reads as
 * part of the page rather than something pasted onto it.
 *
 * The stops are written out as a real gradient rather than assembled from
 * utility classes. Tailwind's arbitrary stop positions silently produced no
 * background at all here, which left three photographs running at full strength
 * under dark text -- a failure worth spending six lines to make impossible.
 *
 * Decorative only — these carry no information the copy does not already, so
 * they are hidden from assistive technology. None of them take `priority`: the
 * hero image is the page's LCP and should stay that way.
 */
export function PhotoBackdrop({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <Image src={src} alt="" fill className="object-cover object-center" sizes="100vw" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(255,253,247,0.96) 0%, rgba(255,253,247,0.93) 24%, rgba(255,248,231,0.78) 58%, rgba(255,253,247,0.94) 100%)',
        }}
      />
    </div>
  )
}
