/**
 * AuthGuard Component
 * Protects routes that require authentication
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'customer' | 'staff' | 'admin' | ('customer' | 'staff' | 'admin')[];
  redirectTo?: string;
}

export function AuthGuard({ children, requireRole, redirectTo = '/customer/login' }: AuthGuardProps) {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // Check role requirements
      if (requireRole && profile) {
        const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
        if (!requiredRoles.includes(profile.role)) {
          // Unauthorized - redirect based on user role
          if (profile.role === 'customer') {
            router.push('/customer/dashboard');
          } else {
            router.push('/pos');
          }
        }
      }
    }
  }, [user, profile, loading, requireRole, redirectTo, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check role
  if (requireRole && profile) {
    const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!requiredRoles.includes(profile.role)) {
      return null;
    }
  }

  return <>{children}</>;
}

