'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin } from 'lucide-react';

export interface PartyBooking {
  id: string;
  date: string; // ISO date string
  startTime: string; // "14:00"
  endTime: string; // "16:00" or "17:00"
  duration: 2; // hours
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partyType: 'private' | 'semi-private';
  guestCount: number;
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  createdAt: string;
}

interface PartyCalendarProps {
  onBookingSelect?: (date: string, timeSlot: TimeSlot) => void;
  bookings?: PartyBooking[];
  onUpdateBookings?: (bookings: PartyBooking[]) => void;
  readOnly?: boolean;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: 2;
  available: boolean;
  booking?: PartyBooking;
}

const PARTY_TIME_SLOTS = {
  // Weekend slots (Sat-Sun) - 2x 2-hour slots
  weekend: [
    { startTime: '13:00', endTime: '15:00', duration: 2 as const },
    { startTime: '16:00', endTime: '18:00', duration: 2 as const },
  ],
  // Weekday slots (Mon-Fri) - 2x 2-hour slots
  weekday: [
    { startTime: '12:00', endTime: '14:00', duration: 2 as const },
    { startTime: '15:00', endTime: '17:00', duration: 2 as const },
  ]
};

// Sample booking data
const SAMPLE_BOOKINGS: PartyBooking[] = [
  {
    id: 'booking_1',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    startTime: '13:00',
    endTime: '15:00',
    duration: 2,
    customerName: 'Sarah Johnson',
    customerPhone: '(555) 123-4567',
    customerEmail: 'sarah.johnson@email.com',
    partyType: 'semi-private',
    guestCount: 12,
    totalPrice: 350,
    status: 'confirmed',
    notes: 'Princess theme party',
    createdAt: new Date().toISOString()
  },
  {
    id: 'booking_2',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
    startTime: '16:00',
    endTime: '18:00',
    duration: 2,
    customerName: 'Mike Chen',
    customerPhone: '(555) 987-6543',
    customerEmail: 'mike.chen@email.com',
    partyType: 'private',
    guestCount: 18,
    totalPrice: 461, // $425 + (3 extra kids × $12)
    status: 'confirmed',
    notes: 'Superhero theme',
    createdAt: new Date().toISOString()
  },
  {
    id: 'booking_3',
    date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 days from now
    startTime: '12:00',
    endTime: '14:00',
    duration: 2,
    customerName: 'Lisa Williams',
    customerPhone: '(555) 456-7890',
    customerEmail: 'lisa.williams@email.com',
    partyType: 'private',
    guestCount: 15,
    totalPrice: 425,
    status: 'confirmed',
    notes: 'Unicorn theme party',
    createdAt: new Date().toISOString()
  },
  {
    id: 'booking_4',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days from now
    startTime: '15:00',
    endTime: '17:00',
    duration: 2,
    customerName: 'David Rodriguez',
    customerPhone: '(555) 234-5678',
    customerEmail: 'david.rodriguez@email.com',
    partyType: 'semi-private',
    guestCount: 20,
    totalPrice: 410, // $350 + (5 extra kids × $12)
    status: 'pending',
    notes: 'Dinosaur theme, needs confirmation',
    createdAt: new Date().toISOString()
  }
];

