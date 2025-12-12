'use client';

import React from 'react';
import Image from 'next/image';
import { Gift, MapPin, Globe } from 'lucide-react';

interface GiftCardPreviewProps {
  amount: number;
  recipientName: string;
  purchaserName: string;
  personalMessage?: string;
  code?: string;
}

export function GiftCardPreview({
  amount,
  recipientName,
  purchaserName,
  personalMessage,
  code = 'BBGC-XXXX-XXXX-XXXX',
}: GiftCardPreviewProps) {
  return (
    <div className="max-w-xl mx-auto">
      {/* Email Preview Container */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 p-6 text-center relative overflow-hidden">
          {/* Honeycomb pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="preview-honeycomb" patternUnits="userSpaceOnUse" width="15" height="13">
                <polygon
                  points="7.5,0 15,4.33 15,13 7.5,17.32 0,13 0,4.33"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.3"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#preview-honeycomb)" />
            </svg>
          </div>

          <div className="relative">
            <div className="inline-block mb-3">
              <Image
                src="/busy-bees-logo.png"
                alt="Busy Bees"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h1 className="text-white text-2xl font-bold drop-shadow-md">
              You&apos;ve Received a Gift!
            </h1>
          </div>
        </div>

        {/* Gift Card Body */}
        <div className="p-8">
          {/* Recipient Greeting */}
          <div className="text-center mb-6">
            <p className="text-charcoal-600 text-lg">
              Hi <span className="font-semibold text-charcoal-800">{recipientName || 'Friend'}</span>!
            </p>
            <p className="text-charcoal-600">
              <span className="font-semibold text-charcoal-800">{purchaserName || 'Someone special'}</span>{' '}
              sent you a Busy Bees gift card!
            </p>
          </div>

          {/* Gift Card Visual */}
          <div className="relative mb-6">
            <div className="w-full aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 shadow-lg p-6 flex flex-col justify-between overflow-hidden">
              {/* Honeycomb overlay */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <pattern id="card-honeycomb" patternUnits="userSpaceOnUse" width="12" height="10.4">
                    <polygon
                      points="6,0 12,3.46 12,10.4 6,13.86 0,10.4 0,3.46"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.3"
                    />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#card-honeycomb)" />
                </svg>
              </div>

              {/* Card Content */}
              <div className="relative flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-xs uppercase tracking-wider font-medium">Gift Card</p>
                  <div className="flex items-center mt-1">
                    <Gift className="w-5 h-5 text-white mr-2" />
                    <span className="text-white font-bold text-sm">BUSY BEES</span>
                  </div>
                </div>
                <Image
                  src="/busy-bees-logo.png"
                  alt=""
                  width={50}
                  height={50}
                  className="opacity-90"
                />
              </div>

              <div className="relative">
                <p className="text-white/80 text-xs uppercase tracking-wider font-medium mb-1">Value</p>
                <p className="text-white font-bold text-4xl">${amount.toFixed(2)}</p>
              </div>

              <div className="relative">
                <p className="text-white/80 text-xs uppercase tracking-wider font-medium mb-1">Redemption Code</p>
                <p className="text-white font-mono text-lg tracking-wide">{code}</p>
              </div>
            </div>
          </div>

          {/* Personal Message */}
          {personalMessage && (
            <div className="bg-amber-50 rounded-xl p-5 mb-6 border border-amber-100">
              <p className="text-sm text-amber-700 font-medium mb-2">Personal Message:</p>
              <p className="text-charcoal-700 italic">&ldquo;{personalMessage}&rdquo;</p>
              <p className="text-right text-charcoal-600 mt-2">— {purchaserName}</p>
            </div>
          )}

          {/* How to Redeem */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-charcoal-800 mb-3 flex items-center">
              <Gift className="w-5 h-5 text-amber-600 mr-2" />
              How to Redeem
            </h3>
            <ol className="space-y-2 text-sm text-charcoal-600">
              <li className="flex items-start">
                <span className="font-bold text-amber-600 mr-2">1.</span>
                Visit busybeesipc.com/gift-cards
              </li>
              <li className="flex items-start">
                <span className="font-bold text-amber-600 mr-2">2.</span>
                Click &ldquo;Redeem Gift Card&rdquo;
              </li>
              <li className="flex items-start">
                <span className="font-bold text-amber-600 mr-2">3.</span>
                Enter your code: <span className="font-mono bg-white px-2 py-0.5 rounded">{code}</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-amber-600 mr-2">4.</span>
                Credit will be added to your account instantly!
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-6">
            <div className="inline-block bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold px-8 py-3 rounded-full shadow-md">
              Redeem Your Gift Card
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-charcoal-500 border-t border-gray-100 pt-6">
            <div className="flex items-center justify-center mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Visit us at Busy Bees Indoor Play Center</span>
            </div>
            <div className="flex items-center justify-center">
              <Globe className="w-4 h-4 mr-1" />
              <span>busybeesipc.com</span>
            </div>
            <p className="mt-4 text-xs text-charcoal-400">
              This gift card never expires. Valid for all purchases at Busy Bees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

