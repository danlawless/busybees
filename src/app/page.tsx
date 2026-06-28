import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}
import { Hero } from '@/components/home/Hero'
import { Gallery } from '@/components/home/Gallery'

export default function Home() {
  return (
    <Layout>
      <Hero />
      <Gallery />
    </Layout>
  )
}