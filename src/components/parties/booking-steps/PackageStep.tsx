'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Crown, Users, CheckCircle, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PackageName, PACKAGE_PRICING } from '@/lib/validations/party-booking';
import type { BookingFormData } from '../PartyBookingWizard';

interface PackageStepProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onValidChange: (isValid: boolean) => void;
}

const packages = [
  {
    id: 'basic_bee' as PackageName,
    name: 'Basic Bee',
    icon: Gift,
    color: 'from-blue-200 to-blue-300',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    popular: false,
  },
  {
    id: 'worker_bee' as PackageName,
    name: 'Worker Bee',
    icon: Sparkles,
    color: 'from-purple-200 to-purple-300',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-50',
    popular: true,
  },
  {
    id: 'queen_bee' as PackageName,
    name: 'Queen Bee',
    icon: Crown,
    color: 'from-pink-200 to-pink-300',
    borderColor: 'border-pink-400',
    bgColor: 'bg-pink-50',
    popular: false,
  },
];

export function PackageStep({ formData, onUpdate, onValidChange }: PackageStepProps) {
  useEffect(() => {
    onValidChange(formData.packageName !== null);
  }, [formData.packageName, onValidChange]);

  const handleSelect = (packageName: PackageName) => {
    onUpdate({ packageName });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Select Your Package</h3>
        <p className="text-gray-600">
          Choose the package that best fits your celebration needs. All packages include 15 kids.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const Icon = pkg.icon;
          const pricing = PACKAGE_PRICING[pkg.id];
          const isSelected = formData.packageName === pkg.id;
          const displayPrice =
            formData.partyType === 'private' ? pricing.privatePrice : pricing.semiPrivatePrice;

          return (
            <motion.div
              key={pkg.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              <Card
                className={`cursor-pointer transition-all p-6 h-full ${
                  isSelected
                    ? `${pkg.borderColor} border-2 ${pkg.bgColor} ring-2 ring-offset-2`
                    : 'border-gray-200 hover:border-gray-300'
                } ${pkg.popular ? 'shadow-lg' : ''}`}
                onClick={() => handleSelect(pkg.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${pkg.color} rounded-xl flex items-center justify-center`}
                  >
                    <Icon className="w-7 h-7 text-charcoal-700" />
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <h4 className="text-lg font-bold text-charcoal-800 mb-2">{pricing.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{pricing.description}</p>

                {/* Pricing */}
                <div className="mb-4 p-3 bg-white/70 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-charcoal-800">${displayPrice}</div>
                    <div className="text-sm text-gray-500">
                      {formData.partyType === 'private' ? 'Private' : 'Semi-Private'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    Up to {pricing.maxGuests} guests • {pricing.duration} hours
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {pricing.features.slice(0, 5).map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-charcoal-600">{feature}</span>
                    </div>
                  ))}
                  {pricing.features.length > 5 && (
                    <p className="text-xs text-gray-500 italic">
                      + {pricing.features.length - 5} more features
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>15 kids included</strong> with all packages. Additional kids are $15 each (max 20 children total).
        </p>
      </div>
    </div>
  );
}
