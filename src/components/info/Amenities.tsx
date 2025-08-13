'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Baby, 
  Play, 
  Coffee, 
  PartyPopper, 
  Car, 
  Shirt, 
  Shield, 
  Volume2,
  Utensils,
  Heart,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { fadeInUp, staggerContainer } from '@/lib/utils'

const playAreas = [
  {
    icon: Baby,
    title: 'Infant Play Area (0-2 years)',
    description: 'Dedicated safe space for our youngest visitors',
    features: [
      'Gated area for safety',
      'Soft play structures',
      'Sensory toys and activities',
      'Age-appropriate climbing equipment',
      'Quiet space for feeding and changing'
    ],
    color: 'bg-secondary-100 text-secondary-600'
  },
  {
    icon: Play,
    title: 'Main Play Area (2-6 years)',
    description: 'Adventure playground for active toddlers and children',
    features: [
      'Large CedarWorks play structure',
      'Indoor swing set',
      'Train table with accessories',
      'Climbing structures and slides',
      'Interactive play panels'
    ],
    color: 'bg-primary-100 text-primary-600'
  },
  {
    icon: Coffee,
    title: 'Designated Eating Area',
    description: 'Comfortable space for families to relax and refuel',
    features: [
      'Tables and seating for families',
      'High chairs available',
      'Snack bar with healthy options',
      'Drinks and refreshments',
      'Clean, comfortable environment'
    ],
    color: 'bg-accent-100 text-accent-600'
  },
  {
    icon: PartyPopper,
    title: 'Private Party Room',
    description: 'Exclusive space for birthday celebrations',
    features: [
      'Seats up to 25 guests',
      'Tables, chairs, and decorations',
      'Private entrance to play area',
      'Dedicated party host',
      'Sound system for music'
    ],
    color: 'bg-pink-100 text-pink-600'
  }
]

const amenities = [
  {
    icon: Car,
    title: 'Ample Parking',
    description: 'Convenient parking spaces for easy family access'
  },
  {
    icon: Shirt,
    title: 'Shoe Storage',
    description: 'Cubbies for shoes and hooks for coats and bags'
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Soft flooring, cleanable surfaces, and safety gates'
  },
  {
    icon: Volume2,
    title: 'Sound System',
    description: 'Integrated speakers for ambient music and announcements'
  },
  {
    icon: Utensils,
    title: 'Snack Bar',
    description: 'Healthy snacks, drinks, and treats available for purchase'
  },
  {
    icon: Sparkles,
    title: 'Grip Socks',
    description: 'Non-slip socks available for purchase for safer play'
  }
]

const specialFeatures = [
  {
    title: 'Bee-Themed Decor',
    description: 'Educational bee facts and pollinator track throughout the space'
  },
  {
    title: 'Queen Bee Experience',
    description: 'Special birthday child gets crown, cloak, and honeycomb staff'
  },
  {
    title: 'Climate Controlled',
    description: 'Comfortable temperature year-round with high ceilings'
  },
  {
    title: 'Easy Cleanup',
    description: 'All surfaces designed for quick and thorough sanitization'
  }
]

export function Amenities() {
}
