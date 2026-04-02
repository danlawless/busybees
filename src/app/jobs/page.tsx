import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { JobsHero } from '@/components/jobs/JobsHero'

export const metadata: Metadata = {
  title: 'Jobs & Careers',
  description: 'Join the Busy Bees team! Now hiring for play attendant, party host, and front desk positions at our indoor play center in Lunenburg, MA.',
  alternates: { canonical: '/jobs' },
  openGraph: {
    title: 'Jobs & Careers | Busy Bees Indoor Play Center',
    description: 'Now hiring at Busy Bees Indoor Play Center in Lunenburg, MA.',
  },
}

export default function JobsPage() {
  return (
    <Layout>
      <JobsHero />
    </Layout>
  )
}
