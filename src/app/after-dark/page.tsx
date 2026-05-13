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
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetch('/api/after-dark/movies')
      .then(res => res.json())
      .then(data => setMovies(data.movies || []))
      .catch(() => {});
  }, []);

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
              href="/customer/dashboard?tab=after-dark"
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

      {/* About the Evening — single text-driven section */}
      <section
        id="details"
        className="py-20 px-4"
        style={{ background: 'linear-gradient(180deg, #1a1025 0%, #0f0f1a 100%)' }}
      >
        <div className="max-w-2xl mx-auto" style={{ color: '#e2e8ff' }}>
          <motion.h2
            className="text-4xl sm:text-5xl font-bold text-center mb-10 leading-tight"
            style={{ color: '#e9d5ff' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Because every parent deserves a night out
          </motion.h2>

          <motion.div
            className="space-y-10 text-lg sm:text-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p>
              After Dark is Busy Bees&apos; Friday-night drop-off event for kids ages
              3 and up. While you enjoy a well-earned evening out, our staff keeps
              the kids fed, entertained, and supervised the whole time — pizza,
              a kid-friendly movie on the big screen, and plenty of play.
              Pajamas welcome.
            </p>

            <div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#e9d5ff' }}>Event Details</h3>
              <ul className="list-disc list-outside pl-6 space-y-2">
                <li><strong>Ages:</strong> 3 and up (must be potty trained)</li>
                <li><strong>When:</strong> Fridays, 5:00 PM – 7:30 PM</li>
                <li><strong>Capacity:</strong> Limited spots each week — book early</li>
                <li><strong>Includes:</strong> Pizza, drinks, a movie, and supervised play</li>
                <li><strong>Price:</strong> $50 per child</li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#e9d5ff' }}>Safety &amp; Atmosphere</h3>
              <p>
                All staff are trained and background-checked, and we maintain a
                low child-to-staff ratio so every child gets real supervision and
                attention. For the movie portion of the evening, the space features
                modified lighting (including some flashing and moving effects) and
                curtains drawn to create a darker, nighttime-style atmosphere.
              </p>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#e9d5ff' }}>Booking &amp; Cancellation</h3>
              <p>
                To book, sign in and visit the After Dark tab in My Account, then
                choose your preferred Friday. Spots fill up quickly. If your plans
                change, contact us as early as possible so we can offer the spot
                to another family.
              </p>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/customer/dashboard?tab=after-dark"
                className="after-dark-btn-primary inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-full transition-all"
              >
                Reserve a Spot
              </Link>
              <p className="mt-4 text-sm" style={{ color: '#a5b4fc' }}>
                Questions? Call us at (978) 785-0015
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* While You're Out — nearby suggestions for parents */}
      <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1025 100%)' }}>
        <div className="max-w-2xl mx-auto" style={{ color: '#e2e8ff' }}>
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center mb-6 leading-tight"
            style={{ color: '#e9d5ff' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            While You&apos;re Out
          </motion.h2>

          <motion.div
            className="space-y-6 text-lg sm:text-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p>
              Make a real night of it. With your kids set for the evening, here
              are a couple of nearby spots in the plaza to enjoy.
            </p>

            <ul className="list-disc list-outside pl-6 space-y-3">
              <li>
                <a
                  href="https://www.ixtapalunenburg.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:no-underline"
                  style={{ color: '#c4b5fd' }}
                >
                  Ixtapa
                </a>{' '}
                — authentic Mexican food, right across the plaza.
              </li>
              <li>
                <a
                  href="https://asian-imperial.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:no-underline"
                  style={{ color: '#c4b5fd' }}
                >
                  Asian Imperial
                </a>{' '}
                — Japanese and Asian cuisine just a short walk away.
              </li>
            </ul>
          </motion.div>
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
                        Coming Up
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
