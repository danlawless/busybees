'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { PartiesHero } from '@/components/parties/PartiesHero'
import { PartyPackages } from '@/components/parties/PartyPackages'
import { BookingFlow } from '@/components/parties/BookingFlow'
import { PartyGallery } from '@/components/parties/PartyGallery'
import { PartyCalendar, type PartyBooking } from '@/components/parties/PartyCalendar'
import { PartyBookingForm } from '@/components/parties/PartyBookingForm'
import { PartyFAQ } from '@/components/parties/PartyFAQ'
import { SuccessModal } from '@/components/ui/SuccessModal'

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  }>({ title: '', message: '' });

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
    
    // Show beautiful success modal
    setSuccessDetails({
      title: '🎉 Party Booking Submitted!',
      message: 'Your party booking request has been submitted successfully! We\'ll contact you within 24 hours to confirm all the details.',
      details: {
        date: booking.date,
        time: `${booking.startTime.split(':').slice(0, 2).join(':')} - ${booking.endTime.split(':').slice(0, 2).join(':')}`,
        guests: booking.guestCount,
        price: booking.totalPrice,
        type: booking.partyType
      }
    });
    setShowSuccessModal(true);
  };

  const handleCloseBookingForm = () => {
    setShowBookingForm(false);
    setSelectedBooking(null);
  };

  return (
    <Layout>
      <PartiesHero />
      <PartyPackages />
      
      <BookingFlow />
      <PartyGallery />
      <PartyFAQ />

      {/* Booking Form Modal */}
      {showBookingForm && selectedBooking && (
        <PartyBookingForm
          selectedDate={selectedBooking.date}
          selectedTimeSlot={selectedBooking.timeSlot}
          onClose={handleCloseBookingForm}
          onSubmit={handleBookingSubmit}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successDetails.title}
        message={successDetails.message}
        details={successDetails.details}
      />
    </Layout>
  )
}
