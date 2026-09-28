import { PhotoBackdrop } from '@/components/home/PhotoBackdrop'

export function Hero() {
  return (
    // The hero is shaped to the photograph rather than the other way round.
    // object-cover fills the box and crops whatever overflows, so a 3:2 photo
    // in a short, wide hero loses its top and bottom -- which took the faces
    // off the two boys on a full-screen monitor, while a narrower window
    // looked fine. Matching the file's own ratio means nothing is ever cut.
    <section
      className="relative flex w-full items-center overflow-hidden min-h-[20rem]"
      style={{ aspectRatio: '1024 / 683' }}
    >
      {/* The hero is a photograph of the play floor and nothing else: no
          wordmark, no headline, no buttons, no flying bees. */}
      <PhotoBackdrop src="/images/backgrounds/hero-kids-climbing.jpg" tone="hero" priority />

      {/* Nothing is drawn over the photograph any more. The heading stays in
          the markup but out of sight: a page wants one h1, screen readers
          navigate by it, and this is the only place on the homepage that says
          in words what Busy Bees is. */}
      <h1 className="sr-only">
        Busy Bees Indoor Play Center — where little ones buzz, play and grow
      </h1>
    </section>
  )
}
