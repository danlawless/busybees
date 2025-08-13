'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { X, Calendar, Clock, Users, MessageSquare } from 'lucide-react';
import { PartyCalendar, type PartyBooking } from '@/components/parties/PartyCalendar';

interface PartySchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (partyData: {
    partyDate: string;
    partyStartTime: string;
    partyEndTime: string;
    partyGuests: number;
    partyNotes: string;
  }) => void;
  partyPackageName: string;
  customerName: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: 2;
  available: boolean;
}

export function PartySchedulingModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  partyPackageName,
  customerName 
}: PartySchedulingModalProps) {
  const [step, setStep] = useState<'calendar' | 'details'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [partyGuests, setPartyGuests] = useState(15);
  const [partyNotes, setPartyNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleDateSelect = (date: string, timeSlot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setStep('details');
  };

  const handleScheduleParty = async () => {
    if (!selectedTimeSlot) return;
    
    setIsScheduling(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSchedule({
        partyDate: selectedDate,
        partyStartTime: selectedTimeSlot.startTime,
        partyEndTime: selectedTimeSlot.endTime,
        partyGuests,
        partyNotes
      });
      
      // Reset form
      setStep('calendar');
      setSelectedDate('');
      setSelectedTimeSlot(null);
      setPartyGuests(15);
      setPartyNotes('');
    } catch (error) {
      console.error('Party scheduling failed:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🎉 Schedule Party</h2>
              <p className="text-gray-600">
                {partyPackageName} for {customerName}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'calendar' ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'calendar' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {step === 'details' ? '✓' : '1'}
                </div>
                <span className="font-medium">Choose Date & Time</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center space-x-2 ${step === 'details' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'details' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </div>
                <span className="font-medium">Party Details</span>
              </div>
            </div>
          </div>

          {/* Calendar Step */}
          {step === 'calendar' && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Select Your Party Date & Time</h3>
                <p className="text-gray-600">Choose from available 2-hour time slots</p>
              </div>
              
              <PartyCalendar 
                onBookingSelect={handleDateSelect}
                bookings={[]} // Empty for now, could integrate with existing bookings
                readOnly={false}
              />
            </div>
          )}

          {/* Details Step */}
          {step === 'details' && selectedTimeSlot && (
            <div className="space-y-6">
              {/* Selected Date/Time Confirmation */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Selected Party Slot</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}</span>
                  </div>
                </div>
              </Card>

              {/* Party Details Form */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={partyGuests}
                    onChange={(e) => setPartyGuests(parseInt(e.target.value) || 15)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    15 guests included, $12 for each additional guest
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Party Theme/Notes
                  </label>
                  <input
                    type="text"
                    value={partyNotes}
                    onChange={(e) => setPartyNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Princess, Superhero, Unicorn..."
                  />
                </div>
              </div>

              {/* Price Summary */}
              <Card className="p-4 bg-green-50 border-green-200">
                <h3 className="font-semibold text-green-900 mb-3">Party Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{partyPackageName} (2 hours)</span>
                    <span>${partyPackageName.includes('Private') ? '425' : '350'}</span>
                  </div>
                  {partyGuests > 15 && (
                    <div className="flex justify-between">
                      <span>Extra guests ({partyGuests - 15} × $12)</span>
                      <span>${(partyGuests - 15) * 12}</span>
                    </div>
                  )}
                  <div className="border-t border-green-300 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${(partyPackageName.includes('Private') ? 425 : 350) + Math.max(0, partyGuests - 15) * 12}</span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('calendar')}
                  className="flex-1"
                  disabled={isScheduling}
                >
                  ← Back to Calendar
                </Button>
                <Button
                  onClick={handleScheduleParty}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isScheduling}
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Party 🎉'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
