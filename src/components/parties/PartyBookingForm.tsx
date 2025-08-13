'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { X, Calendar, Clock, Users, DollarSign } from 'lucide-react';
import type { PartyBooking } from './PartyCalendar';

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: 2;
  available: boolean;
}

interface PartyBookingFormProps {
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  onClose: () => void;
  onSubmit: (booking: Omit<PartyBooking, 'id' | 'createdAt'>) => void;
}

export function PartyBookingForm({ selectedDate, selectedTimeSlot, onClose, onSubmit }: PartyBookingFormProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partyType: 'semi-private' as 'private' | 'semi-private',
    guestCount: 15,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculatePrice = () => {
    const basePrice = formData.partyType === 'private' ? 425 : 350;
    const extraGuests = Math.max(0, formData.guestCount - 15);
    return basePrice + (extraGuests * 12);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Name is required';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(formData.customerPhone)) {
      newErrors.customerPhone = 'Please enter a valid phone number';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }

    if (formData.guestCount < 1) {
      newErrors.guestCount = 'At least 1 guest is required';
    } else if (formData.guestCount > 50) {
      newErrors.guestCount = 'Maximum 50 guests allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    setFormData(prev => ({ ...prev, customerPhone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const booking: Omit<PartyBooking, 'id' | 'createdAt'> = {
        date: selectedDate,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        duration: selectedTimeSlot.duration,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail.trim(),
        partyType: formData.partyType,
        guestCount: formData.guestCount,
        totalPrice: calculatePrice(),
        status: 'pending',
        notes: formData.notes.trim() || undefined
      };

      onSubmit(booking);
    } catch (error) {
      console.error('Booking submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🎉 Book Your Party</h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Booking Summary */}
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-3">Booking Details</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>{formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-600" />
                <span>{formData.guestCount} guests</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-600" />
                <span>${calculatePrice()} ({formData.partyType})</span>
              </div>
            </div>
          </Card>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent/Guardian Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      errors.customerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your name"
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handlePhoneChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      errors.customerPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.customerPhone && (
                    <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                    errors.customerEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                />
                {errors.customerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                )}
              </div>
            </div>

            {/* Party Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Party Details</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Party Type
                  </label>
                  <select
                    value={formData.partyType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      partyType: e.target.value as 'private' | 'semi-private' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="semi-private">Semi-Private ($350)</option>
                    <option value="private">Private ($425)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.partyType === 'private' 
                      ? 'Exclusive use of party room and play area'
                      : 'Exclusive party room, shared play area'
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.guestCount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      guestCount: parseInt(e.target.value) || 15 
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                      errors.guestCount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    15 guests included, $12 for each additional guest
                  </p>
                  {errors.guestCount && (
                    <p className="text-red-500 text-sm mt-1">{errors.guestCount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={3}
                placeholder="Theme requests, dietary restrictions, special accommodations..."
              />
            </div>

            {/* Price Breakdown */}
            <Card className="p-4 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">Price Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base {formData.partyType} party (2 hours)</span>
                  <span>${formData.partyType === 'private' ? '425' : '350'}</span>
                </div>
                {formData.guestCount > 15 && (
                  <div className="flex justify-between">
                    <span>Extra guests ({formData.guestCount - 15} × $12)</span>
                    <span>${(formData.guestCount - 15) * 12}</span>
                  </div>
                )}
                <div className="border-t border-green-300 pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${calculatePrice()}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Booking...' : 'Book Party'}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your booking request will be reviewed and confirmed within 24 hours.
              You'll receive a confirmation email with payment instructions.
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}
