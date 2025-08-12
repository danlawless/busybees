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
  variant?: 'light' | 'medium' | 'dark' | 'subtle' | 'dense' | 'scattered'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

export function HoneycombPattern({ className, variant = 'light', size = 'md', animated = false }: HoneycombPatternProps) {
  const sizes = {
    sm: '30 30',
    md: '50 50', 
    lg: '70 70',
    xl: '100 100'
  }

  const variants = {
    light: { stroke: '#f5d565', fill: 'none', opacity: 'opacity-6' },
    medium: { stroke: '#e6b800', fill: 'none', opacity: 'opacity-12' },
    dark: { stroke: '#b89000', fill: 'none', opacity: 'opacity-18' },
    subtle: { stroke: '#fff9e6', fill: '#fffef9', opacity: 'opacity-4' },
    dense: { stroke: '#f0c674', fill: '#fff9e6', opacity: 'opacity-15' },
    scattered: { stroke: '#f5d565', fill: 'none', opacity: 'opacity-8' }
  }

  const patternSize = sizes[size]
  const { stroke, fill, opacity } = variants[variant]
  const patternId = `honeycomb-${variant}-${size}-${animated ? 'animated' : 'static'}`

  return (
    <div className={cn("absolute inset-0 pointer-events-none", opacity, className)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${patternSize.split(' ')[0]} ${patternSize.split(' ')[1]}`}
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-full", animated && "animate-pulse")}
      >
        <defs>
          <pattern 
            id={patternId} 
            x="0" 
            y="0" 
            width={patternSize.split(' ')[0]} 
            height={patternSize.split(' ')[1]} 
            patternUnits="userSpaceOnUse"
          >
            {/* Perfect hexagon calculations */}
            {(() => {
              const w = parseInt(patternSize.split(' ')[0])
              const h = parseInt(patternSize.split(' ')[1])
              const centerX = w / 2
              const centerY = h / 2
              const radius = Math.min(w, h) * 0.3
              
              // Generate hexagon points
              const hexPoints = []
              for (let i = 0; i < 6; i++) {
                const angle = (i * 60 - 30) * (Math.PI / 180)
                const x = centerX + radius * Math.cos(angle)
                const y = centerY + radius * Math.sin(angle)
                hexPoints.push(`${x},${y}`)
              }
              
              return (
                <>
                  {/* Main center hexagon */}
                  <polygon 
                    points={hexPoints.join(' ')}
                    fill={fill} 
                    stroke={stroke} 
                    strokeWidth="1.2"
                    className={animated ? "animate-pulse" : ""}
                  />
                  
                  {/* Surrounding hexagons for seamless tiling */}
                  {variant === 'dense' && (
                    <>
                      {/* Top hexagon */}
                      <polygon 
                        points={hexPoints.map(point => {
                          const [x, y] = point.split(',').map(Number)
                          return `${x},${y - h * 0.6}`
                        }).join(' ')}
                        fill={fill} 
                        stroke={stroke} 
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      
                      {/* Bottom hexagon */}
                      <polygon 
                        points={hexPoints.map(point => {
                          const [x, y] = point.split(',').map(Number)
                          return `${x},${y + h * 0.6}`
                        }).join(' ')}
                        fill={fill} 
                        stroke={stroke} 
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      
                      {/* Left hexagon */}
                      <polygon 
                        points={hexPoints.map(point => {
                          const [x, y] = point.split(',').map(Number)
                          return `${x - w * 0.75},${y}`
                        }).join(' ')}
                        fill={fill} 
                        stroke={stroke} 
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      
                      {/* Right hexagon */}
                      <polygon 
                        points={hexPoints.map(point => {
                          const [x, y] = point.split(',').map(Number)
                          return `${x + w * 0.75},${y}`
                        }).join(' ')}
                        fill={fill} 
                        stroke={stroke} 
                        strokeWidth="1"
                        opacity="0.6"
                      />
                    </>
                  )}
                </>
              )
            })()}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  )
}

// Hexagonal Content Grid
interface HexGridProps {
  children: React.ReactNode[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function HexGrid({ children, className, size = 'md', animated = false }: HexGridProps) {
  const sizes = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  }

  return (
    <div className={cn("grid grid-cols-3 gap-4 max-w-4xl mx-auto", className)}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          className={cn(
            "relative flex items-center justify-center",
            sizes[size],
            animated && "hover:scale-105 transition-transform duration-300"
          )}
          style={{
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            background: 'linear-gradient(135deg, rgba(245, 213, 101, 0.1), rgba(255, 249, 230, 0.2))',
            border: '2px solid rgba(245, 213, 101, 0.3)'
          }}
          whileHover={animated ? { scale: 1.05 } : undefined}
        >
          <div className="text-center p-4">
            {child}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Enhanced Floating Honeycomb Elements with Animation
export function FloatingHoneycombs({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Animated hexagon cluster - top left */}
      <motion.div 
        className="absolute -top-16 -left-16 w-40 h-40 opacity-8"
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Central hexagon */}
          <polygon 
            points="60,20 85,35 85,65 60,80 35,65 35,35" 
            fill="rgba(245, 213, 101, 0.1)" 
            stroke="#f5d565" 
            strokeWidth="2"
          />
          {/* Surrounding hexagons */}
          <polygon 
            points="60,5 75,12 75,28 60,35 45,28 45,12" 
            fill="none" 
            stroke="#f0c674" 
            strokeWidth="1"
          />
          <polygon 
            points="85,10 100,17 100,33 85,40 70,33 70,17" 
            fill="none" 
            stroke="#f0c674" 
            strokeWidth="1"
          />
          <polygon 
            points="35,10 50,17 50,33 35,40 20,33 20,17" 
            fill="none" 
            stroke="#f0c674" 
            strokeWidth="1"
          />
        </svg>
      </motion.div>
      
      {/* Pulsing hexagon - top right */}
      <motion.div 
        className="absolute -top-8 -right-8 w-24 h-24 opacity-12"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.12, 0.2, 0.12]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="50,15 70,27 70,53 50,65 30,53 30,27" 
            fill="rgba(255, 249, 230, 0.3)" 
            stroke="#e6b800" 
            strokeWidth="2"
          />
          <polygon 
            points="50,25 60,31 60,43 50,49 40,43 40,31" 
            fill="rgba(245, 213, 101, 0.2)" 
            stroke="#f5d565" 
            strokeWidth="1"
          />
        </svg>
      </motion.div>
      
      {/* Floating hexagon chain - bottom */}
      <motion.div 
        className="absolute -bottom-12 left-1/4 w-48 h-16 opacity-6"
        animate={{ 
          x: [0, 20, 0],
          y: [0, -5, 0]
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg viewBox="0 0 200 60" className="w-full h-full">
          <polygon 
            points="30,15 40,21 40,33 30,39 20,33 20,21" 
            fill="none" 
            stroke="#f5d565" 
            strokeWidth="1.5"
          />
          <polygon 
            points="70,15 80,21 80,33 70,39 60,33 60,21" 
            fill="rgba(255, 249, 230, 0.1)" 
            stroke="#f0c674" 
            strokeWidth="1.5"
          />
          <polygon 
            points="110,15 120,21 120,33 110,39 100,33 100,21" 
            fill="none" 
            stroke="#e6b800" 
            strokeWidth="1.5"
          />
          <polygon 
            points="150,15 160,21 160,33 150,39 140,33 140,21" 
            fill="rgba(245, 213, 101, 0.05)" 
            stroke="#f5d565" 
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>
      
      {/* Small animated hexagon - bottom right */}
      <motion.div 
        className="absolute -bottom-6 -right-6 w-16 h-16 opacity-10"
        animate={{ 
          rotate: [0, -360],
          scale: [0.8, 1, 0.8]
        }}
        transition={{ 
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <polygon 
            points="40,15 55,23 55,37 40,45 25,37 25,23" 
            fill="rgba(255, 249, 230, 0.2)" 
            stroke="#f0c674" 
            strokeWidth="2"
          />
        </svg>
      </motion.div>
    </div>
  )
}
