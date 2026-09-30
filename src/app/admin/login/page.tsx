'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { PinPad } from '@/components/admin/shell/PinPad';
import { safeNext } from '@/lib/admin/nav';

function Login() {
  const router = useRouter();
  const to = safeNext(useSearchParams().get('to'));
  return (
    <main className="min-h-screen bg-pastel-cream flex flex-col items-center justify-center px-4">
      <div className="mb-6">
        <Logo size="lg" animate={false} showText={false} />
      </div>
      <PinPad
        title="Staff sign in"
        subtitle="Enter the staff or admin code"
        onSuccess={() => {
          router.replace(to);
          router.refresh();
        }}
      />
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
