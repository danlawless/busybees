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

// Enhanced Honeycomb Pattern Components
interface HoneycombPatternProps {
  className?: string
  variant?: 'light' | 'medium' | 'dark' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
}

export function HoneycombPattern({ className, variant = 'light', size = 'md' }: HoneycombPatternProps) {
  const sizes = {
    sm: '40 40',
    md: '60 60', 
    lg: '80 80'
  }

  const variants = {
    light: { stroke: '#fbbf24', opacity: 'opacity-5' },
    medium: { stroke: '#f59e0b', opacity: 'opacity-10' },
    dark: { stroke: '#d97706', opacity: 'opacity-15' },
    subtle: { stroke: '#fef3c7', opacity: 'opacity-8' }
  }

  const patternSize = sizes[size]
  const { stroke, opacity } = variants[variant]

  return (
    <div className={cn("absolute inset-0 pointer-events-none", opacity, className)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${patternSize.split(' ')[0]} ${patternSize.split(' ')[1]}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <pattern 
            id={`honeycomb-${variant}-${size}`} 
            x="0" 
            y="0" 
            width={patternSize.split(' ')[0]} 
            height={patternSize.split(' ')[1]} 
            patternUnits="userSpaceOnUse"
          >
            {/* Main hexagon */}
            <polygon 
              points={`${parseInt(patternSize.split(' ')[0])/2},2 ${parseInt(patternSize.split(' ')[0])*0.75},${parseInt(patternSize.split(' ')[1])*0.2} ${parseInt(patternSize.split(' ')[0])*0.75},${parseInt(patternSize.split(' ')[1])*0.47} ${parseInt(patternSize.split(' ')[0])/2},${parseInt(patternSize.split(' ')[1])*0.63} ${parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.47} ${parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.2}`}
              fill="none" 
              stroke={stroke} 
              strokeWidth="0.8"
            />
            {/* Left hexagon */}
            <polygon 
              points={`0,${parseInt(patternSize.split(' ')[1])*0.28} ${parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.45} ${parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.72} 0,${parseInt(patternSize.split(' ')[1])*0.88} ${-parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.72} ${-parseInt(patternSize.split(' ')[0])*0.25},${parseInt(patternSize.split(' ')[1])*0.45}`}
              fill="none" 
              stroke={stroke} 
              strokeWidth="0.8"
            />
            {/* Right hexagon */}
            <polygon 
              points={`${parseInt(patternSize.split(' ')[0])},${parseInt(patternSize.split(' ')[1])*0.28} ${parseInt(patternSize.split(' ')[0])*1.25},${parseInt(patternSize.split(' ')[1])*0.45} ${parseInt(patternSize.split(' ')[0])*1.25},${parseInt(patternSize.split(' ')[1])*0.72} ${parseInt(patternSize.split(' ')[0])},${parseInt(patternSize.split(' ')[1])*0.88} ${parseInt(patternSize.split(' ')[0])*0.75},${parseInt(patternSize.split(' ')[1])*0.72} ${parseInt(patternSize.split(' ')[0])*0.75},${parseInt(patternSize.split(' ')[1])*0.45}`}
              fill="none" 
              stroke={stroke} 
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#honeycomb-${variant}-${size})`} />
      </svg>
    </div>
  )
}

// Floating Honeycomb Elements
export function FloatingHoneycombs({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Large floating honeycomb - top left */}
      <div className="absolute -top-10 -left-10 w-32 h-32 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="50,5 80,25 80,55 50,75 20,55 20,25" 
            fill="none" 
            stroke="#fbbf24" 
            strokeWidth="2"
          />
        </svg>
      </div>
      
      {/* Medium floating honeycomb - top right */}
      <div className="absolute -top-5 -right-5 w-20 h-20 opacity-8">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="50,10 75,30 75,50 50,70 25,50 25,30" 
            fill="#fef3c7" 
            stroke="#f59e0b" 
            strokeWidth="1.5"
          />
        </svg>
      </div>
      
      {/* Small floating honeycomb - bottom left */}
      <div className="absolute -bottom-8 -left-8 w-16 h-16 opacity-6">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="50,15 70,35 70,55 50,75 30,55 30,35" 
            fill="none" 
            stroke="#eab308" 
            strokeWidth="1.8"
          />
        </svg>
      </div>
      
      {/* Extra small honeycomb - bottom right */}
      <div className="absolute -bottom-3 -right-12 w-12 h-12 opacity-4">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="50,20 65,35 65,55 50,70 35,55 35,35" 
            fill="#fffaeb" 
            stroke="#d97706" 
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  )
}
