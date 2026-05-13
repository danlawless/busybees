'use client'

import { Layout } from '@/components/layout/Layout'
import { OurStory } from '@/components/about/OurStory'
import { ReviewCTA } from '@/components/home/ReviewCTA'
import { SuggestionForm } from '@/components/about/SuggestionForm'

export default function AboutPage() {
  return (
    <Layout>
      <OurStory />
      <ReviewCTA />
      <SuggestionForm />
    </Layout>
  )
}
