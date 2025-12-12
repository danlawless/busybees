'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PartyType, TIME_SLOTS } from '@/lib/validations/party-booking';
import type { BookingFormData } from '../PartyBookingWizard';

interface PartyTypeStepProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onValidChange: (isValid: boolean) => void;
}

// Party types updated per issue #101
const partyTypes = [
  {
    id: 'semi_private' as PartyType,
    name: 'Semi-Private Party',
    icon: Users,
    description: 'Held during our normal business hours while we are open to the public.',
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    schedule: [
      { day: 'Monday - Friday', time: '9:00 AM - 5:00 PM' },
      { day: 'Saturday & Sunday', time: '10:00 AM - 12:00 PM' },
    ],
    benefits: [
      'Access to exclusive party room',
      'Access to play area during public play',
      'More affordable pricing option',
      'Perfect for younger children',
    ],
  },
  {
    id: 'private' as PartyType,
    name: 'Private Party',
    icon: Crown,
    description: 'Exclusive access to the entire facility, scheduled outside regular hours.',
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50',
    schedule: [
      { day: 'Saturday & Sunday', time: '1:00 PM - 3:00 PM' },
      { day: 'Saturday & Sunday', time: '3:30 PM - 5:30 PM' },
    ],
    benefits: [
      'Exclusive access to entire facility',
      'Complete privacy for your celebration',
      'Premium experience with no distractions',
      'Maximum flexibility and customization',
    ],
  },
];

export function PartyTypeStep({ formData, onUpdate, onValidChange }: PartyTypeStepProps) {
  useEffect(() => {
    onValidChange(formData.partyType !== null);
  }, [formData.partyType, onValidChange]);

  const handleSelect = (type: PartyType) => {
    onUpdate({
      partyType: type,
      // Reset date/time when party type changes
      partyDate: '',
      startTime: '',
      endTime: '',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Choose Your Party Type</h3>
        <p className="text-gray-600">
          Select whether you&apos;d like a semi-private or private party experience.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {partyTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.partyType === type.id;

          return (
            <motion.div
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all p-6 h-full ${
                  isSelected
                    ? `${type.borderColor} border-2 ${type.bgColor} ring-2 ring-offset-2 ring-${type.id === 'private' ? 'purple' : 'blue'}-400`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelect(type.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center`}
                  >
                    <Icon className="w-7 h-7 text-charcoal-700" />
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <h4 className="text-lg font-bold text-charcoal-800 mb-2">{type.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{type.description}</p>

                {/* Schedule */}
                <div className="mb-4">
                  <h5 className="font-semibold text-charcoal-700 mb-2 flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-honey-600" />
                    Available Times
                  </h5>
                  <div className="space-y-2">
                    {type.schedule.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white/70 rounded-lg text-sm"
                      >
                        <span className="font-medium text-charcoal-700">{slot.day}</span>
                        <div className="flex items-center text-charcoal-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  {type.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-charcoal-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-honey-50 rounded-lg border border-honey-200">
        <p className="text-sm text-honey-800">
          <strong>Need different times during the week?</strong> Contact us directly at{' '}
          <a href="tel:+1234567890" className="underline">
            (123) 456-7890
          </a>{' '}
          or{' '}
          <a href="mailto:info@busybeesipc.com" className="underline">
            info@busybeesipc.com
          </a>{' '}
          to discuss custom scheduling options.
        </p>
      </div>
    </div>
  );
}
