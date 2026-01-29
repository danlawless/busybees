'use client'

import React from 'react'

function BeeSVG({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wings */}
      <ellipse cx="11" cy="12" rx="4" ry="2.5" fill="white" fillOpacity="0.8" stroke="#e5e7eb" strokeWidth="0.5" className="bee-wing" />
      <ellipse cx="21" cy="12" rx="4" ry="2.5" fill="white" fillOpacity="0.8" stroke="#e5e7eb" strokeWidth="0.5" className="bee-wing" />
      {/* Body */}
      <ellipse cx="16" cy="18" rx="5" ry="7" fill="#FFC933" stroke="#FFB900" strokeWidth="1" />
      {/* Stripes */}
      <rect x="11" y="14" width="10" height="1.2" fill="#2B2B2B" rx="0.6" />
      <rect x="11" y="17" width="10" height="1.2" fill="#2B2B2B" rx="0.6" />
      <rect x="11" y="20" width="10" height="1.2" fill="#2B2B2B" rx="0.6" />
      {/* Head */}
      <circle cx="16" cy="10" r="4" fill="#FFC933" stroke="#FFB900" strokeWidth="1" />
      {/* Eyes */}
      <circle cx="14.2" cy="9.5" r="1" fill="#2B2B2B" />
      <circle cx="17.8" cy="9.5" r="1" fill="#2B2B2B" />
      <circle cx="14.5" cy="9.2" r="0.35" fill="white" />
      <circle cx="18.1" cy="9.2" r="0.35" fill="white" />
      {/* Antennae */}
      <line x1="14" y1="7" x2="12.5" y2="4.5" stroke="#4A4A4A" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="18" y1="7" x2="19.5" y2="4.5" stroke="#4A4A4A" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="12.5" cy="4.5" r="0.7" fill="#FFB900" />
      <circle cx="19.5" cy="4.5" r="0.7" fill="#FFB900" />
    </svg>
  )
}

export function FlyingBees() {
  return (
    <div aria-hidden="true">
      <div className="flying-bee flying-bee-1">
        <BeeSVG size={36} />
      </div>
      <div className="flying-bee flying-bee-2">
        <BeeSVG size={30} />
      </div>
      <div className="flying-bee flying-bee-3">
        <BeeSVG size={24} />
      </div>
    </div>
  )
}
