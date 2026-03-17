'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';

interface Movie {
  id: string;
  title: string;
  show_date: string;
  description: string | null;
  poster_url: string | null;
  rating: string;
}

function formatMovieDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function AfterDarkPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);

  // Booking state
  interface Availability {
    date: string;
    maxKids: number;
    booked: number;
    remaining: number;
    isFull: boolean;
  }
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingForm, setBookingForm] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    num_kids: 1,
    kid_details: '',
    notes: '',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    fetch('/api/after-dark/movies')
      .then(res => res.json())
      .then(data => setMovies(data.movies || []))
      .catch(() => {});

    fetch('/api/after-dark/availability')
      .then(res => res.json())
      .then(data => {
        setAvailability(data.availability || []);
        const firstAvailable = (data.availability || []).find((a: Availability) => !a.isFull);
        if (firstAvailable) setSelectedDate(firstAvailable.date);
      })
      .catch(() => {});
  }, []);

  const selectedAvailability = availability.find(a => a.date === selectedDate);

  const handleBookingSubmit = async () => {
    if (!selectedDate || !bookingForm.parent_name || !bookingForm.parent_email || !bookingForm.parent_phone) return;
    setBookingSubmitting(true);
    setBookingError('');

    try {
      const res = await fetch('/api/after-dark/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: selectedDate,
          ...bookingForm,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBookingSuccess(true);
        // Refresh availability
        const avRes = await fetch('/api/after-dark/availability');
        const avData = await avRes.json();
        setAvailability(avData.availability || []);
      } else {
        setBookingError(data.error || 'Booking failed. Please try again.');
      }
    } catch {
      setBookingError('Something went wrong. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const features = [
    { icon: '🍕', title: 'Pizza Dinner', desc: 'Kids enjoy pizza and drinks — dinner is on us!' },
    { icon: '🎬', title: 'Movie Night', desc: 'A fun movie on the big screen in the play area' },
    { icon: '🎪', title: 'Supervised Play', desc: 'Staff-supervised activities the entire evening' },
    { icon: '👕', title: 'PJ\'s Welcome!', desc: 'Kids are welcome to arrive in their pajamas for a cozy movie night vibe' },
    { icon: '🕕', title: 'Drop-Off & Go', desc: 'Drop off at 5 PM, pick up at 7:30 PM — enjoy your evening!' },
  ];

  const details = [
    { label: 'Ages', value: '3-6 years old' },
    { label: 'Time', value: 'Fridays, 5:00 PM - 7:30 PM' },
    { label: 'Includes', value: 'Pizza, drinks, movie & supervised play' },
    { label: 'Capacity', value: 'Limited spots — book early!' },
  ];

  return (
    <Layout>
      {/* Hero Section - Dark theme */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 40%, #0d0d1a 100%)' }}>
        {/* Subtle stars / particles */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{
                opacity: [0.1, 0.6, 0.1],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.3) 60%, transparent 75%)', filter: 'blur(8px)' }} />
              <Image
                src="/busy-bees-logo.png"
                alt="Busy Bees"
                width={180}
                height={180}
                className="relative mx-auto"
                priority
              />
            </div>
          </motion.div>

          {/* Neon "After Dark" Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h1 className="after-dark-neon text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-2">
              After Dark
            </h1>
            <p className="after-dark-subtitle text-lg sm:text-xl md:text-2xl font-medium tracking-widest uppercase mt-2" style={{ color: '#c4b5fd' }}>
              Parents&apos; Night Out
            </p>
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="mt-8 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#a5b4fc' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Every Friday night — drop off the kids for an evening of pizza, movies, and supervised play
            while you enjoy a well-deserved night out!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              href="#book"
              className="after-dark-btn-primary inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full transition-all"
            >
              Book a Spot
            </Link>
            <Link
              href="#details"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full border-2 transition-all"
              style={{ borderColor: '#6d28d9', color: '#c4b5fd' }}
            >
              Learn More
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-16"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-2xl" style={{ color: '#6d28d9' }}>&#8595;</span>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="details" className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #1a1025 0%, #0f0f1a 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center mb-4"
            style={{ color: '#e9d5ff' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            What&apos;s Included
          </motion.h2>
          <p className="text-center mb-12" style={{ color: '#a78bfa' }}>
            Everything your kids need for an amazing evening
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                className="relative p-6 rounded-2xl text-center cursor-default transition-all"
                style={{
                  background: hoveredFeature === i
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid',
                  borderColor: hoveredFeature === i ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.06)',
                }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#e9d5ff' }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: '#a5b4fc' }}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4" style={{ background: '#0f0f1a' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            style={{ color: '#e9d5ff' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Book Online', desc: 'Reserve your spot — capacity is limited to ensure every child gets personal attention.', icon: '📱' },
              { step: '2', title: 'Drop Off at 5 PM', desc: 'Sign the waiver, say goodbye, and head out for your Friday evening! Kids start with supervised play time.', icon: '👋' },
              { step: '3', title: 'Pick Up at 7:30 PM', desc: 'Return to happy, tired kids who had the time of their lives. Pizza consumed, movie watched, fun had!', icon: '🌙' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
                >
                  {item.icon}
                </div>
                <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#8b5cf6' }}>
                  Step {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#e9d5ff' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#a5b4fc' }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Movie Schedule */}
      {movies.length > 0 && (
        <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1025 50%, #0f0f1a 100%)' }}>
          <div className="max-w-5xl mx-auto">
            <motion.h2
              className="text-3xl sm:text-4xl font-bold text-center mb-4"
              style={{ color: '#e9d5ff' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              What&apos;s on Tap?
            </motion.h2>
            <p className="text-center mb-12" style={{ color: '#a78bfa' }}>
              See what&apos;s playing at upcoming After Dark nights
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {movies.map((movie, i) => {
                const isNext = i === 0;
                return (
                  <motion.div
                    key={movie.id}
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: isNext ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {isNext && (
                      <div
                        className="text-center py-1.5 text-xs font-bold uppercase tracking-wider"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#ffffff' }}
                      >
                        This Friday
                      </div>
                    )}
                    <div className="p-6 text-center">
                      {movie.poster_url ? (
                        <div className="w-24 h-32 rounded-xl mx-auto mb-4 overflow-hidden">
                          <Image
                            src={movie.poster_url}
                            alt={movie.title}
                            width={96}
                            height={128}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className="w-20 h-24 rounded-xl mx-auto mb-4 flex items-center justify-center text-4xl"
                          style={{
                            background: isNext
                              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(79, 70, 229, 0.2) 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          🎬
                        </div>
                      )}
                      <h3 className="text-xl font-bold mb-1" style={{ color: '#e9d5ff' }}>{movie.title}</h3>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}
                        >
                          Rated {movie.rating}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#a5b4fc' }}>{formatMovieDate(movie.show_date)}</p>
                      {movie.description && (
                        <p className="text-xs mt-2" style={{ color: '#818cf8' }}>{movie.description}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Event Details */}
      <section id="book" className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1025 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            style={{ color: '#e9d5ff' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Event Details
          </motion.h2>

          {/* Details Card */}
          <motion.div
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {details.map((detail, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#8b5cf6' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#a78bfa' }}>{detail.label}</p>
                    <p className="text-base font-semibold" style={{ color: '#e9d5ff' }}>{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div className="text-center">
                <p className="text-sm uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>Pricing</p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <p className="text-3xl font-bold" style={{ color: '#c4b5fd' }}>$45</p>
                    <p className="text-sm" style={{ color: '#a78bfa' }}>1 Child</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                    <p className="text-3xl font-bold" style={{ color: '#c4b5fd' }}>$40</p>
                    <p className="text-sm" style={{ color: '#a78bfa' }}>Per Child (2+)</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Safety Note */}
          <motion.div
            className="rounded-xl p-6 text-center mb-8"
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-sm" style={{ color: '#86efac' }}>
              <strong>Safety First:</strong> All staff are trained and background-checked.
              Waivers are required for each child. We maintain a low child-to-staff ratio
              to ensure every child receives proper supervision and attention.
            </p>
          </motion.div>

          {/* Booking Form */}
          <motion.div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {bookingSuccess ? (
              <div className="text-center py-8">
                <span className="text-5xl mb-4 block">🎉</span>
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#e9d5ff' }}>You&apos;re All Set!</h3>
                <p className="text-sm mb-4" style={{ color: '#a5b4fc' }}>
                  Your spot has been reserved. We&apos;ll see you on Friday!
                </p>
                <button
                  onClick={() => {
                    setBookingSuccess(false);
                    setBookingForm({ parent_name: '', parent_email: '', parent_phone: '', num_kids: 1, kid_details: '', notes: '' });
                  }}
                  className="after-dark-btn-primary px-6 py-3 rounded-full text-sm font-semibold"
                >
                  Book Another Date
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-center mb-6" style={{ color: '#e9d5ff' }}>
                  Reserve Your Spot
                </h3>

                {/* Date Selection with Availability */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3" style={{ color: '#a78bfa' }}>Select a Friday</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availability.map((a) => {
                      const [year, month, day] = a.date.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const isSelected = selectedDate === a.date;

                      return (
                        <button
                          key={a.date}
                          onClick={() => !a.isFull && setSelectedDate(a.date)}
                          disabled={a.isFull}
                          className={`p-3 rounded-xl text-center transition-all ${
                            a.isFull
                              ? 'opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'ring-2 ring-purple-400'
                                : 'hover:ring-1 hover:ring-purple-400/50'
                          }`}
                          style={{
                            background: isSelected
                              ? 'rgba(139, 92, 246, 0.25)'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid',
                            borderColor: isSelected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <p className="text-sm font-bold" style={{ color: a.isFull ? '#6b7280' : '#e9d5ff' }}>{label}</p>
                          <p className="text-xs mt-1" style={{ color: a.isFull ? '#ef4444' : a.remaining <= 10 ? '#fbbf24' : '#86efac' }}>
                            {a.isFull ? 'FULL' : `${a.remaining} spots left`}
                          </p>
                          {/* Capacity bar */}
                          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(a.booked / a.maxKids) * 100}%`,
                                background: a.isFull ? '#ef4444' : a.remaining <= 10 ? '#fbbf24' : '#22c55e',
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spots remaining indicator */}
                {selectedAvailability && (
                  <div className="mb-6 text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-sm" style={{ color: '#a5b4fc' }}>
                      <span className="font-bold" style={{ color: selectedAvailability.remaining <= 10 ? '#fbbf24' : '#86efac' }}>
                        {selectedAvailability.remaining}
                      </span>
                      {' '}of {selectedAvailability.maxKids} spots remaining &bull;{' '}
                      <span style={{ color: '#a78bfa' }}>{selectedAvailability.booked} kids signed up</span>
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Parent Name *</label>
                      <input
                        type="text"
                        value={bookingForm.parent_name}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, parent_name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Email *</label>
                      <input
                        type="email"
                        value={bookingForm.parent_email}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, parent_email: e.target.value }))}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Phone *</label>
                      <input
                        type="tel"
                        value={bookingForm.parent_phone}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, parent_phone: e.target.value }))}
                        placeholder="(555) 555-5555"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Number of Kids *</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setBookingForm(prev => ({ ...prev, num_kids: Math.max(1, prev.num_kids - 1) }))}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#c4b5fd' }}
                        >
                          -
                        </button>
                        <span className="text-2xl font-bold min-w-[2rem] text-center" style={{ color: '#e9d5ff' }}>
                          {bookingForm.num_kids}
                        </span>
                        <button
                          onClick={() => setBookingForm(prev => ({ ...prev, num_kids: Math.min(selectedAvailability?.remaining || 10, prev.num_kids + 1) }))}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#c4b5fd' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Kid Names & Ages (optional)</label>
                    <input
                      type="text"
                      value={bookingForm.kid_details}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, kid_details: e.target.value }))}
                      placeholder="e.g., Emma (4), Jack (5)"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#a78bfa' }}>Special Notes (optional)</label>
                    <textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Allergies, special needs, etc."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>

                  {bookingError && (
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <p className="text-sm" style={{ color: '#fca5a5' }}>{bookingError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleBookingSubmit}
                    disabled={bookingSubmitting || !selectedDate || !bookingForm.parent_name || !bookingForm.parent_email || !bookingForm.parent_phone}
                    className="after-dark-btn-primary w-full py-4 text-lg font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingSubmitting ? 'Booking...' : `Reserve ${bookingForm.num_kids} Spot${bookingForm.num_kids > 1 ? 's' : ''}`}
                  </button>

                  <p className="text-center text-xs" style={{ color: '#6d28d9' }}>
                    Questions? Call us at (978) 785-0015
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Neon CSS */}
      <style jsx global>{`
        .after-dark-neon {
          color: #c4b5fd;
          text-shadow:
            0 0 7px rgba(139, 92, 246, 0.6),
            0 0 10px rgba(139, 92, 246, 0.4),
            0 0 21px rgba(139, 92, 246, 0.3),
            0 0 42px rgba(124, 58, 237, 0.2),
            0 0 82px rgba(124, 58, 237, 0.1),
            0 0 92px rgba(124, 58, 237, 0.05);
          animation: neon-flicker 4s ease-in-out infinite;
        }

        @keyframes neon-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow:
              0 0 7px rgba(139, 92, 246, 0.6),
              0 0 10px rgba(139, 92, 246, 0.4),
              0 0 21px rgba(139, 92, 246, 0.3),
              0 0 42px rgba(124, 58, 237, 0.2),
              0 0 82px rgba(124, 58, 237, 0.1),
              0 0 92px rgba(124, 58, 237, 0.05);
          }
          20%, 24%, 55% {
            text-shadow:
              0 0 4px rgba(139, 92, 246, 0.3),
              0 0 7px rgba(139, 92, 246, 0.2);
          }
        }

        .after-dark-subtitle {
          text-shadow: 0 0 10px rgba(196, 181, 253, 0.3);
        }

        .after-dark-btn-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .after-dark-btn-primary:hover {
          box-shadow: 0 0 30px rgba(124, 58, 237, 0.6), 0 6px 20px rgba(0, 0, 0, 0.4);
          transform: translateY(-2px);
        }
      `}</style>
    </Layout>
  );
}
