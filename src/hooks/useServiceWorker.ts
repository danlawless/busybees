'use client';

import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/pos/' })
      .then((registration) => {
        // Auto-reload when a new service worker is installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New SW activated — reload to pick up fresh assets
              window.location.reload();
            }
          });
        });
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });

    // Reload when a different SW takes control (e.g. skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);
}
