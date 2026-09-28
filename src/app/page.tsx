import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { featuredEvent } from '@/lib/events/schedule'
import { FeaturedEventStrip, type FeaturedEvent } from '@/components/home/FeaturedEventStrip'
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

// The featured event is read on the server, so the strip is in the first
// painted frame rather than appearing a moment later and shoving the hero
// down the page. Ten minutes is soon enough for an event published today.
export const revalidate = 600

async function getFeaturedEvent() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, event_date_end, event_time_start, event_time_end, is_bookable')
      .eq('status', 'published')
      .order('event_date', { ascending: true })

    if (error || !data) return null
    return featuredEvent(data as FeaturedEvent[])
  } catch {
    // The homepage is not the place to surface a database problem.
    return null
  }
}

export default async function Home() {
  // Read at build time — see the note in lib/album.ts about keeping this page static.
  const albumImages = getAlbumImages()
  const featured = await getFeaturedEvent()

  return (
    <Layout>
      <FeaturedEventStrip event={featured} />
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
