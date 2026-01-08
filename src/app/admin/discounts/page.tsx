'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SiblingDiscountManager } from '@/components/admin/SiblingDiscountManager';
import { logger } from '@/lib/client-logger';

export default function DiscountsAdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is admin by trying to access admin endpoint
        const response = await fetch('/api/admin/sibling-discounts');
        if (response.status === 401) {
          router.push('/auth/staff');
          return;
        }
        if (response.status === 403) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }
        setIsAuthorized(true);
      } catch (error) {
        logger.error({ error }, 'Error checking authorization');
        router.push('/auth/staff');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You need admin privileges to access the discount management page.
            </p>
            <Button onClick={() => router.push('/pos')}>
              Return to POS
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discount Management</h1>
            <p className="text-gray-600 mt-1">
              Configure sibling discounts for monthly memberships
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/pos')}>
            Back to POS
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                How Sibling Discounts Work
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Sibling discounts apply only to <strong>monthly memberships</strong>
                  </li>
                  <li>
                    The 1st child always pays full price
                  </li>
                  <li>
                    Subsequent children receive progressive discounts based on their position
                  </li>
                  <li>
                    Discounts are applied automatically at checkout when purchasing multiple monthly passes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Sibling Discount Manager */}
        <SiblingDiscountManager />

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => router.push('/admin/parties')}>
            Go to Party Management
          </Button>
        </div>
      </div>
    </div>
  );
}
