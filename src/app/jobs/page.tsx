'use client'

import { Layout } from '@/components/layout/Layout'
import { JobsHero } from '@/components/jobs/JobsHero'

export default function JobsPage() {
  return (
    <Layout>
      <JobsHero />

      {/* Google Form Embed Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
              Apply Now
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Ready to join the Busy Bees family? Fill out the application below and we'll be in touch!
            </p>
          </div>

          {/* Google Form Iframe */}
          <div className="bg-neutral-50 rounded-2xl p-6 shadow-lg">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSe5hl_gFRsCyN-dZwAJEFRp6hxeNkvIDJw5qpSVZoI-fmF3ug/viewform?embedded=true"
              width="100%"
              height="1200"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="rounded-lg"
            >
              Loading…
            </iframe>

            {/* Fallback Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 mb-2">
                Having trouble viewing the form?
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSe5hl_gFRsCyN-dZwAJEFRp6hxeNkvIDJw5qpSVZoI-fmF3ug/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Open Application in New Tab
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
