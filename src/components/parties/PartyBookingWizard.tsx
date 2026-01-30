'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ContactInfoStep } from './booking-steps/ContactInfoStep';
import { PartyTypeStep } from './booking-steps/PartyTypeStep';
import { PackageStep } from './booking-steps/PackageStep';
import { DateTimeStep } from './booking-steps/DateTimeStep';
import { GuestInfoStep } from './booking-steps/GuestInfoStep';
import { ReviewStep } from './booking-steps/ReviewStep';
import {
  CompleteBooking,
  PartyType,
  PackageName,
  calculateBookingPrice,
  PACKAGE_PRICING,
} from '@/lib/validations/party-booking';

interface PartyBookingWizardProps {
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

export interface BookingFormData {
  // Step 1: Contact Info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;

  // Step 2: Party Type
  partyType: PartyType | null;

  // Step 3: Package
  packageName: PackageName | null;

  // Step 4: Date & Time
  partyDate: string;
  startTime: string;
  endTime: string;

  // Step 5: Guest Info
  childName: string;
  childAge: number | undefined;
  guestCount: number;
  notes: string;
}

const INITIAL_FORM_DATA: BookingFormData = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  partyType: null,
  packageName: null,
  partyDate: '',
  startTime: '',
  endTime: '',
  childName: '',
  childAge: undefined,
  guestCount: 15,
  notes: '',
};

const STEPS = [
  { id: 1, title: 'Contact Info', description: 'Your contact details' },
  { id: 2, title: 'Party Type', description: 'Private or Semi-Private' },
  { id: 3, title: 'Package', description: 'Choose your package' },
  { id: 4, title: 'Date & Time', description: 'Select your slot' },
  { id: 5, title: 'Guest Info', description: 'Party details' },
  { id: 6, title: 'Review', description: 'Confirm & pay' },
];

export function PartyBookingWizard({ onClose, onSuccess }: PartyBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BookingFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepValid, setStepValid] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberDiscountPercent, setMemberDiscountPercent] = useState(0);

  // Check membership status on mount
  useEffect(() => {
    async function checkMembership() {
      try {
        const response = await fetch('/api/check-membership');
        if (response.ok) {
          const data = await response.json();
          setIsMember(data.isMember);
          setMemberDiscountPercent(data.discountPercent);
        }
      } catch {
        // Silently fail - member discount is a bonus, not a requirement
      }
    }
    checkMembership();
  }, []);

  const updateFormData = useCallback((updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const handleStepValidChange = useCallback((isValid: boolean) => {
    setStepValid(isValid);
  }, []);

  const goToNextStep = () => {
    if (currentStep < STEPS.length && stepValid) {
      setCurrentStep((prev) => prev + 1);
      setStepValid(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setStepValid(true); // Previous steps were already validated
    }
  };

  const handleSubmit = async () => {
    if (!formData.partyType || !formData.packageName) {
      setError('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the booking via API
      const response = await fetch('/api/party-booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          customerAddress: formData.customerAddress,
          partyType: formData.partyType,
          packageName: formData.packageName,
          partyDate: formData.partyDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          childName: formData.childName,
          childAge: formData.childAge,
          guestCount: formData.guestCount,
          notes: formData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        onSuccess(result.bookingId);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pricing =
    formData.partyType && formData.packageName
      ? calculateBookingPrice(formData.packageName, formData.partyType, formData.guestCount)
      : null;

  // Calculate member discount amount for display
  const memberDiscountAmount = pricing && isMember
    ? Math.round((pricing.totalPrice * memberDiscountPercent) / 100 * 100) / 100
    : 0;
  const discountedTotal = pricing
    ? pricing.totalPrice - memberDiscountAmount
    : 0;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ContactInfoStep
            formData={formData}
            onUpdate={updateFormData}
            onValidChange={handleStepValidChange}
          />
        );
      case 2:
        return (
          <PartyTypeStep
            formData={formData}
            onUpdate={updateFormData}
            onValidChange={handleStepValidChange}
          />
        );
      case 3:
        return (
          <PackageStep
            formData={formData}
            onUpdate={updateFormData}
            onValidChange={handleStepValidChange}
          />
        );
      case 4:
        return (
          <DateTimeStep
            formData={formData}
            onUpdate={updateFormData}
            onValidChange={handleStepValidChange}
          />
        );
      case 5:
        return (
          <GuestInfoStep
            formData={formData}
            onUpdate={updateFormData}
            onValidChange={handleStepValidChange}
          />
        );
      case 6:
        return (
          <ReviewStep
            formData={formData}
            pricing={pricing}
            onValidChange={handleStepValidChange}
            isMember={isMember}
            memberDiscountPercent={memberDiscountPercent}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <Card className="flex-1 overflow-hidden flex flex-col bg-white border-2 border-primary-200/30 shadow-soft">
          {/* Header */}
          <div className="p-6 border-b border-primary-200/30 bg-primary-50/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-charcoal-800">Book Your Party</h2>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Member Discount Banner */}
            {isMember && (
              <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Member Discount: {memberDiscountPercent}% off automatically applied!
                </span>
              </div>
            )}

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        currentStep > step.id
                          ? 'bg-green-500 text-white'
                          : currentStep === step.id
                            ? 'bg-honey-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1 hidden sm:block ${
                        currentStep >= step.id ? 'text-charcoal-700' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-8 sm:w-12 mx-1 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer with Price Summary & Navigation */}
          <div className="p-6 border-t border-primary-200/30 bg-primary-50/50">
            {/* Price Summary */}
            {pricing && (
              <div className="mb-4 p-4 bg-white rounded-xl border border-primary-200/30 shadow-soft">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">
                      {formData.packageName && PACKAGE_PRICING[formData.packageName].name} Package
                      ({formData.partyType === 'private' ? 'Private' : 'Semi-Private'})
                    </span>
                    {pricing.additionalKids > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        + {pricing.additionalKids} extra kids
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {isMember ? (
                      <div>
                        <div className="text-sm text-gray-400 line-through">
                          ${pricing.totalPrice}
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          ${discountedTotal.toFixed(0)}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          {memberDiscountPercent}% member discount
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-charcoal-800">
                        ${pricing.totalPrice}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  variant="primary"
                  onClick={goToNextStep}
                  disabled={!stepValid || isSubmitting}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!stepValid || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Proceed to Payment
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
