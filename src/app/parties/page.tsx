'use client'

import { Layout } from '@/components/layout/Layout'
import { PartiesHero } from '@/components/parties/PartiesHero'
import { PartyPackages } from '@/components/parties/PartyPackages'
import { PartyExtras } from '@/components/parties/PartyExtras'
import { BookingFlow } from '@/components/parties/BookingFlow'
import { PartyGallery } from '@/components/parties/PartyGallery'
import { PartyFAQ } from '@/components/parties/PartyFAQ'

export default function PartiesPage() {
  return (
    <Layout>
      <PartiesHero />
      <PartyPackages />
      <PartyExtras />
      <BookingFlow />
      <PartyGallery />
      <PartyFAQ />
    </Layout>
  )
}
