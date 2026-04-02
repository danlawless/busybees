import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { WeekendBanner } from '@/components/home/WeekendBanner'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}
import { Hero } from '@/components/home/Hero'
import { Features } from '@/components/home/Features'
import { Gallery } from '@/components/home/Gallery'
import { ReviewCTA } from '@/components/home/ReviewCTA'
import { VideoSection } from '@/components/home/VideoSection'

export default function Home() {
  return (
    <Layout>
      <WeekendBanner />
      <Hero />
      <Gallery />
      <VideoSection />
      <Features />
      <ReviewCTA />
    </Layout>
  )
}