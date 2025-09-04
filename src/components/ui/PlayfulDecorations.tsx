'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface PlayfulDecorationsProps {
  variant?: 'hero' | 'features' | 'pricing' | 'minimal'
  density?: 'light' | 'medium' | 'dense'
}

const beeImages = [
  '/bee1.png',
  '/bee1-rev.png', 
  '/bee2.png',
  '/bee2-rev.png',
  '/bee3.png',
  '/bee3-rev.png'
]

const hiveImages = [
  '/bee-n-hive.png',
  '/bee-n-hive-rev.png',
  '/hive2.png',
  '/hive2-rev.png'
]

const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    x: [0, 5, 0],
    rotate: [0, 5, 0, -5, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

const buzzing = {
  animate: {
    y: [0, -8, 0],
    x: [0, 3, 0, -3, 0],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

const gentleFloat = {
  animate: {
    y: [0, -6, 0],
  },
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

export function PlayfulDecorations({ variant = 'minimal', density = 'medium' }: PlayfulDecorationsProps) {
  const getDecorations = () => {
    switch (variant) {
      case 'hero':
        return (
          <>
            {/* Top Left - Beautiful Hive 250x250px */}
            <motion.div 
              className="absolute top-4 left-4 md:top-6 md:left-6 z-10"
              {...gentleFloat}
              style={{ 
                opacity: 0.85,
                filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.1))'
              }}
            >
              <Image 
                src="/hive2.png" 
                alt="Busy Bees Hive" 
                width={250} 
                height={250} 
                className="w-[180px] h-[180px] md:w-[250px] md:h-[250px]"
                style={{ 
                  maxWidth: '250px', 
                  maxHeight: '250px',
                  width: '250px',
                  height: '250px'
                }}
              />
            </motion.div>


            {/* Upper Right - Small Bee (moved from left side) */}
            <motion.div 
              className="absolute top-12 right-8 md:top-16 md:right-16 z-10"
              {...floatingAnimation}
            >
              <Image 
                src="/bee3-rev.png" 
                alt="" 
                width={50} 
                height={50} 
                className="w-10 h-10 md:w-12 md:h-12"
              />
            </motion.div>

            {/* Middle Right - Bee with Hive */}
            <motion.div 
              className="absolute top-1/2 right-4 md:right-16 z-10"
              {...buzzing}
              style={{ animationDelay: '1s' }}
            >
              <Image 
                src="/bee-n-hive.png" 
                alt="" 
                width={70} 
                height={70} 
                className="w-14 h-14 md:w-18 md:h-18"
              />
            </motion.div>


            {/* Bottom Left - Flying Bee (moved from bottom right) */}
            <motion.div 
              className="absolute bottom-16 left-8 md:left-24 z-10"
              {...floatingAnimation}
              style={{ animationDelay: '0.5s' }}
            >
              <Image 
                src="/bee1.png" 
                alt="" 
                width={55} 
                height={55} 
                className="w-11 h-11 md:w-14 md:h-14"
              />
            </motion.div>

            {/* Extra Mobile-Hidden Decorations */}
            <motion.div 
              className="absolute top-2/3 left-1/4 z-10 hidden lg:block"
              {...buzzing}
              style={{ animationDelay: '3s' }}
            >
              <Image 
                src="/bee2-rev.png" 
                alt="" 
                width={40} 
                height={40} 
                className="w-8 h-8 opacity-70"
              />
            </motion.div>

            <motion.div 
              className="absolute top-1/4 right-1/3 z-10 hidden xl:block"
              {...gentleFloat}
              style={{ animationDelay: '1.5s' }}
            >
              <Image 
                src="/bee3.png" 
                alt="" 
                width={45} 
                height={45} 
                className="w-9 h-9 opacity-60"
              />
            </motion.div>
          </>
        )

      case 'features':
        return (
          <>
            {/* Scattered throughout features section */}

            <motion.div 
              className="absolute top-16 right-8 md:right-16 z-10"
              {...floatingAnimation}
              style={{ animationDelay: '1s' }}
            >
              <Image 
                src="/hive2-rev.png" 
                alt="" 
                width={150} 
                height={150} 
                className="w-[120px] h-[120px] md:w-[150px] md:h-[150px]"
                style={{
                  width: '150px',
                  height: '150px'
                }}
              />
            </motion.div>

          </>
        )

      case 'pricing':
        return (
          <>
            {/* Honey pot and bee moved from right to left - 150px x 150px */}
            <motion.div 
              className="absolute top-8 left-8 md:left-16 z-10"
              {...gentleFloat}
              style={{ animationDelay: '1s' }}
            >
              <Image 
                src="/bee-n-hive-rev.png" 
                alt="" 
                width={150} 
                height={150} 
                className="w-[120px] h-[120px] md:w-[150px] md:h-[150px]"
                style={{
                  width: '150px',
                  height: '150px'
                }}
              />
            </motion.div>

            {/* Bee moved from left to right */}
            <motion.div 
              className="absolute bottom-16 right-8 md:right-16 z-10"
              {...floatingAnimation}
              style={{ animationDelay: '1.5s' }}
            >
              <Image 
                src="/bee2-rev.png" 
                alt="" 
                width={45} 
                height={45} 
                className="w-9 h-9 md:w-11 md:h-11"
              />
            </motion.div>
          </>
        )

      default:
        return (
          <>
            <motion.div 
              className="absolute top-8 right-8 z-10"
              {...buzzing}
            >
              <Image 
                src="/bee1.png" 
                alt="" 
                width={40} 
                height={40} 
                className="w-8 h-8 md:w-10 md:h-10"
              />
            </motion.div>

            <motion.div 
              className="absolute bottom-8 left-8 z-10"
              {...gentleFloat}
            >
              <Image 
                src="/bee-n-hive.png" 
                alt="" 
                width={45} 
                height={45} 
                className="w-9 h-9 md:w-11 md:h-11"
              />
            </motion.div>
          </>
        )
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {getDecorations()}
    </div>
  )
}

export default PlayfulDecorations
