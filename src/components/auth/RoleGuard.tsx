/**
 * RoleGuard Component
 * Conditionally renders content based on user role
 */

'use client';

import { useUser } from '@/hooks/useUser';

interface RoleGuardProps {
  children: React.ReactNode;
  requireRole: 'customer' | 'staff' | 'admin' | ('customer' | 'staff' | 'admin')[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requireRole, fallback = null }: RoleGuardProps) {
  const { profile, loading } = useUser();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!profile) {
    return <>{fallback}</>;
  }

  const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];

  if (!requiredRoles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

