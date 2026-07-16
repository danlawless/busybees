"use client";

import { useState, useRef, useEffect } from "react";

interface PosPinGateProps {
  onUnlock: () => void;
}

/**
 * Full-screen PIN lock shown before the POS is accessible. Verifies the entered
 * PIN server-side (/api/pos/verify-pin) and, on success, unlocks for the rest of
 * the browser session (the parent stores the unlock in sessionStorage).
 */
export function PosPinGate({ onUnlock }: PosPinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (value: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/pos/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (data?.valid) {
        onUnlock();
      } else {
        setError("Incorrect PIN. Please try again.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) submit(pin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-100 p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-4xl">
            🐝
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Staff Access</h1>
          <p className="mt-2 text-gray-600">
            Enter the PIN to open the Point of Sale.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label htmlFor="pos-pin" className="block text-center text-sm font-semibold text-gray-700">
            PIN
          </label>
          <input
            ref={inputRef}
            id="pos-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setError("");
              setPin(e.target.value.replace(/[^\d]/g, ""));
            }}
            className="w-full rounded-2xl border border-yellow-300 bg-white/80 px-4 py-4 text-center text-3xl tracking-[0.5em] text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="••••"
          />

          {error && (
            <p className="text-center text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 px-6 py-4 text-lg font-bold text-gray-900 shadow transition-all hover:from-yellow-500 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
