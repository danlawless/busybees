'use client';

import React from 'react';
import Image from 'next/image';
import { Layout } from '@/components/layout/Layout';
import { EventsBoard } from '@/components/events/EventsBoard';

export default function EventsPage() {
  return (
    <Layout>
      <div className="py-12 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-charcoal-800 mb-3">
              Events
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Special events and activities at Busy Bees Indoor Playground
            </p>

            {/* Photo banner */}
            <div className="mt-8 grid grid-cols-5 gap-1.5 sm:gap-2 max-w-3xl mx-auto rounded-2xl overflow-hidden">
              {['/album/MH_12639.jpg', '/album/MH_12683.jpg', '/album/MH_12724.jpg', '/album/MH_12771.jpg', '/album/MH_12816.jpg'].map((src, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden">
                  <Image src={src} alt="" fill className="object-cover" sizes="20vw" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
          <EventsBoard />
        </div>
      </div>
    </Layout>
  );
}
