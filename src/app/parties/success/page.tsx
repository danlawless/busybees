'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, Users, Gift, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { parseDateString } from '@/lib/utils';

interface BookingDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  child_name: string;
  party_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  package_name: string;
  party_type: string;
  total_price: number;
  status: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id');

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/party-booking/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
        } else {
          setError('Could not fetch booking details');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    // Give a moment for the webhook to process
    const timer = setTimeout(fetchBookingDetails, 1500);
    return () => clearTimeout(timer);
  }, [bookingId]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    return parseDateString(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPackageName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-honey-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading your booking confirmation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[60vh] py-12">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Success Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-green-600" />
              </motion.div>
              <h1 className="text-3xl font-bold text-charcoal-800 mb-2">
                Party Booking Confirmed!
              </h1>
              <p className="text-gray-600">
                Thank you for booking with Busy Bees Indoor Play Center
              </p>
            </div>

            {booking ? (
              <Card className="p-8 mb-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Party Details */}
                  <div>
                    <h3 className="font-semibold text-charcoal-800 mb-4 flex items-center">
                      <Gift className="w-5 h-5 mr-2 text-honey-600" />
                      Party Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(booking.party_date)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{booking.guest_count} children</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Gift className="w-4 h-4 text-gray-400" />
                        <span>{formatPackageName(booking.package_name)} Package</span>
                      </div>
                    </div>
                  </div>

                  {/* Birthday Child */}
                  <div>
                    <h3 className="font-semibold text-charcoal-800 mb-4">Birthday Celebration</h3>
                    <div className="p-4 bg-honey-50 rounded-lg border border-honey-200">
                      <p className="text-lg font-semibold text-charcoal-800">
                        {booking.child_name}&apos;s Birthday Party!
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.party_type === 'private' ? 'Private' : 'Semi-Private'} Party
                      </p>
                    </div>

                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Paid</span>
                        <span className="text-xl font-bold text-green-700">
                          ${booking.total_price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation Email Notice */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Confirmation Email Sent</p>
                      <p className="text-sm text-blue-600">
                        We&apos;ve sent a confirmation email to{' '}
                        <strong>{booking.customer_email}</strong> with all the party details.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 mb-8 text-center">
                {error ? (
                  <p className="text-gray-600">{error}</p>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Your booking has been confirmed! Check your email for details.
                    </p>
                  </>
                )}
              </Card>
            )}

            {/* What's Next */}
            <Card className="p-6 mb-8 bg-gradient-to-r from-honey-50 to-yellow-50 border-honey-200">
              <h3 className="font-semibold text-charcoal-800 mb-4">What&apos;s Next?</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>You&apos;ll receive a confirmation email with your party details</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Our team will reach out 3-5 days before your party to confirm final details</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Arrive 15 minutes early on the day of your party for setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Bring any decorations or personal items you&apos;d like to use</span>
                </li>
              </ul>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
              <Link href="/parties">
                <Button className="bg-honey-500 hover:bg-honey-600 text-white">
                  View Party Packages
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

export default function PartySuccessPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-honey-500" />
          </div>
        </Layout>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
