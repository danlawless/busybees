'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface EventCardProps {
  title: string;
  imageUrl: string;
  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string | null;
  description?: string | null;
  variant?: 'default' | 'happening-now' | 'past';
}

export function EventCard({
  title,
  imageUrl,
  eventDate,
  eventTimeStart,
  eventTimeEnd,
  description,
  variant = 'default',
}: EventCardProps) {
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isPast = variant === 'past';
  const isHappeningNow = variant === 'happening-now';

  return (
    <motion.div
      className={`bg-white rounded-3xl shadow-soft border overflow-hidden transition-all duration-300 ${
        isHappeningNow
          ? 'border-honey-400 ring-2 ring-honey-200 shadow-medium'
          : isPast
          ? 'border-neutral-200 opacity-75'
          : 'border-primary-200/20 hover:shadow-medium'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={!isPast ? { y: -4 } : undefined}
    >
      {/* Happening Now badge */}
      {isHappeningNow && (
        <div className="bg-honey-400 text-charcoal-800 text-center py-1.5 text-sm font-bold uppercase tracking-wide">
          Happening Now
        </div>
      )}

      {/* Image - takes center stage for the Canva graphic */}
      <div className="relative w-full aspect-[4/3]">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className={`object-cover ${isPast ? 'grayscale' : ''}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-charcoal-800 mb-2">{title}</h3>

        <p className="text-sm text-neutral-600 mb-1">
          {formatDate(eventDate)}
        </p>
        <p className="text-sm text-neutral-600 mb-3">
          {formatTime(eventTimeStart)}
          {eventTimeEnd && ` - ${formatTime(eventTimeEnd)}`}
        </p>

        {description && (
          <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{description}</p>
        )}

        {!isPast ? (
          <Link
            href="/account"
            className="inline-flex items-center justify-center w-full rounded-full font-semibold text-base px-6 py-3 btn-pastel-primary text-charcoal-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Tickets
          </Link>
        ) : (
          <div className="text-center text-sm text-neutral-400 font-medium py-2">
            This event has passed
          </div>
        )}
      </div>
    </motion.div>
  );
}
