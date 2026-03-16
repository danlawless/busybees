'use client';

import { motion } from 'framer-motion';

export function ReviewCTA() {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-pastel-yellow">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            Enjoying Busy Bees?
          </h2>
          <p className="text-lg text-charcoal-600 mb-8 max-w-2xl mx-auto">
            We&apos;d love to hear about your experience! Your review helps other families discover
            the fun and lets us know how we&apos;re doing.
          </p>
          <a
            href="https://g.page/r/CbjlkAgAnnOKEBM/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-charcoal-800 hover:bg-charcoal-900 text-honey-400 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Please Leave Us a Review
          </a>
        </motion.div>
      </div>
    </section>
  );
}
