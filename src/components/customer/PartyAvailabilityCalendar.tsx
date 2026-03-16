'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateToYYYYMMDD, parseDateString } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  label: string;
}

export function PartyAvailabilityCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState<Map<string, string[]>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingMonth(true);
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
        setLoadingMonth(false);
      }
    };

    fetchAvailability();
  }, [currentMonth]);

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/party-booking/time-slots?date=${selectedDate}&partyType=private`
        );
        if (response.ok) {
          const data = await response.json();
          setTimeSlots(data.slots || []);
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate]);

  const getDaysInMonth = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(null);
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = formatDateToYYYYMMDD(today);

  const minBookingDate = new Date(today);
  minBookingDate.setDate(minBookingDate.getDate() + 7);

  const days = getDaysInMonth();

  const getDateStatus = (date: Date): 'available' | 'partial' | 'past' => {
    const dateString = formatDateToYYYYMMDD(date);
    if (date < today || date < minBookingDate) return 'past';
    const bookedTimes = bookedSlots.get(dateString);
    if (bookedTimes && bookedTimes.length > 0) return 'partial';
    return 'available';
  };

  const isSlotBooked = (startTime: string): boolean => {
    if (!selectedDate) return false;
    const bookedTimes = bookedSlots.get(selectedDate) || [];
    return bookedTimes.includes(startTime);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-3 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-lg font-semibold text-gray-800">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loadingMonth && (
          <div className="flex items-center justify-center py-2 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
            <span className="ml-2 text-sm text-gray-500">Loading availability...</span>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-1.5 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}

          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="p-1.5" />;
            }

            const dateString = formatDateToYYYYMMDD(date);
            const status = getDateStatus(date);
            const isSelected = dateString === selectedDate;
            const isToday = dateString === todayString;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isClickable = status !== 'past';

            return (
              <button
                key={index}
                onClick={() => isClickable && setSelectedDate(dateString)}
                disabled={!isClickable}
                className={`
                  p-1.5 text-sm rounded-lg transition-all relative
                  ${!isClickable ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  ${isToday && !isSelected ? 'ring-2 ring-blue-300' : ''}
                  ${isSelected ? 'bg-purple-500 text-white font-bold ring-2 ring-purple-600' : ''}
                  ${status === 'available' && !isSelected ? 'bg-green-50 text-green-700 hover:bg-green-100 font-medium' : ''}
                  ${status === 'partial' && !isSelected ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium' : ''}
                  ${isWeekend && isClickable && !isSelected ? 'font-semibold' : ''}
                `}
              >
                {date.getDate()}
                {status === 'partial' && !isSelected && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded" />
            <span>Some slots taken</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded" />
            <span>Unavailable</span>
          </div>
        </div>
      </Card>

      {/* Time Slots */}
      <Card className="lg:col-span-2 p-4 sm:p-6">
        <h4 className="text-base font-semibold text-gray-800 mb-1 flex items-center">
          <Clock className="w-4 h-4 mr-2 text-purple-600" />
          {selectedDate
            ? parseDateString(selectedDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
              })
            : 'Time Slots'}
        </h4>

        {selectedDate ? (
          loadingSlots ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : timeSlots.length > 0 ? (
            <div className="space-y-2 mt-3">
              {timeSlots.map((slot, index) => {
                const booked = isSlotBooked(slot.startTime);
                return (
                  <div
                    key={index}
                    className={`
                      p-3 rounded-lg border text-sm
                      ${booked
                        ? 'border-red-200 bg-red-50 opacity-60'
                        : 'border-green-200 bg-green-50'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {slot.label || `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
                      </span>
                      <span
                        className={`
                          px-2 py-0.5 rounded-full text-xs font-medium
                          ${booked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                        `}
                      >
                        {booked ? 'Booked' : 'Open'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No party slots available on this date.</p>
              <p className="text-xs mt-1 text-gray-400">
                Private parties are available on weekends.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-10 text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Select a date to see available time slots</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-gray-600">
          <p>
            <strong>Note:</strong> Parties must be booked at least 1 week in advance.
            Showing availability for private parties (2 hours).
          </p>
        </div>
      </Card>
    </div>
  );
}
