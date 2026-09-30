'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SiblingDiscountManager } from '@/components/admin/SiblingDiscountManager';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';

export default function DiscountsAdminPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto">
      <AdminPageHeader title="Sibling Discounts" />
      <div>
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
