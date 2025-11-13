'use client';

import { motion } from 'framer-motion';
import { PromoSpecial, getPromoStatus } from '@/lib/utils/promoHelpers';

interface BannerStyleProps {
  promo: PromoSpecial;
  children: React.ReactNode;
}

/**
 * Style 1: Honeycomb (Original - with animated bees and honeycomb pattern)
 */
export function HoneycombStyle({ children }: BannerStyleProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 border-b-2 border-yellow-600">
      {/* Animated honeycomb background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='%23000' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Animated bees */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 text-2xl"
          style={{ transform: 'scaleX(-1)' }}
          animate={{ x: ['-100%', '100vw'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          🐝
        </motion.div>
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 text-xl"
          animate={{ x: ['100vw', '-100%'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear', delay: 5 }}
        >
          🐝
        </motion.div>
      </div>

      {children}
    </div>
  );
}

/**
 * Style 2: Gradient Wave (Smooth flowing gradient with wave animation)
 */
export function GradientWaveStyle({ children }: BannerStyleProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 border-b-2 border-purple-700">
      {/* Animated wave pattern */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.3) 50px, rgba(255,255,255,0.3) 100px)',
        }}
        animate={{ x: [0, 100] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 text-2xl"
          animate={{ y: [-20, 20, -20], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ✨
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-1/3 text-xl"
          animate={{ y: [20, -20, 20], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        >
          ⭐
        </motion.div>
      </div>

      {children}
    </div>
  );
}

/**
 * Style 3: Confetti (Festive with falling confetti animation)
 */
export function ConfettiStyle({ children }: BannerStyleProps) {
  const confettiPieces = Array.from({ length: 15 }, (_, i) => i);
  const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-pink-500', 'text-purple-500'];
  const shapes = ['●', '■', '▲', '★'];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-b-2 border-blue-800">
      {/* Falling confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((i) => (
          <motion.div
            key={i}
            className={`absolute text-2xl ${colors[i % colors.length]}`}
            style={{ left: `${(i * 7) % 100}%`, top: '-10%' }}
            animate={{
              y: ['0vh', '110vh'],
              rotate: [0, 360],
              x: [0, Math.sin(i) * 50],
            }}
            transition={{
              duration: 5 + (i % 3),
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'linear',
            }}
          >
            {shapes[i % shapes.length]}
          </motion.div>
        ))}
      </div>

      {children}
    </div>
  );
}

/**
 * Style 4: Minimal (Clean, professional look)
 */
export function MinimalStyle({ children }: BannerStyleProps) {
  return (
    <div className="relative overflow-hidden bg-white border-b border-gray-200">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-60" />

      <div className="relative text-gray-900">
        {children}
      </div>
    </div>
  );
}

/**
 * Style 5: Bold Stripes (High contrast with diagonal stripes)
 */
export function BoldStripesStyle({ children }: BannerStyleProps) {
  return (
    <div className="relative overflow-hidden bg-black border-b-2 border-yellow-400">
      {/* Animated diagonal stripes */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(45deg, #000 0px, #000 20px, #fbbf24 20px, #fbbf24 40px)',
        }}
        animate={{ backgroundPosition: ['0px 0px', '56.57px 56.57px'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative text-white">
        {children}
      </div>
    </div>
  );
}

/**
 * Get the appropriate banner style component
 */
export function getBannerStyleComponent(style?: string) {
  switch (style) {
    case 'gradient-wave':
      return GradientWaveStyle;
    case 'confetti':
      return ConfettiStyle;
    case 'minimal':
      return MinimalStyle;
    case 'bold-stripes':
      return BoldStripesStyle;
    case 'honeycomb':
    default:
      return HoneycombStyle;
  }
}

