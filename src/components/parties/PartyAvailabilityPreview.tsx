'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateToYYYYMMDD, parseDateString } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  label: string;
}

interface PartyAvailabilityPreviewProps {
  onBookDate?: (date: string) => void;
}

export function PartyAvailabilityPreview({ onBookDate }: PartyAvailabilityPreviewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState<Map<string, string[]>>(new Map());
  const [totalSlots, setTotalSlots] = useState<{ weekend: number; weekday: number }>({ weekend: 0, weekday: 0 });
  const [dateOverrides, setDateOverrides] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch booked slots for the visible month
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
          if (data.totalSlots) {
            setTotalSlots(data.totalSlots);
          }
          setDateOverrides(data.dateOverrides || {});
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoadingMonth(false);
      }
    };

    fetchAvailability();
  }, [currentMonth]);

  // Fetch time slots when a date is selected
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setLoadingSlots(true);
      try {
        // No partyType: show all bookable slots for this date (private +
        // semi-private). The customer picks a party type later in the wizard.
        const response = await fetch(
          `/api/party-booking/time-slots?date=${selectedDate}`
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

  // Determine date availability: green (all free), orange (some booked), red (fully booked)
  const getDateStatus = (date: Date): 'available' | 'partial' | 'full' | 'past' => {
    const dateString = formatDateToYYYYMMDD(date);
    if (date < today || date < minBookingDate) return 'past';
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const maxSlots =
      dateOverrides[dateString] ?? (isWeekend ? totalSlots.weekend : totalSlots.weekday);
    const bookedTimes = bookedSlots.get(dateString);
    if (maxSlots === 0) return 'full';
    if (!bookedTimes || bookedTimes.length === 0) return 'available';
    if (bookedTimes.length >= maxSlots) return 'full';
    return 'partial';
  };

  // Check if a specific time slot is booked
  const isSlotBooked = (startTime: string): boolean => {
    if (!selectedDate) return false;
    const bookedTimes = bookedSlots.get(selectedDate) || [];
    return bookedTimes.includes(startTime);
  };

  return (
    <section id="party-availability" className="relative py-16 bg-white overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 rounded-full text-sm font-medium mb-4">
            Real-Time Availability
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal-800 mb-4">
            Check Availability
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Browse our calendar to find the perfect date for your party. Click any available date to
            see open time slots.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Calendar - 3 columns */}
            <Card className="lg:col-span-3 p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-xl font-semibold text-charcoal-800">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Loading overlay */}
              {loadingMonth && (
                <div className="flex items-center justify-center py-2 mb-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-honey-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading availability...</span>
                </div>
              )}

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}

                {days.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="p-2" />;
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
                        p-2 text-sm rounded-lg transition-all relative
                        ${!isClickable ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                        ${isToday && !isSelected ? 'ring-2 ring-blue-300' : ''}
                        ${isSelected ? 'bg-honey-400 text-white font-bold ring-2 ring-honey-500' : ''}
                        ${status === 'available' && !isSelected ? 'bg-green-100 text-green-800 hover:bg-green-200 font-medium' : ''}
                        ${status === 'partial' && !isSelected ? 'bg-green-100 text-green-800 hover:bg-green-200 font-medium' : ''}
                        ${status === 'full' && !isSelected ? 'bg-red-100 text-red-800 hover:bg-red-200 font-medium' : ''}
                        ${isWeekend && isClickable && !isSelected ? 'font-semibold' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
                  <span>Some slots taken</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
                  <span>Fully booked</span>
                </div>
              </div>
            </Card>

            {/* Time Slots Panel - 2 columns */}
            <Card className="lg:col-span-2 p-6">
              <h3 className="text-lg font-semibold text-charcoal-800 mb-1 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-honey-600" />
                {selectedDate
                  ? parseDateString(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Time Slots'}
              </h3>

              {selectedDate ? (
                loadingSlots ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-honey-500" />
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="space-y-2 mt-4">
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
                            <span className="font-medium text-charcoal-800">
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

                    {onBookDate && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full mt-4"
                        onClick={() => onBookDate(selectedDate)}
                      >
                        Book This Date
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No party slots available on this date.</p>
                    <p className="text-xs mt-1 text-gray-400">
                      Private parties are available on weekends.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a date to see available time slots</p>
                </div>
              )}

              <div className="mt-4 p-3 bg-honey-50 rounded-lg border border-honey-200 text-xs text-charcoal-600">
                <p>
                  <strong>Note:</strong> Parties must be booked at least 1 week in advance.
                  Showing availability for private parties (2 hours).
                </p>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
