'use client';

import { useState } from 'react';

/**
 * Small "copy invitation link" control for the party host to share with guests.
 */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — select the text as a fallback
      window.prompt('Copy this invitation link:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-charcoal-800 shadow-sm ring-1 ring-primary-300/50 transition hover:bg-white"
    >
      {copied ? '✓ Link copied!' : '🔗 Copy invitation link'}
    </button>
  );
}