export function PartyCalendar({ 
  onBookingSelect, 
  bookings = SAMPLE_BOOKINGS, 
  onUpdateBookings,
  readOnly = false 
}: PartyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

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

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const getAvailableTimeSlots = (date: Date): TimeSlot[] => {
    const dateString = date.toISOString().split('T')[0];
    const dayBookings = bookings.filter(b => b.date === dateString && b.status !== 'cancelled');
    
    const slots = isWeekend(date) ? PARTY_TIME_SLOTS.weekend : PARTY_TIME_SLOTS.weekday;
    
    return slots.map(slot => {
      const conflictingBooking = dayBookings.find(booking => {
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        const slotStart = slot.startTime;
        const slotEnd = slot.endTime;
        
        // Check for time overlap
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });

      return {
        ...slot,
        available: !conflictingBooking,
        booking: conflictingBooking
      };
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
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
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
  };

  const handleTimeSlotClick = (date: string, timeSlot: TimeSlot) => {
    if (!readOnly && timeSlot.available && onBookingSelect) {
      onBookingSelect(date, timeSlot);
    }
  };

  const getBookingCountForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateString && b.status !== 'cancelled').length;
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings
    .filter(b => b.date >= today && b.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Party Booking Calendar</h2>
          <p className="text-gray-600">Book your perfect party time slot</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            List View
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-xl font-semibold">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                    {day}
                  </div>
                ))}
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="p-3" />;
                  }
                  
                  const dateString = date.toISOString().split('T')[0];
                  const isToday = dateString === today;
                  const isSelected = dateString === selectedDate;
                  const isPast = dateString < today;
                  const bookingCount = getBookingCountForDate(date);
                  const availableSlots = getAvailableTimeSlots(date);
                  const hasAvailableSlots = availableSlots.some(slot => slot.available);

                  return (
                    <button
                      key={index}
                      onClick={() => !isPast && handleDateClick(date)}
                      disabled={isPast}
                      className={`
                        p-3 text-sm rounded-lg transition-all relative
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                        ${isToday ? 'bg-blue-100 text-blue-800 font-semibold' : ''}
                        ${isSelected ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400' : ''}
                        ${bookingCount > 0 && !isPast ? 'bg-green-50 text-green-800' : ''}
                        ${!hasAvailableSlots && bookingCount > 0 && !isPast ? 'bg-red-50 text-red-800' : ''}
                      `}
                    >
                      {date.getDate()}
                      {bookingCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {bookingCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                  <span>Has Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                  <span>Fully Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                  <span>Selected</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Time Slots */}
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {selectedDate ? formatDate(selectedDate) : 'Select a Date'}
              </h3>
              
              {selectedDate ? (
                <div className="space-y-3">
                  {getAvailableTimeSlots(new Date(selectedDate + 'T00:00:00')).map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimeSlotClick(selectedDate, slot)}
                      disabled={!slot.available || readOnly}
                      className={`
                        w-full p-4 rounded-lg border text-left transition-all
                        ${slot.available && !readOnly
                          ? 'border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer'
                          : 'border-red-200 bg-red-50 cursor-not-allowed opacity-75'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.duration} hour{slot.duration > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className={`
                          px-2 py-1 rounded text-xs font-medium
                          ${slot.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        `}>
                          {slot.available ? 'Available' : 'Booked'}
                        </div>
                      </div>
                      {slot.booking && (
                        <div className="mt-2 text-xs text-gray-600">
                          {slot.booking.customerName} - {slot.booking.partyType}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a date to view available time slots
                </p>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming Bookings</h3>
            <div className="space-y-4">
              {upcomingBookings.map(booking => (
                <div key={booking.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{booking.customerName}</h4>
                      <p className="text-sm text-gray-600">{formatDate(booking.date)}</p>
                    </div>
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}
                    `}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      {booking.guestCount} guests
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">${booking.totalPrice}</span>
                    <span className="text-gray-600 ml-2">({booking.partyType})</span>
                  </div>
                  {booking.notes && (
                    <p className="text-sm text-gray-600 mt-2">{booking.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Available Times</h4>
                <div className="text-sm text-blue-700 mt-1">
                  <div>Mon-Fri: 10:00 AM - 5:00 PM</div>
                  <div>Sat-Sun: 1:00 PM - 6:00 PM</div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Party Options</h4>
                <div className="text-sm text-green-700 mt-1">
                  <div>Private Party: $425 (2 hours)</div>
                  <div>Semi-Private: $350 (2 hours)</div>
                  <div>Extra guests: $12/child</div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900">This Month</h4>
                <div className="text-sm text-yellow-700 mt-1">
                  <div>{bookings.filter(b => b.status === 'confirmed').length} confirmed bookings</div>
                  <div>{bookings.filter(b => b.status === 'pending').length} pending bookings</div>
                  <div>${bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPrice, 0)} revenue</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
