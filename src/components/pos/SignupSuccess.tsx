/**
 * POS Signup Success Message
 * Shows after successful POS account creation
 */

'use client';

import { Card } from '@/components/ui/Card';

interface SignupSuccessProps {
  customerName: string;
  email: string;
}

export function SignupSuccess({ customerName, email }: SignupSuccessProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created! 🎉
            </h2>
            <p className="text-gray-600">
              Welcome to Busy Bees, {customerName}!
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 text-center">
              <strong>📧 Check your email!</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2 text-center">
              We sent a verification link to:
            </p>
            <p className="text-sm font-semibold text-blue-900 mt-1 text-center">
              {email}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>You're all set!</strong> You can now:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>✓ Check in with your phone number</li>
              <li>✓ Purchase passes and book parties</li>
              <li>✓ Set up a password later to access your account online</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            This window will redirect automatically...
          </p>
        </Card>
      </div>
    </div>
  );
}

