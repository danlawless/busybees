'use client';

export function VideoSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-charcoal-800 mb-8">
          Take a Virtual Tour
        </h2>
        <div className="rounded-2xl overflow-hidden shadow-xl">
          {/* Desktop video */}
          <video
            className="w-full hidden sm:block"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source
              src="https://cdn-builttotal.b-cdn.net/wp-content/uploads/2026/02/Busy-Bees-321-Massachusetts-Ave-Lunenburg-desktop.mp4"
              type="video/mp4"
            />
          </video>
          {/* Mobile video */}
          <video
            className="w-full sm:hidden"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source
              src="https://cdn-builttotal.b-cdn.net/wp-content/uploads/2026/02/Busy-Bees-321-Massachusetts-Ave-Lunenburg-mobile.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </div>
    </section>
  );
}
