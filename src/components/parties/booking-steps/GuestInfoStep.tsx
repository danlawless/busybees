'use client';

import { useEffect, useState } from 'react';
import { Baby, Users, Gift, FileText, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ADDITIONAL_KIDS_PRICE,
  INCLUDED_KIDS,
  MAX_CHILDREN,
  PACKAGE_PRICING,
  calculateBookingPrice,
} from '@/lib/validations/party-booking';
import type { BookingFormData } from '../PartyBookingWizard';

interface GuestInfoStepProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onValidChange: (isValid: boolean) => void;
}

export function GuestInfoStep({ formData, onUpdate, onValidChange }: GuestInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate step
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.childName || formData.childName.trim().length === 0) {
      newErrors.childName = 'Birthday child\'s name is required';
    }

    if (formData.guestCount < 1) {
      newErrors.guestCount = 'At least 1 guest is required';
    } else if (formData.guestCount > MAX_CHILDREN) {
      newErrors.guestCount = `Maximum ${MAX_CHILDREN} children allowed`;
    }

    setErrors(newErrors);
    onValidChange(Object.keys(newErrors).length === 0);
  }, [formData.childName, formData.guestCount, onValidChange]);

  const handleGuestCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(MAX_CHILDREN, formData.guestCount + delta));
    onUpdate({ guestCount: newCount });
  };

  const pricing =
    formData.partyType && formData.packageName
      ? calculateBookingPrice(formData.packageName, formData.partyType, formData.guestCount)
      : null;

  const includedKids = formData.packageName
    ? PACKAGE_PRICING[formData.packageName].includedKids
    : INCLUDED_KIDS;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Party Details</h3>
        <p className="text-gray-600">
          Tell us about the birthday child and how many guests you&apos;re expecting.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Child's Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Baby className="w-4 h-4 inline mr-2" />
            Birthday Child&apos;s Name *
          </label>
          <input
            type="text"
            value={formData.childName}
            onChange={(e) => onUpdate({ childName: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500 ${
              errors.childName ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Enter birthday child's name"
          />
          {errors.childName && (
            <p className="text-red-500 text-sm mt-1">{errors.childName}</p>
          )}
        </div>

        {/* Child's Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Gift className="w-4 h-4 inline mr-2" />
            Child&apos;s Age (Optional)
          </label>
          <input
            type="number"
            min="0"
            max="12"
            value={formData.childAge ?? ''}
            onChange={(e) =>
              onUpdate({ childAge: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500"
            placeholder="Age (0-12)"
          />
        </div>
      </div>

      {/* Guest Count */}
      <Card className="p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          <Users className="w-4 h-4 inline mr-2" />
          Number of Children Attending
        </label>

        <div className="flex items-center justify-center gap-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleGuestCountChange(-1)}
            disabled={formData.guestCount <= 1}
            className="w-12 h-12 rounded-full"
          >
            <Minus className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="text-4xl font-bold text-charcoal-800">{formData.guestCount}</div>
            <div className="text-sm text-gray-500">children</div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleGuestCountChange(1)}
            disabled={formData.guestCount >= MAX_CHILDREN}
            className="w-12 h-12 rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Pricing Breakdown */}
        {pricing && (
          <div className="mt-6 pt-6 border-t">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Included children (up to {includedKids})</span>
                <span>Included</span>
              </div>

              {pricing.additionalKids > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>
                    Additional children ({pricing.additionalKids} × ${ADDITIONAL_KIDS_PRICE})
                  </span>
                  <span>+${pricing.additionalKidsPrice}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {errors.guestCount && (
          <p className="text-red-500 text-sm mt-4 text-center">{errors.guestCount}</p>
        )}
      </Card>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Special Notes or Requests (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500"
          rows={4}
          placeholder="Theme preferences, dietary restrictions, special accommodations, etc."
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {formData.notes.length}/500 characters
        </p>
      </div>

      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>{includedKids} children are included</strong> with your package. Each
          additional child is ${ADDITIONAL_KIDS_PRICE} (maximum {MAX_CHILDREN} children total).
          The birthday child counts toward your guest total.
        </p>
      </div>
    </div>
  );
}
