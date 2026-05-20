import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { WeekendBanner } from '@/components/home/WeekendBanner'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}
import { Hero } from '@/components/home/Hero'
import { AfterDarkBanner } from '@/components/home/AfterDarkBanner'
import { Gallery } from '@/components/home/Gallery'

export default function Home() {
  return (
    <Layout>
      <WeekendBanner />
      <AfterDarkBanner />
      <Hero />
      <Gallery />
    </Layout>
  )
}