'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';

export default function AfterDarkPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    { icon: '🍕', title: 'Pizza Dinner', desc: 'Kids enjoy pizza and drinks — dinner is on us!' },
    { icon: '🎬', title: 'Movie Night', desc: 'A fun movie on the big screen in the play area' },
    { icon: '🎪', title: 'Supervised Play', desc: 'Staff-supervised activities the entire evening' },
    { icon: '🕕', title: 'Drop-Off & Go', desc: 'Drop off at 6 PM, pick up at 9 PM — enjoy your evening!' },
  ];

  const details = [
    { label: 'Ages', value: '3-6 years old' },
    { label: 'Time', value: '6:00 PM - 9:00 PM' },
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
            <Image
              src="/busy-bees-logo.png"
              alt="Busy Bees"
              width={180}
              height={180}
              className="mx-auto drop-shadow-2xl"
              priority
            />
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
            Drop off the kids for an evening of pizza, movies, and supervised play —
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
              { step: '2', title: 'Drop Off at 6 PM', desc: 'Sign the waiver, say goodbye, and head out for your evening! Kids start with supervised play time.', icon: '👋' },
              { step: '3', title: 'Pick Up at 9 PM', desc: 'Return to happy, tired kids who had the time of their lives. Pizza consumed, movie watched, fun had!', icon: '🌙' },
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

          {/* Book CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-6 text-sm" style={{ color: '#a5b4fc' }}>
              Spots fill up fast! Reserve your child&apos;s spot today.
            </p>
            <Link
              href="/contact"
              className="after-dark-btn-primary inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-full transition-all"
            >
              Reserve a Spot
            </Link>
            <p className="mt-4 text-xs" style={{ color: '#6d28d9' }}>
              Questions? Call us at (978) 785-0015
            </p>
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
