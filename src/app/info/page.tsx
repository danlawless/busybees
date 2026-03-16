import { Layout } from '@/components/layout/Layout'
import { InfoHero } from '@/components/info/InfoHero'
import { ImportantInfo } from '@/components/info/ImportantInfo'
import { DetailedHours } from '@/components/info/DetailedHours'
// Temporarily hidden - PricingDetails content already on home page
// import { PricingDetails } from '@/components/info/PricingDetails'

// Temporarily hidden - Policies section  
// import { Policies } from '@/components/info/Policies'
import { FAQ } from '@/components/info/FAQ'

export const metadata = {
  title: 'Info - Hours & FAQ | Busy Bees Indoor Play Center',
  description: 'Essential information about visiting Busy Bees Indoor Play Center including hours, amenities, and frequently asked questions.',
}

export default function InfoPage() {
  return (
    <Layout>
      <InfoHero />
      <DetailedHours />
      <ImportantInfo />
      {/* Temporarily hidden - PricingDetails content already on home page */}
      {/* <PricingDetails /> */}

      {/* Temporarily hidden - Policies section */}
      {/* <Policies /> */}
      <FAQ />
    </Layout>
  )
}
