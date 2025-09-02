'use client'

import { Layout } from '@/components/layout/Layout'
import { AboutHero } from '@/components/about/AboutHero'
import { OurStory } from '@/components/about/OurStory'
import { RulesAndWaiver } from '@/components/about/RulesAndWaiver'
import { NewsletterSection } from '@/components/about/CommunitySection'

export default function AboutPage() {
  return (
    <Layout>
      <AboutHero />
      <OurStory />
      <RulesAndWaiver />
      <NewsletterSection />
    </Layout>
  )
}
