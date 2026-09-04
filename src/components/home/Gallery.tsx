'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react'


const INITIAL_COUNT = 12

interface GalleryProps {
  /** Filenames in public/album, supplied by the page at build time. */
  images: string[]
}

export function Gallery({ images: allImages }: GalleryProps) {
  const [showAll, setShowAll] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const visibleImages = showAll ? allImages : allImages.slice(0, INITIAL_COUNT)

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex(prev => prev !== null ? (prev + 1) % allImages.length : null)
  }, [])

  const goPrev = useCallback(() => {
    setLightboxIndex(prev => prev !== null ? (prev - 1 + allImages.length) % allImages.length : null)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [lightboxIndex, closeLightbox, goNext, goPrev])

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8E7] via-[#FFFDF7] to-[#FFF8E7]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl md:text-5xl mb-4">
            Take a <span className="text-honey-500">Peek Inside</span>
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            See why kids and parents love spending their days at Busy Bees
          </p>
        </motion.div>

        {/* Masonry Grid */}
        <motion.div
          className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {visibleImages.map((img, index) => (
            <motion.div
              key={img}
              className="break-inside-avoid mb-3 sm:mb-4"
              variants={{
                hidden: { opacity: 0, scale: 0.92 },
                visible: { opacity: 1, scale: 1 },
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <button
                onClick={() => openLightbox(allImages.indexOf(img))}
                className="group relative block w-full rounded-2xl overflow-hidden shadow-soft hover:shadow-honey focus:outline-none focus:ring-2 focus:ring-honey-400 focus:ring-offset-2 transition-all duration-300 cursor-pointer"
                aria-label={`View photo ${index + 1}`}
              >
                <Image
                  src={`/album/${img}`}
                  alt={`Busy Bees play center photo ${index + 1}`}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Show More / Show Less */}
        {!showAll && allImages.length > INITIAL_COUNT && (
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white rounded-full shadow-soft border-2 border-honey-300/60 text-charcoal-800 font-semibold hover:shadow-honey hover:border-honey-400 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-honey-500" />
              View All {allImages.length} Photos
            </button>
          </motion.div>
        )}

        {showAll && (
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => {
                setShowAll(false)
                document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white rounded-full shadow-soft border-2 border-charcoal-200/60 text-charcoal-700 font-semibold hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              Show Less
            </button>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-charcoal-900/95 backdrop-blur-sm"
              onClick={closeLightbox}
            />

            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white/70 text-sm font-medium">
              {lightboxIndex + 1} / {allImages.length}
            </div>

            {/* Previous button */}
            <button
              onClick={goPrev}
              className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            {/* Next button */}
            <button
              onClick={goNext}
              className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              className="relative z-10 w-[92vw] h-[80vh] sm:w-[85vw] sm:h-[85vh] flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                src={`/album/${allImages[lightboxIndex]}`}
                alt={`Busy Bees photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="92vw"
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll anchor */}
      <div id="gallery-section" className="absolute top-0" />
    </section>
  )
}
