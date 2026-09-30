'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Level } from '@/lib/admin/nav';
import { needsUpgrade } from '@/lib/admin/upgrade';
import { UpgradePrompt } from './UpgradePrompt';

/** Re-evaluates on every client navigation, since layouts do not re-render on soft navigation. */
export function UpgradeGate({ level, children }: { level: Level; children: ReactNode }) {
  const pathname = usePathname();
  return needsUpgrade(pathname, level) ? <UpgradePrompt /> : <>{children}</>;
}
