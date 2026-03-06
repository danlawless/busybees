'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateToYYYYMMDD, parseDateString } from '@/lib/utils';
import type { BookingFormData } from '../PartyBookingWizard';

interface DateTimeStepProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onValidChange: (isValid: boolean) => void;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  label: string;
}

export function DateTimeStep({ formData, onUpdate, onValidChange }: DateTimeStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState<Map<string, string[]>>(new Map());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlotsForDate, setLoadingSlotsForDate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validate step
  useEffect(() => {
    const isValid =
      formData.partyDate !== '' && formData.startTime !== '' && formData.endTime !== '';
    onValidChange(isValid);
  }, [formData.partyDate, formData.startTime, formData.endTime, onValidChange]);

  // Fetch booked slots for the current month
  useEffect(() => {
    const fetchBookedSlots = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = formatDateToYYYYMMDD(new Date(year, month, 1));
        const endDate = formatDateToYYYYMMDD(new Date(year, month + 1, 0));

        const response = await fetch(
          `/api/party-booking/availability?startDate=${startDate}&endDate=${endDate}`
        );
        if (response.ok) {
          const data = await response.json();
          const slotsMap = new Map<string, string[]>();
          data.bookedSlots?.forEach((slot: { date: string; times: string[] }) => {
            slotsMap.set(slot.date, slot.times);
          });
          setBookedSlots(slotsMap);
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookedSlots();
  }, [currentMonth]);

  // Fetch available time slots when date or party type changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!formData.partyDate || !formData.partyType) {
        setAvailableSlots([]);
        return;
      }

      setLoadingSlotsForDate(true);
      try {
        const response = await fetch(
          `/api/party-booking/time-slots?date=${formData.partyDate}&partyType=${formData.partyType}`
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableSlots(data.slots || []);
        } else {
          console.error('Failed to fetch time slots');
          setAvailableSlots([]);
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlotsForDate(false);
      }
    };

    fetchTimeSlots();
  }, [formData.partyDate, formData.partyType]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (date: Date) => {
    const dateString = formatDateToYYYYMMDD(date);
    console.log('[DateTimeStep] handleDateSelect:', {
      inputDate: date.toString(),
      dayOfWeek: date.getDay(),
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      formattedString: dateString,
    });
    onUpdate({
      partyDate: dateString,
      startTime: '',
      endTime: '',
    });
  };

  const handleTimeSelect = (startTime: string, endTime: string) => {
    onUpdate({ startTime, endTime });
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minBookingDate = new Date(today);
  minBookingDate.setDate(minBookingDate.getDate() + 7);

  // Get selected date object for display
  // Use parseDateString to avoid UTC vs local timezone bug
  const selectedDateObj = formData.partyDate
    ? parseDateString(formData.partyDate)
    : null;

  // Check which slots are already booked
  const getSlotStatus = (startTime: string) => {
    if (!formData.partyDate) return 'available';
    const bookedTimes = bookedSlots.get(formData.partyDate) || [];
    return bookedTimes.includes(startTime) ? 'booked' : 'available';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-charcoal-800 mb-2">Select Date & Time</h3>
        <p className="text-gray-600">
          Choose your preferred party date and time slot. Parties must be booked at least 1 week
          in advance.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h4 className="text-lg font-semibold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}

            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="p-2" />;
              }

              const dateString = formatDateToYYYYMMDD(date);
              const isToday = date.getTime() === today.getTime();
              const isSelected = dateString === formData.partyDate;
              const isPast = date < today;
              const isTooSoon = date < minBookingDate;
              const isDisabled = isPast || isTooSoon;

              return (
                <button
                  key={index}
                  onClick={() => !isDisabled && handleDateSelect(date)}
                  disabled={isDisabled}
                  className={`
                    p-2 text-sm rounded-lg transition-all relative
                    ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-honey-100 cursor-pointer'}
                    ${isToday ? 'bg-blue-100 text-blue-800 font-semibold' : ''}
                    ${isSelected ? 'bg-honey-400 text-white ring-2 ring-honey-500' : ''}
                    ${!isSelected && !isDisabled && !isToday ? 'bg-green-50 text-green-700' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-honey-400 rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded" />
              <span>Unavailable</span>
            </div>
          </div>
        </Card>

        {/* Time Slots */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-honey-600" />
            {formData.partyDate
              ? parseDateString(formData.partyDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a Date'}
          </h4>

          {formData.partyDate ? (
            loadingSlotsForDate ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500 mx-auto mb-4"></div>
                <p>Loading time slots...</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="space-y-3">
                {availableSlots.map((slot, index) => {
                  const status = getSlotStatus(slot.startTime);
                  const isSelected =
                    formData.startTime === slot.startTime && formData.endTime === slot.endTime;
                  const isBooked = status === 'booked';

                  return (
                    <motion.button
                      key={index}
                      whileHover={!isBooked ? { scale: 1.02 } : {}}
                      whileTap={!isBooked ? { scale: 0.98 } : {}}
                      onClick={() =>
                        !isBooked && handleTimeSelect(slot.startTime, slot.endTime)
                      }
                      disabled={isBooked}
                      className={`
                        w-full p-4 rounded-lg border text-left transition-all
                        ${isBooked ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60' : ''}
                        ${isSelected ? 'border-honey-400 bg-honey-100 ring-2 ring-honey-400' : ''}
                        ${!isBooked && !isSelected ? 'border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer' : ''}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-charcoal-800">{slot.label}</div>
                          <div className="text-sm text-gray-600">2 hour party</div>
                        </div>
                        <div
                          className={`
                          px-3 py-1 rounded-full text-xs font-medium
                          ${isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                        `}
                        >
                          {isBooked ? 'Booked' : 'Available'}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No time slots available for this date.</p>
                <p className="text-sm mt-2">
                  {formData.partyType === 'private'
                    ? 'Private parties are only available on weekends.'
                    : 'Semi-private parties are available Friday afternoon and weekend mornings.'}
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a date from the calendar to view available time slots.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Booking Requirement:</strong> All parties must be booked at least 1 week in
            advance. Dates shown in gray are either in the past, too soon, or have no available
            slots for your selected party type.
          </p>
        </div>
      </div>
    </div>
  );
}
