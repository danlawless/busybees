'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import type { Level } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';
import { pinErrorMessage } from './pin-messages';

type Props = { title: string; subtitle?: string; onSuccess: (level: Level) => void };

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinPad({ title, subtitle, onSuccess }: Props) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const pinRef = useRef('');
  const busyRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const update = (next: string) => {
    pinRef.current = next;
    setPin(next);
  };

  const submit = useCallback(async (code: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccessRef.current(data.level as Level);
        return;
      }
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setMessage(pinErrorMessage(res.status, data));
    } catch {
      setMessage('Could not reach the server. Check the connection and try again.');
    } finally {
      update('');
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const press = useCallback(
    (k: string) => {
      if (busyRef.current || !k) return;
      if (k === 'del') return update(pinRef.current.slice(0, -1));
      if (pinRef.current.length >= 4) return;
      const next = pinRef.current + k;
      update(next);
      if (next.length === 4) void submit(next);
    },
    [submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <div className="w-full max-w-xs mx-auto text-center font-[Arial,sans-serif]">
      <h1 className="text-2xl font-bold text-charcoal-800">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-charcoal-800/70">{subtitle}</p>}
      <div
        className={cn('mt-6 flex justify-center gap-3', shake && 'animate-[shake_0.4s]')}
        role="img"
        aria-label={`${pin.length} of 4 digits entered`}
      >
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className={cn('h-4 w-4 rounded-full border-2 border-charcoal-800', i < pin.length && 'bg-honey-500 border-honey-500')}
          />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-5 text-sm text-red-700">{message}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Delete' : k}
              className="h-16 rounded-2xl bg-white text-2xl font-semibold text-charcoal-800 shadow-sm ring-1 ring-charcoal-800/10 active:scale-95 disabled:opacity-50"
            >
              {k === 'del' ? <Delete className="mx-auto h-6 w-6" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
