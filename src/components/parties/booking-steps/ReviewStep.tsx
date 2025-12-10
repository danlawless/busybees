'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Users,
  Gift,
  CheckCircle,
  CreditCard,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PACKAGE_PRICING } from '@/lib/validations/party-booking';
import type { BookingFormData } from '../PartyBookingWizard';

interface ReviewStepProps {
  formData: BookingFormData;
  pricing: {
    basePrice: number;
    additionalKidsPrice: number;
    totalPrice: number;
    additionalKids: number;
  } | null;
  onValidChange: (isValid: boolean) => void;
}

export function ReviewStep({ formData, pricing, onValidChange }: ReviewStepProps) {
  // Always valid if we got here
  useEffect(() => {
    onValidChange(true);
  }, [onValidChange]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const packageInfo = formData.packageName ? PACKAGE_PRICING[formData.packageName] : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Review Your Booking</h3>
        <p className="text-gray-600">
          Please review your party details before proceeding to payment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="p-6">
          <h4 className="font-semibold text-charcoal-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-honey-600" />
            Contact Information
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{formData.customerName}</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{formData.customerEmail}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{formData.customerPhone}</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{formData.customerAddress}</span>
            </div>
          </div>
        </Card>

        {/* Party Details */}
        <Card className="p-6">
          <h4 className="font-semibold text-charcoal-800 mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-honey-600" />
            Party Details
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{formData.partyDate ? formatDate(formData.partyDate) : 'Not selected'}</span>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>
                {formData.startTime && formData.endTime
                  ? `${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}`
                  : 'Not selected'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>
                {formData.guestCount} children attending
                {pricing && pricing.additionalKids > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({pricing.additionalKids} extra)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>
                {formData.childName}&apos;s Birthday
                {formData.childAge !== undefined && ` (turning ${formData.childAge})`}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Package & Pricing */}
      <Card className="p-6 bg-gradient-to-r from-honey-50 to-yellow-50 border-honey-200">
        <h4 className="font-semibold text-charcoal-800 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-honey-600" />
          Package & Pricing
        </h4>

        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-charcoal-800">
                {packageInfo?.name || 'Package'} Package
              </div>
              <div className="text-sm text-gray-600">
                {formData.partyType === 'private' ? 'Private Party' : 'Semi-Private Party'}
              </div>
            </div>
            <div className="text-right font-semibold">${pricing?.basePrice || 0}</div>
          </div>

          {pricing && pricing.additionalKids > 0 && (
            <div className="flex justify-between items-start text-amber-700">
              <div>
                <div className="font-medium">Additional Children</div>
                <div className="text-sm">{pricing.additionalKids} × $15</div>
              </div>
              <div className="font-semibold">+${pricing.additionalKidsPrice}</div>
            </div>
          )}

          <div className="border-t border-honey-200 pt-4 flex justify-between items-center">
            <div className="text-lg font-bold text-charcoal-800">Total</div>
            <div className="text-2xl font-bold text-charcoal-800">
              ${pricing?.totalPrice || 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {formData.notes && (
        <Card className="p-6">
          <h4 className="font-semibold text-charcoal-800 mb-2">Special Notes</h4>
          <p className="text-gray-600 text-sm">{formData.notes}</p>
        </Card>
      )}

      {/* What's Included */}
      {packageInfo && (
        <Card className="p-6">
          <h4 className="font-semibold text-charcoal-800 mb-4">What&apos;s Included</h4>
          <div className="grid md:grid-cols-2 gap-2">
            {packageInfo.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-blue-50 rounded-lg border border-blue-200"
      >
        <p className="text-sm text-blue-800">
          <strong>Secure Payment:</strong> You&apos;ll be redirected to our secure payment
          processor (Stripe) to complete your booking. Your payment information is encrypted and
          never stored on our servers.
        </p>
      </motion.div>
    </div>
  );
}
