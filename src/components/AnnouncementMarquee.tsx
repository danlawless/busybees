'use client';

import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  message: string;
  bg_color: string;
  text_color: string;
}

export function AnnouncementMarquee() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements/active');
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
        }
      } catch {
        // Silently fail — no announcements is fine
      }
    };

    fetchAnnouncements();
    // Refresh every 2 minutes to pick up new announcements
    const interval = setInterval(fetchAnnouncements, 120000);
    return () => clearInterval(interval);
  }, []);

  if (announcements.length === 0) return null;

  // Combine all messages with a separator
  const combinedMessage = announcements.map(a => a.message).join('     ★     ');
  // Use the first announcement's colors
  const bgColor = announcements[0].bg_color || '#f59e0b';
  const textColor = announcements[0].text_color || '#78350f';

  return (
    <div
      className="relative overflow-hidden py-2 z-50"
      style={{ backgroundColor: bgColor }}
    >
      <div className="marquee-container">
        <div className="marquee-content">
          <span
            className="inline-block text-sm font-semibold whitespace-nowrap px-8"
            style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            📢 {combinedMessage}
          </span>
          <span
            className="inline-block text-sm font-semibold whitespace-nowrap px-8"
            style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            📢 {combinedMessage}
          </span>
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          width: 100%;
          overflow: hidden;
        }
        .marquee-content {
          display: inline-flex;
          animation: marquee-scroll 30s linear infinite;
        }
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee-content:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
