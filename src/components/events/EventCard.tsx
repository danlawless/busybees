'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface EventCardProps {
  title: string;
  imageUrl: string;
  eventDate: string;
  eventDateEnd?: string | null;
  eventTimeStart: string;
  eventTimeEnd: string | null;
  description?: string | null;
  isFree?: boolean;
  variant?: 'default' | 'happening-now' | 'past';
}

export function EventCard({
  title,
  imageUrl,
  eventDate,
  eventDateEnd,
  eventTimeStart,
  eventTimeEnd,
  description,
  isFree = false,
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

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLightboxOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isLightboxOpen, closeLightbox]);

  const lightbox = (
    <AnimatePresence>
      {isLightboxOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-charcoal-900/95 backdrop-blur-sm cursor-zoom-out"
            onClick={closeLightbox}
          />

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close image viewer"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div
            className="relative z-10 w-[95vw] h-[90vh] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
          >
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="95vw"
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

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

      {/* Image - shows the full Canva graphic without cropping, click to enlarge */}
      <button
        type="button"
        onClick={() => setIsLightboxOpen(true)}
        className="relative w-full block group focus:outline-none focus:ring-2 focus:ring-honey-400 focus:ring-inset cursor-zoom-in"
        aria-label={`View ${title} flyer at full size`}
      >
        <Image
          src={imageUrl}
          alt={title}
          width={800}
          height={600}
          className={`w-full h-auto transition-transform duration-300 group-hover:scale-[1.02] ${isPast ? 'grayscale' : ''}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </button>

      {isMounted && createPortal(lightbox, document.body)}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-charcoal-800 mb-2">{title}</h3>

        <p className="text-sm text-neutral-600 mb-1">
          {formatDate(eventDate)}
          {eventDateEnd && eventDateEnd !== eventDate && ` - ${formatDate(eventDateEnd)}`}
        </p>
        <p className="text-sm text-neutral-600 mb-3">
          {formatTime(eventTimeStart)}
          {eventTimeEnd && ` - ${formatTime(eventTimeEnd)}`}
        </p>

        {description && (
          <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{description}</p>
        )}

        {isPast ? (
          <div className="text-center text-sm text-neutral-400 font-medium py-2">
            This event has passed
          </div>
        ) : isFree ? (
          <div className="inline-flex items-center justify-center w-full rounded-full font-semibold text-base px-6 py-3 bg-green-100 text-green-700 cursor-default">
            Free with Admission
          </div>
        ) : (
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center w-full rounded-full font-semibold text-base px-6 py-3 btn-pastel-primary text-charcoal-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Reserve Your Spot
          </Link>
        )}
      </div>
    </motion.div>
  );
}
