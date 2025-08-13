'use client'

import { Layout } from '@/components/layout/Layout'
import { PartiesHero } from '@/components/parties/PartiesHero'
import { PartyPackages } from '@/components/parties/PartyPackages'
import { BookingFlow } from '@/components/parties/BookingFlow'
import { PartyGallery } from '@/components/parties/PartyGallery'

export default function PartiesPage() {
  return (
    <Layout>
      <PartiesHero />
      <PartyPackages />
      <BookingFlow />
      <PartyGallery />
    </Layout>
  )
}
