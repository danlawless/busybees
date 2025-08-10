import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Animation variants for Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
}

// Utility functions for pricing
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Age group helpers
export function getAgeGroupLabel(ageGroup: 'infant' | 'toddler' | 'child'): string {
  const labels = {
    infant: '0-2 years',
    toddler: '2-4 years',
    child: '4-6 years'
  }
  return labels[ageGroup]
}

// Business hours helpers
export function isOpen(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours()
  
  // Mon-Fri: 10 AM - 5 PM
  if (day >= 1 && day <= 5) {
    return hour >= 10 && hour < 17
  }
  
  // Sat-Sun: 9 AM - 12 PM (open play)
  if (day === 0 || day === 6) {
    return hour >= 9 && hour < 12
  }
  
  return false
}

export function getBusinessHours(day?: number): string {
  const currentDay = day ?? new Date().getDay()
  
  // Mon-Fri
  if (currentDay >= 1 && currentDay <= 5) {
    return '10:00 AM - 5:00 PM'
  }
  
  // Sat-Sun
  if (currentDay === 0 || currentDay === 6) {
    return '9:00 AM - 12:00 PM (Open Play)'
  }
  
  return 'Closed'
}
