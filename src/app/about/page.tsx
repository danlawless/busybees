'use client'

import { Layout } from '@/components/layout/Layout'
import { OurStory } from '@/components/about/OurStory'
import { ValuesSection } from '@/components/about/ValuesSection'

export default function AboutPage() {
  return (
    <Layout>
      <OurStory />
      <ValuesSection />
    </Layout>
  )
}
