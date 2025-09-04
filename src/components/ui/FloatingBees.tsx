'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface FloatingBeesProps {
  count?: number
  enabled?: boolean
}

const beeImages = ['/bee1.png', '/bee2.png', '/bee3.png']

export function FloatingBees({ count = 3, enabled = true }: FloatingBeesProps) {
  const [bees, setBees] = useState<Array<{
    id: number
    image: string
    initialX: number
    initialY: number
    delay: number
  }>>([])

  useEffect(() => {
    if (!enabled) return

    const newBees = Array.from({ length: count }, (_, i) => ({
      id: i,
      image: beeImages[Math.floor(Math.random() * beeImages.length)],
      initialX: Math.random() * 80 + 10, // 10% to 90% of screen width
      initialY: Math.random() * 60 + 20, // 20% to 80% of screen height
      delay: Math.random() * 2
    }))

    setBees(newBees)
  }, [count, enabled])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-10 hidden lg:block">
      <AnimatePresence>
        {bees.map((bee) => (
          <motion.div
            key={bee.id}
            className="absolute"
            initial={{ 
              x: `${bee.initialX}vw`, 
              y: `${bee.initialY}vh`,
              opacity: 0
            }}
            animate={{ 
              x: [`${bee.initialX}vw`, `${bee.initialX + 10}vw`, `${bee.initialX - 5}vw`, `${bee.initialX}vw`],
              y: [`${bee.initialY}vh`, `${bee.initialY - 10}vh`, `${bee.initialY + 5}vh`, `${bee.initialY}vh`],
              rotate: [0, 10, -5, 0],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: bee.delay,
              ease: "easeInOut"
            }}
          >
            <Image
              src={bee.image}
              alt=""
              width={32}
              height={32}
              className="w-6 h-6 md:w-8 md:h-8"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default FloatingBees
