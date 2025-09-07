'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  animate?: boolean
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Logo({ 
  size = 'md', 
  animate = true, 
  className, 
  showText = true,
  textSize = 'md'
}: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 240, height: 80 },
    xl: { width: 300, height: 100 },
    '2xl': { width: 360, height: 120 },
    '3xl': { width: 480, height: 160 }
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  }

  const logoVariants = {
    idle: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.05,
      rotate: [0, -2, 2, 0],
      transition: { 
        duration: 0.6, 
        repeat: Infinity, 
        repeatType: "reverse" as const
      }
    }
  }

  const { width, height } = sizes[size]

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <motion.div
        className="relative"
        variants={animate ? logoVariants : undefined}
        initial="idle"
        whileHover={animate ? "hover" : undefined}
      >
        <Image
          src="/busy-bees-logo-long.png"
          alt="Busy Bees Indoor Play Center Logo"
          width={width}
          height={height}
          className="object-contain drop-shadow-sm"
          priority
        />
      </motion.div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-charcoal-800", textSizes[textSize])}>
            Busy Bees
          </span>
          <span className={cn("text-charcoal-600", 
            textSize === 'sm' ? 'text-xs' : 
            textSize === 'md' ? 'text-sm' : 
            textSize === 'lg' ? 'text-base' :
            'text-lg'
          )}>
            Indoor Play Center
          </span>
        </div>
      )}
    </div>
  )
}

// Compact version for smaller spaces
export function LogoCompact({ size = 'sm', animate = true, className }: Omit<LogoProps, 'showText' | 'textSize'>) {
  return (
    <Logo 
      size={size} 
      animate={animate} 
      className={className} 
      showText={false} 
    />
  )
}
