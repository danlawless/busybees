import { Layout } from '@/components/layout/Layout'
import { Hero } from '@/components/home/Hero'
import { Features } from '@/components/home/Features'
import { Gallery } from '@/components/home/Gallery'
import { Pricing } from '@/components/home/Pricing'

export default function Home() {
  return (
    <Layout>
      <Hero />
      <Features />
      <Gallery />
      <Pricing />
    </Layout>
  )
}