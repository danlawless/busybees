'use client'

import { Layout } from '@/components/layout/Layout'
import { OurStory } from '@/components/about/OurStory'
import { RulesAndWaiver } from '@/components/about/RulesAndWaiver'
import { NewsletterSection } from '@/components/about/CommunitySection'

export default function AboutPage() {
  return (
    <Layout>
      <OurStory />
      <RulesAndWaiver />
      <NewsletterSection />
    </Layout>
  )
}
