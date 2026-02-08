'use client';

import React from 'react';
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
          </div>
          <EventsBoard />
        </div>
      </div>
    </Layout>
  );
}
