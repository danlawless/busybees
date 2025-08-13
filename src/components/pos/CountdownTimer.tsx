'use client';

import { useState, useEffect } from 'react';

type PassType = 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';

interface CountdownTimerProps {
  expiryDate: string;
  type: PassType;
  onExpired?: () => void;
}

export function CountdownTimer({ expiryDate, type, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryDate).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, total: difference });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        if (onExpired) {
          onExpired();
        }
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate, onExpired]);

  const formatTimeUnit = (value: number, unit: string) => {
    if (value === 0) return null;
    return `${value}${unit.charAt(0)}`;
  };

  const getUrgencyColor = () => {
    const { total, days, hours } = timeLeft;
    
    if (total <= 0) return 'text-red-600 bg-red-50';
    
    // Day pass - urgent if < 2 hours
    if (type === 'day_pass' && days === 0 && hours < 2) {
      return 'text-red-600 bg-red-50';
    }
    
    // Weekly pass - urgent if < 1 day
    if (type === 'weekly_pass' && days < 1) {
      return 'text-orange-600 bg-orange-50';
    }
    
    // Monthly pass - urgent if < 3 days
    if (type === 'monthly_pass' && days < 3) {
      return 'text-orange-600 bg-orange-50';
    }
    
    // Warning zone
    if (type === 'day_pass' && days === 0 && hours < 6) {
      return 'text-yellow-700 bg-yellow-50';
    }
    
    if ((type === 'weekly_pass' && days < 2) || (type === 'monthly_pass' && days < 7)) {
      return 'text-yellow-700 bg-yellow-50';
    }
    
    return 'text-green-700 bg-green-50';
  };

  const getDisplayText = () => {
    const { days, hours, minutes, seconds, total } = timeLeft;
    
    if (total <= 0) {
      return 'EXPIRED';
    }

    const parts = [];
    
    if (days > 0) parts.push(formatTimeUnit(days, 'day'));
    if (hours > 0) parts.push(formatTimeUnit(hours, 'hour'));
    
    // For day passes, always show minutes and seconds when < 1 day
    if (type === 'day_pass' && days === 0) {
      if (hours > 0) parts.push(formatTimeUnit(minutes, 'minute'));
      if (hours === 0) parts.push(formatTimeUnit(seconds, 'second'));
    } else if (days === 0 && hours < 6) {
      // For other passes, show minutes when less than 6 hours
      parts.push(formatTimeUnit(minutes, 'minute'));
    }

    return parts.slice(0, 2).join(' ') || '< 1m';
  };

  const getIcon = () => {
    const { total } = timeLeft;
    
    if (total <= 0) return '❌';
    
    if (type === 'day_pass') {
      if (timeLeft.days === 0 && timeLeft.hours < 2) return '🚨';
      if (timeLeft.days === 0 && timeLeft.hours < 6) return '⚠️';
      return '⏰';
    }
    
    if (type === 'weekly_pass') {
      if (timeLeft.days < 1) return '🚨';
      if (timeLeft.days < 2) return '⚠️';
      return '📅';
    }
    
    if (type === 'monthly_pass') {
      if (timeLeft.days < 3) return '🚨';
      if (timeLeft.days < 7) return '⚠️';
      return '📅';
    }
    
    if (type === 'food_beverage') {
      if (timeLeft.days === 0 && timeLeft.hours < 2) return '🚨';
      if (timeLeft.days === 0 && timeLeft.hours < 6) return '⚠️';
      return '🍯';
    }
    
    return '⏰';
  };

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-red-600 bg-red-50 border border-red-200">
        <span>❌</span>
        <span className="font-semibold text-sm">EXPIRED</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getUrgencyColor()}`}>
      <span>{getIcon()}</span>
      <span className="font-semibold text-sm">
        {getDisplayText()} left
      </span>
    </div>
  );
}
