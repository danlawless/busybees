'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EventCard } from './EventCard';
import { formatDateToYYYYMMDD } from '@/lib/utils';

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  event_date: string;
  event_date_end: string | null;
  event_time_start: string;
  event_time_end: string | null;
  is_free: boolean;
}

type EventCategory = 'happening-now' | 'upcoming' | 'past';

interface CategorizedEvent extends PublicEvent {
  category: EventCategory;
}

export function EventsBoard() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError('Unable to load events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeEvents = (): {
    happeningNow: CategorizedEvent[];
    upcoming: CategorizedEvent[];
    past: CategorizedEvent[];
  } => {
    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const happeningNow: CategorizedEvent[] = [];
    const upcoming: CategorizedEvent[] = [];
    const past: CategorizedEvent[] = [];

    for (const event of events) {
      const eventStart = event.event_date;
      const eventEnd = event.event_date_end || event.event_date;

      if (eventEnd < todayStr) {
        // Event (or last day of multi-day event) is in the past
        past.push({ ...event, category: 'past' });
      } else if (eventStart <= todayStr && eventEnd >= todayStr) {
        // Today falls within the event date range
        const isFirstDay = eventStart === todayStr;
        const isLastDay = eventEnd === todayStr;

        const [startH, startM] = event.event_time_start.split(':').map(Number);
        const startMinutes = startH * 60 + startM;

        let endMinutes = startMinutes + 120; // Default 2hr if no end time
        if (event.event_time_end) {
          const [endH, endM] = event.event_time_end.split(':').map(Number);
          endMinutes = endH * 60 + endM;
        }

        // Multi-day event: middle days are always "happening now" during business hours
        const isMiddleDay = !isFirstDay && !isLastDay;

        if (isMiddleDay) {
          happeningNow.push({ ...event, category: 'happening-now' });
        } else if (isFirstDay && isLastDay) {
          // Single-day event or first==last day
          if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
            happeningNow.push({ ...event, category: 'happening-now' });
          } else if (currentTimeMinutes < startMinutes) {
            upcoming.push({ ...event, category: 'upcoming' });
          } else {
            past.push({ ...event, category: 'past' });
          }
        } else if (isFirstDay) {
          // First day of multi-day: happening now once start time passes
          if (currentTimeMinutes >= startMinutes) {
            happeningNow.push({ ...event, category: 'happening-now' });
          } else {
            upcoming.push({ ...event, category: 'upcoming' });
          }
        } else {
          // Last day of multi-day: happening now until end time
          if (currentTimeMinutes <= endMinutes) {
            happeningNow.push({ ...event, category: 'happening-now' });
          } else {
            past.push({ ...event, category: 'past' });
          }
        }
      } else {
        // Event starts in the future
        upcoming.push({ ...event, category: 'upcoming' });
      }
    }

    // Sort upcoming by date ascending, past by date descending
    upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date));
    past.sort((a, b) => b.event_date.localeCompare(a.event_date));

    return { happeningNow, upcoming, past };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-600">{error}</p>
      </div>
    );
  }

  const { happeningNow, upcoming } = categorizeEvents();
  const hasNoEvents = happeningNow.length === 0 && upcoming.length === 0;

  if (hasNoEvents) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-charcoal-800 mb-3">No Events Yet</h2>
        <p className="text-neutral-600">
          Check back soon for upcoming events and activities!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Happening Now */}
      {happeningNow.length > 0 && (
        <EventSection title="Happening Now" events={happeningNow} variant="happening-now" />
      )}

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <EventSection title="Upcoming Events" events={upcoming} variant="default" />
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  variant,
}: {
  title: string;
  events: CategorizedEvent[];
  variant: 'default' | 'happening-now' | 'past';
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className={`text-2xl font-bold mb-6 ${
        variant === 'past' ? 'text-neutral-400' : 'text-charcoal-800'
      }`}>
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            imageUrl={event.image_url}
            eventDate={event.event_date}
            eventDateEnd={event.event_date_end}
            eventTimeStart={event.event_time_start}
            eventTimeEnd={event.event_time_end}
            description={event.description}
            isFree={event.is_free}
            variant={variant}
          />
        ))}
      </div>
    </motion.section>
  );
}
