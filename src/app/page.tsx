import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { Hero } from '@/components/home/Hero'
import { Gallery } from '@/components/home/Gallery'
import { ReviewCTA } from '@/components/home/ReviewCTA'
import {
  PlayAreas,
  DayPasses,
  HomeParties,
  Membership,
  MoreWays,
  LocationHours,
} from '@/components/home/HomeSections'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function Home() {
  return (
    <Layout>
      <Hero />
      <PlayAreas />
      <DayPasses />
      <HomeParties />
      <Membership />
      <MoreWays />
      <Gallery />
      <ReviewCTA />
      <LocationHours />
    </Layout>
  )
}
