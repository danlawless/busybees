'use client'

import { Layout } from '@/components/layout/Layout'
import { AboutHero } from '@/components/about/AboutHero'
import { OurStory } from '@/components/about/OurStory'

import { CommunitySection } from '@/components/about/CommunitySection'
import { PartyFAQ } from '@/components/parties/PartyFAQ'

export default function AboutPage() {
  return (
    <Layout>
      <AboutHero />
      <OurStory />
      {/* <ValuesSection /> */}
      {/* <TeamSection /> */}
      <CommunitySection />
      <PartyFAQ />
    </Layout>
  )
}
