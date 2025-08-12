'use client'

import React from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'

interface ImagePlaceholderProps {
  src?: string
  alt: string
  description: string
  className?: string
  aspectRatio?: '4/3' | '16/9' | '1/1' | '3/4'
  priority?: boolean
}

export function ImagePlaceholder({ 
  src, 
  alt, 
  description, 
  className = '', 
  aspectRatio = '4/3',
  priority = false 
}: ImagePlaceholderProps) {
  const aspectClasses = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '1/1': 'aspect-square',
    '3/4': 'aspect-[3/4]'
  }

  if (src) {
    return (
      <div className={`${aspectClasses[aspectRatio]} relative overflow-hidden rounded-2xl ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    )
  }

  // Placeholder when no image is provided
  return (
    <div className={`${aspectClasses[aspectRatio]} bg-gradient-to-br from-honey-100 via-honey-200 to-honey-300 flex items-center justify-center relative overflow-hidden rounded-2xl ${className}`}>
      <div className="text-center text-charcoal-600 z-10 p-4">
        <div className="w-16 h-16 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-3 hexagon-shape">
          <Camera className="w-8 h-8 text-charcoal-600" />
        </div>
        <p className="text-sm font-medium px-4">{description}</p>
      </div>
    </div>
  )
}
