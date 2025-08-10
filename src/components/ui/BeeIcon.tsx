'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BeeIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  className?: string
}

export function BeeIcon({ size = 'md', animate = true, className }: BeeIconProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const beeVariants = {
    idle: { rotate: 0, y: 0 },
    hover: { rotate: [0, -5, 5, 0], y: [-2, 0, -2, 0] }
  }

  return (
    <motion.div
      className={cn(sizes[size], className)}
      variants={animate ? beeVariants : undefined}
      initial="idle"
      whileHover="hover"
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Bee Body */}
        <ellipse cx="12" cy="14" rx="4" ry="6" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
        
        {/* Bee Stripes */}
        <rect x="8" y="11" width="8" height="1" fill="#92400E" rx="0.5"/>
        <rect x="8" y="13" width="8" height="1" fill="#92400E" rx="0.5"/>
        <rect x="8" y="15" width="8" height="1" fill="#92400E" rx="0.5"/>
        <rect x="8" y="17" width="8" height="1" fill="#92400E" rx="0.5"/>
        
        {/* Bee Head */}
        <circle cx="12" cy="8" r="3" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
        
        {/* Eyes */}
        <circle cx="10.5" cy="7.5" r="0.8" fill="#1F2937"/>
        <circle cx="13.5" cy="7.5" r="0.8" fill="#1F2937"/>
        <circle cx="10.7" cy="7.3" r="0.3" fill="white"/>
        <circle cx="13.7" cy="7.3" r="0.3" fill="white"/>
        
        {/* Antennae */}
        <line x1="10.5" y1="5.5" x2="9.5" y2="4" stroke="#92400E" strokeWidth="1" strokeLinecap="round"/>
        <line x1="13.5" y1="5.5" x2="14.5" y2="4" stroke="#92400E" strokeWidth="1" strokeLinecap="round"/>
        <circle cx="9.5" cy="4" r="0.5" fill="#92400E"/>
        <circle cx="14.5" cy="4" r="0.5" fill="#92400E"/>
        
        {/* Wings */}
        <ellipse cx="9" cy="10" rx="2.5" ry="1.5" fill="white" fillOpacity="0.7" stroke="#E5E7EB" strokeWidth="0.5"/>
        <ellipse cx="15" cy="10" rx="2.5" ry="1.5" fill="white" fillOpacity="0.7" stroke="#E5E7EB" strokeWidth="0.5"/>
      </svg>
    </motion.div>
  )
}

// Honeycomb Pattern Component
export function HoneycombPattern({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 opacity-10", className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 60 60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="honeycomb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <polygon points="30,2 45,12 45,28 30,38 15,28 15,12" fill="none" stroke="#F59E0B" strokeWidth="1"/>
            <polygon points="0,17 15,27 15,43 0,53 -15,43 -15,27" fill="none" stroke="#F59E0B" strokeWidth="1"/>
            <polygon points="60,17 75,27 75,43 60,53 45,43 45,27" fill="none" stroke="#F59E0B" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)" />
      </svg>
    </div>
  )
}
