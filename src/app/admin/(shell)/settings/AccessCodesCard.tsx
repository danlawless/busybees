'use client';

import { useState } from 'react';

export function AccessCodesCard() {
  const [status, setStatus] = useState<string | null>(null);

  async function save(kind: 'staff' | 'admin', form: HTMLFormElement) {
    const pin = (form.elements.namedItem('pin') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;
    if (!/^\d{4}$/.test(pin)) return setStatus('Codes are exactly 4 digits.');
    if (pin !== confirm) return setStatus("The two entries didn't match.");
    let message = 'Could not save. Please try again.';
    try {
      const res = await fetch('/api/admin/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, pin }) });
      if (res.ok) {
        message = `${kind === 'admin' ? 'Admin' : 'Staff'} code updated.`;
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error === 'same-as-other') message = 'The staff and admin codes must be different.';
      }
    } catch {
      // keep the default message
    }
    setStatus(message);
    form.reset();
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-charcoal-800/10">
      <h2 className="text-lg font-bold text-charcoal-800">Access codes</h2>
      <p className="mt-1 text-sm text-charcoal-800/70">The staff code opens everything except the Owner area. The admin code opens everything.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {(['staff', 'admin'] as const).map(kind => (
          <form key={kind} onSubmit={e => { e.preventDefault(); void save(kind, e.currentTarget); }} className="space-y-2">
            <h3 className="font-semibold">{kind === 'admin' ? 'Admin code' : 'Staff code'}</h3>
            <input name="pin" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="New code" className="w-full rounded-lg border px-3 py-2" type="password" />
            <input name="confirm" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Repeat code" className="w-full rounded-lg border px-3 py-2" type="password" />
            <button className="rounded-lg bg-honey-500 px-4 py-2 font-semibold text-charcoal-800">Save</button>
          </form>
        ))}
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-charcoal-800">{status}</p>
    </section>
  );
}
