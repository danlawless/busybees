import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { Hero } from '@/components/home/Hero'
import { Gallery } from '@/components/home/Gallery'
import { getAlbumImages } from '@/lib/album'
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
  // Read at build time — see the note in lib/album.ts about keeping this page static.
  const albumImages = getAlbumImages()

  return (
    <Layout>
      <Hero />
      <PlayAreas />
      <DayPasses />
      <HomeParties />
      <Membership />
      <MoreWays />
      <Gallery images={albumImages} />
      <ReviewCTA />
      <LocationHours />
    </Layout>
  )
}
