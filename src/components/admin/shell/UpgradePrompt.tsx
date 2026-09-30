'use client';

import { useRouter } from 'next/navigation';
import { PinPad } from './PinPad';

export function UpgradePrompt() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <PinPad title="Owner area" subtitle="Enter the admin code to open this page" onSuccess={() => router.refresh()} />
    </div>
  );
}
