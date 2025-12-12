'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function PartyPackageBackdrop() {
  return (
    <section className="relative py-20 bg-neutral-50 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        {/* New Party Package Backdrop Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
            Party Package Overview
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Choose the perfect party package for your celebration
          </p>
        </motion.div>

        <motion.div
          className="relative max-w-5xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Mobile Image - Clean Graphic */}
          <div className="md:hidden relative w-full">
            <img
              src="/party-packages-mobile.png"
              alt="Party Package Options - Queen Bee, Worker Bee, Basic Bee"
              className="w-full h-auto"
            />
          </div>

          {/* Desktop Image Container with Overlays */}
          <div className="hidden md:block relative w-full">
            <img
              src="/partypackage-backdrops.png"
              alt="Party Package Hexagon Layout"
              className="w-full h-auto"
            />

            {/* Queen Bee - Top Left */}
            <div className="absolute top-[32%] left-[7%] transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow-xl border-2 border-white">
                <h3 className="text-xl font-bold">Queen Bee</h3>
                <p className="text-sm">Premium Package</p>
              </div>
            </div>

            {/* Queen Bee Details Box */}
            <div className="absolute top-[32%] left-[34%] transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-gray-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-orange-600 mb-1">Private: $550</p>
                <p className="text-xl font-extrabold text-orange-600 mb-2">Semi-Private: $450</p>
                <p className="text-sm text-gray-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-gray-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-gray-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-orange-500 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-700">✨ Play area access</p>
                  <p className="text-base font-medium text-gray-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-gray-700">🍽️ Paper goods included</p>
                  <p className="text-base font-medium text-gray-700">🍕 Pizza and soda included</p>
                  <p className="text-base font-medium text-gray-700">🎂 Sheet cake & balloons</p>
                </div>
              </div>
            </div>

            {/* Worker Bee - Middle Right */}
            <div className="absolute top-[52%] right-[4%] transform translate-x-1/2 -translate-y-1/2">
              <div className="bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-xl border-2 border-white">
                <h3 className="text-xl font-bold">Worker Bee</h3>
                <p className="text-sm">Standard Package</p>
              </div>
            </div>

            {/* Worker Bee Details Box */}
            <div className="absolute top-[52%] right-[31%] transform translate-x-1/2 -translate-y-1/2">
              <div className="text-gray-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-yellow-600 mb-1">Private: $450</p>
                <p className="text-xl font-extrabold text-yellow-600 mb-2">Semi-Private: $350</p>
                <p className="text-sm text-gray-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-gray-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-gray-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-yellow-600 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-700">✨ Play area access</p>
                  <p className="text-base font-medium text-gray-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-gray-700">🍽️ Paper goods included</p>
                  <p className="text-base font-medium text-gray-700">🍕 Pizza and soda included</p>
                </div>
              </div>
            </div>

            {/* Basic Bee - Bottom Left */}
            <div className="absolute bottom-[29%] left-[7%] transform -translate-x-1/2 translate-y-1/2">
              <div className="bg-amber-500 text-black px-6 py-3 rounded-lg shadow-xl border-2 border-white">
                <h3 className="text-xl font-bold">Basic Bee</h3>
                <p className="text-sm">Essential Package</p>
              </div>
            </div>

            {/* Basic Bee Details Box */}
            <div className="absolute bottom-[28%] left-[34%] transform -translate-x-1/2 translate-y-1/2">
              <div className="text-gray-800 max-w-60 text-center">
                <p className="text-xl font-extrabold text-amber-600 mb-1">Private: $350</p>
                <p className="text-xl font-extrabold text-amber-600 mb-2">Semi-Private: $250</p>
                <p className="text-sm text-gray-600 mb-2 italic">Semi-Private: Exclusive party room, shared play area</p>
                <p className="text-base font-semibold text-gray-700 mb-2">2 hours</p>
                <p className="text-base font-medium text-gray-600 mb-2">15 kids included</p>
                <p className="text-base font-medium text-amber-600 mb-3">$15/additional kids</p>
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-700">✨ Play area access</p>
                  <p className="text-base font-medium text-gray-700">🎉 Exclusive party room</p>
                  <p className="text-base font-medium text-gray-700">🍽️ Paper goods included</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
