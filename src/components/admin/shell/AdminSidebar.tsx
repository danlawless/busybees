'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Globe, Lock, LogOut, Menu, X } from 'lucide-react';
import { navFor, type Level } from '@/lib/admin/nav';
import { activeHref } from '@/lib/admin/active-href';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

export function AdminSidebar({ level }: { level: Level }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = useMemo(() => navFor(level), [level]);
  const active = activeHref(pathname, groups.flatMap(g => g.items.map(i => i.href)));
  const activeGroup = groups.find(g => g.items.some(i => i.href === active))?.id ?? groups[0].id;
  const [open, setOpen] = useState(activeGroup);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setOpen(activeGroup); setDrawer(false); }, [activeGroup, pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  async function lock() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col bg-charcoal-800 font-[Arial,sans-serif] text-white">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="rounded-lg bg-white px-2 py-1">
          <Logo size="sm" animate={false} showText={false} className="[&_img]:h-8 [&_img]:w-auto" />
        </div>
      </div>
      <Link href="/" className="mx-3 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">
        <Globe className="h-4 w-4" /> View website
      </Link>
      <div className="flex-1 overflow-y-auto px-2">
        {groups.map(g => {
          const isOpen = open === g.id;
          const Icon = g.icon;
          return (
            <div key={g.id} className="mb-1">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : g.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{g.label}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-200', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} inert={!isOpen}>
                <ul className="overflow-hidden">
                  {g.items.map(i => {
                    const ItemIcon = i.icon;
                    const isActive = i.href === active;
                    return (
                      <li key={i.id}>
                        <Link
                          href={i.href}
                          onClick={() => setDrawer(false)}
                          target={i.external ? '_blank' : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                            isActive ? 'bg-honey-500 font-semibold text-charcoal-800' : 'text-white/90 hover:bg-white/10',
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          <span className="flex-1">{i.label}</span>
                          {i.locked && <Lock className="h-3.5 w-3.5 opacity-70" aria-label="Needs admin code" />}
                          {i.external && <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-label="Opens in a new tab" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-sm">
        <div className="mb-2 text-white/60">Signed in as {level === 'admin' ? 'Admin' : 'Staff'}</div>
        <button type="button" onClick={lock} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Lock
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-charcoal-800 px-4 py-3 text-white lg:hidden">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        <span className="font-[Arial,sans-serif] font-bold">Busy Bees</span>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 text-white"><X className="h-6 w-6" /></button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
