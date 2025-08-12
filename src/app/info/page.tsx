import { Layout } from '@/components/layout/Layout'
import { InfoHero } from '@/components/info/InfoHero'
import { ImportantInfo } from '@/components/info/ImportantInfo'
import { DetailedHours } from '@/components/info/DetailedHours'
import { PricingDetails } from '@/components/info/PricingDetails'
import { Amenities } from '@/components/info/Amenities'
import { Policies } from '@/components/info/Policies'
import { FAQ } from '@/components/info/FAQ'

export const metadata = {
  title: 'Info - Hours, Pricing & Policies | Busy Bees Indoor Play Center',
  description: 'Complete information about visiting Busy Bees Indoor Play Center including hours, pricing, amenities, safety policies, and frequently asked questions.',
}

export default function InfoPage() {
  return (
    <Layout>
      <InfoHero />
      <ImportantInfo />
      <DetailedHours />
      <PricingDetails />
      <Amenities />
      <Policies />
      <FAQ />
    </Layout>
  )
}
