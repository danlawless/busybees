'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { X, CheckCircle, Calendar, Clock, Users, DollarSign } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: {
    date?: string;
    time?: string;
    guests?: number;
    price?: number;
    type?: string;
  };
  autoCloseDelay?: number; // Auto-close after X milliseconds
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  details,
  autoCloseDelay = 5000 
}: SuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseDelay / 1000));

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCountdown(Math.ceil(autoCloseDelay / 1000));

      // Start countdown
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-close timer
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(autoCloseTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Wait for fade out animation
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
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ zIndex: 10000 }}
    >
      <Card 
        className={`w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Details */}
          {details && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Booking Details</h3>
              <div className="grid gap-2 text-sm">
                {details.date && (
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span>{formatDate(details.date)}</span>
                  </div>
                )}
                {details.time && (
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{details.time}</span>
                  </div>
                )}
                {details.guests && (
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>{details.guests} guests</span>
                  </div>
                )}
                {details.price && (
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>${details.price.toFixed(2)} {details.type && `(${details.type})`}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Perfect! 🎉
            </Button>
          </div>

          {/* Auto-close countdown */}
          <p className="text-xs text-gray-400 mt-4">
            Auto-closing in {countdown} second{countdown !== 1 ? 's' : ''}
          </p>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
