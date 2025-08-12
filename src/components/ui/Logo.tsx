'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
}

export function Logo({ 
  size = 'md', 
  animate = true, 
  className, 
  showText = true,
  textSize = 'md'
}: LogoProps) {
  const sizes = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 80, height: 80 }
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  }

  const logoVariants = {
    idle: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.05,
      rotate: [0, -2, 2, 0],
      transition: { 
        duration: 0.6, 
        repeat: Infinity, 
        repeatType: "reverse" as const,
        ease: "easeInOut"
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
          src="/busy-bees-logo.png"
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
            'text-base'
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
