'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { ContactInfoSchema } from '@/lib/validations/party-booking';
import type { BookingFormData } from '../PartyBookingWizard';

interface ContactInfoStepProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onValidChange: (isValid: boolean) => void;
}

export function ContactInfoStep({ formData, onUpdate, onValidChange }: ContactInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onUpdate({ customerPhone: formatted });
  };

  // Validate and update parent
  useEffect(() => {
    const result = ContactInfoSchema.safeParse({
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      customerAddress: formData.customerAddress,
    });

    if (result.success) {
      setErrors({});
      onValidChange(true);
    } else {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (touched[field]) {
          newErrors[field] = err.message;
        }
      });
      setErrors(newErrors);
      onValidChange(false);
    }
  }, [formData, touched, onValidChange]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Contact Information</h3>
        <p className="text-gray-600">
          Please provide your contact details so we can confirm your party booking.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Full Name *
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => onUpdate({ customerName: e.target.value })}
            onBlur={() => handleBlur('customerName')}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500 ${
              errors.customerName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
          {errors.customerName && (
            <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => onUpdate({ customerEmail: e.target.value })}
            onBlur={() => handleBlur('customerEmail')}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500 ${
              errors.customerEmail ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="your.email@example.com"
          />
          {errors.customerEmail && (
            <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={handlePhoneChange}
            onBlur={() => handleBlur('customerPhone')}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500 ${
              errors.customerPhone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="(555) 123-4567"
          />
          {errors.customerPhone && (
            <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            Full Address *
          </label>
          <input
            type="text"
            value={formData.customerAddress}
            onChange={(e) => onUpdate({ customerAddress: e.target.value })}
            onBlur={() => handleBlur('customerAddress')}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-honey-500 ${
              errors.customerAddress ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123 Main Street, City, State ZIP"
          />
          {errors.customerAddress && (
            <p className="text-red-500 text-sm mt-1">{errors.customerAddress}</p>
          )}
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> We&apos;ll use this information to send your booking confirmation
          and receipt. Your information is secure and will never be shared.
        </p>
      </div>
    </div>
  );
}
