'use client'

import { Layout } from '@/components/layout/Layout'
import { AboutHero } from '@/components/about/AboutHero'
import { OurStory } from '@/components/about/OurStory'
import { TeamSection } from '@/components/about/TeamSection'
import { ValuesSection } from '@/components/about/ValuesSection'
import { CommunitySection } from '@/components/about/CommunitySection'

export default function AboutPage() {
  return (
    <Layout>
      <AboutHero />
      <OurStory />
      <ValuesSection />
      <TeamSection />
      <CommunitySection />
    </Layout>
  )
}
