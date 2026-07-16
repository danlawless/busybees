'use client';

import { motion } from 'framer-motion';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CbjlkAgAnnOKEBM/review';

/**
 * Review blurbs shown on the homepage. Replace the text/names below with your
 * real Google reviews (copy them straight from your Google Business profile),
 * or wire up the Google Places API to feed them in automatically.
 */
const reviews = [
  {
    quote:
      "Finally a spot built for the under-6 crowd. It's spotless, the staff are so warm, and my toddler naps like a champ afterward.",
    name: 'Sarah M.',
    tag: 'Local parent',
  },
  {
    quote:
      "We booked a birthday party and everything was handled. I actually got to enjoy my son's day instead of running around.",
    name: 'Jamie D.',
    tag: 'Party host',
  },
  {
    quote:
      "The membership pays for itself. Rainy day? Busy Bees. Too hot out? Busy Bees. It's become our happy place.",
    name: 'Alex R.',
    tag: 'Member family',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ReviewCTA() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-pastel-yellow">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <motion.div
          className="mx-auto max-w-2xl text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block rounded-full border border-honey-200 bg-honey-100/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-honey-700">
            Loved by local families
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-charcoal-800">
            See what all the buzz is about
          </h2>
          <p className="mt-4 text-lg text-charcoal-600">
            Here&apos;s what Lunenburg families are saying about Busy Bees on Google.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="flex h-full flex-col rounded-2xl border border-primary-200/30 bg-white p-6 shadow-soft"
            >
              <div className="text-lg tracking-widest text-honey-400" aria-label="Rated 5 out of 5 stars">
                ★★★★★
              </div>
              <blockquote className="mt-3 flex-1 text-charcoal-700">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-honey-100 font-bold text-honey-700">
                  {initials(r.name)}
                </span>
                <span>
                  <span className="block font-semibold text-charcoal-800">{r.name}</span>
                  <span className="block text-sm text-charcoal-500">{r.tag}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-charcoal-800 px-8 py-4 text-lg font-bold text-honey-400 shadow-lg transition-all duration-300 hover:bg-charcoal-900 hover:shadow-xl"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Review us on Google
          </a>
        </motion.div>
      </div>
    </section>
  );
}
