'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { PartiesHero } from '@/components/parties/PartiesHero'
import { PartyPackages } from '@/components/parties/PartyPackages'
import { BookingFlow } from '@/components/parties/BookingFlow'
import { PartyGallery } from '@/components/parties/PartyGallery'
import { PartyCalendar, type PartyBooking } from '@/components/parties/PartyCalendar'
import { PartyBookingForm } from '@/components/parties/PartyBookingForm'

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: 2;
  available: boolean;
}

export default function PartiesPage() {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    date: string;
    timeSlot: TimeSlot;
  } | null>(null);
  const [bookings, setBookings] = useState<PartyBooking[]>([]);

  const handleBookingSelect = (date: string, timeSlot: TimeSlot) => {
    console.log('handleBookingSelect called:', { date, timeSlot });
    setSelectedBooking({ date, timeSlot });
    setShowBookingForm(true);
    console.log('Booking form should show now');
  };

  const handleBookingSubmit = (newBooking: Omit<PartyBooking, 'id' | 'createdAt'>) => {
    const booking: PartyBooking = {
      ...newBooking,
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    setBookings(prev => [...prev, booking]);
    setShowBookingForm(false);
    setSelectedBooking(null);
    
    // Show success message (you could add a toast notification here)
    alert('Party booking request submitted successfully! We\'ll contact you within 24 hours to confirm.');
  };

  const handleCloseBookingForm = () => {
    setShowBookingForm(false);
    setSelectedBooking(null);
  };

  return (
    <Layout>
      <PartiesHero />
      <PartyPackages />
      
      {/* Party Calendar Section */}
      <section id="party-calendar-section" className="py-16 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Book Your Party Date
            </h2>
            <p className="text-xl text-gray-600">
              Choose from available 2-hour time slots for your perfect party
            </p>
          </div>
          
          <PartyCalendar 
            onBookingSelect={handleBookingSelect}
            bookings={bookings}
            onUpdateBookings={setBookings}
          />
        </div>
      </section>

      <BookingFlow />
      <PartyGallery />

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-4 text-sm border-4 border-yellow-400" style={{ zIndex: 10000 }}>
          <div>showBookingForm: <strong>{showBookingForm.toString()}</strong></div>
          <div>selectedBooking: <strong>{selectedBooking ? 'yes' : 'no'}</strong></div>
          {selectedBooking && (
            <div>
              <div>Date: {selectedBooking.date}</div>
              <div>Time: {selectedBooking.timeSlot.startTime}-{selectedBooking.timeSlot.endTime}</div>
            </div>
          )}
        </div>
      )}

      {/* Fallback test button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4" style={{ zIndex: 10000 }}>
          <button
            onClick={() => {
              console.log('Test button clicked');
              setSelectedBooking({
                date: '2024-12-25',
                timeSlot: { startTime: '13:00', endTime: '15:00', duration: 2, available: true }
              });
              setShowBookingForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded font-bold"
          >
            TEST BOOKING FORM
          </button>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && selectedBooking && (
        <PartyBookingForm
          selectedDate={selectedBooking.date}
          selectedTimeSlot={selectedBooking.timeSlot}
          onClose={handleCloseBookingForm}
          onSubmit={handleBookingSubmit}
        />
      )}
    </Layout>
  )
}
