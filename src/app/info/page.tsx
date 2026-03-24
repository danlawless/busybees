import { Layout } from '@/components/layout/Layout'
import { InfoHero } from '@/components/info/InfoHero'
import { ImportantInfo } from '@/components/info/ImportantInfo'
import { DetailedHours } from '@/components/info/DetailedHours'
import { Pricing } from '@/components/home/Pricing'
import { FAQ } from '@/components/info/FAQ'

export const metadata = {
  title: 'Info - Hours & FAQ | Busy Bees Indoor Play Center',
  description: 'Essential information about visiting Busy Bees Indoor Play Center including hours, pricing, amenities, and frequently asked questions.',
}

export default function InfoPage() {
  return (
    <Layout>
      <InfoHero />
      <DetailedHours />
      <Pricing />
      <ImportantInfo />
      <FAQ />
    </Layout>
  )
}
