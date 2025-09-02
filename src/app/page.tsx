import { Layout } from '@/components/layout/Layout'
import { Hero } from '@/components/home/Hero'
import { Features } from '@/components/home/Features'
import { Pricing } from '@/components/home/Pricing'

export default function Home() {
  return (
    <Layout>
      <Hero />
      <Features />
      <Pricing />
    </Layout>
  )
}