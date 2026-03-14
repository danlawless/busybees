'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function WeekendBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const day = new Date().getDay();
    setVisible(day === 0 || day === 6);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-3 text-center relative" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <p className="text-sm sm:text-base font-semibold pr-8">
        🎂 We are open to the public from 9:00 AM to 12:30 PM for general play. Beginning at 1:00 PM through 5:30 PM, our space is reserved for scheduled birthday parties and private events.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-600 rounded-full transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
