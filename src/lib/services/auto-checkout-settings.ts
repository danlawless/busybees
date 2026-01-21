/**
 * Auto-Checkout Settings Service
 * Manages timezone and closing time for automatic session checkout
 */

import { createAdminClient } from '../supabase/server';

export interface AutoCheckoutSettings {
  timezone: string;
  closingTime: string; // HH:MM format in 24-hour time
}

/**
 * Get the current auto-checkout settings
 */
export async function getAutoCheckoutSettings(): Promise<AutoCheckoutSettings> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['timezone', 'closing_time']);

  if (error) {
    console.error('Failed to fetch auto-checkout settings:', error);
    // Return defaults
    return {
      timezone: 'America/New_York',
      closingTime: '20:00'
    };
  }

  const settings: AutoCheckoutSettings = {
    timezone: 'America/New_York',
    closingTime: '20:00'
  };

  for (const row of data || []) {
    if (row.key === 'timezone') {
      settings.timezone = row.value;
    } else if (row.key === 'closing_time') {
      settings.closingTime = row.value;
    }
  }

  return settings;
}

/**
 * Set the closing time (HH:MM format in 24-hour time)
 */
export async function setClosingTime(time: string): Promise<void> {
  // Validate HH:MM format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    throw new Error('Invalid time format. Use HH:MM in 24-hour format.');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'closing_time',
      value: time,
      description: 'Default closing time for auto-checkout (HH:MM)',
      is_encrypted: false
    });

  if (error) {
    throw new Error(`Failed to update closing time: ${error.message}`);
  }
}

/**
 * Set the timezone (IANA format, e.g., 'America/New_York')
 */
export async function setTimezone(timezone: string): Promise<void> {
  // Basic validation - check if it looks like an IANA timezone
  if (!timezone || typeof timezone !== 'string' || !timezone.includes('/')) {
    throw new Error('Invalid timezone format. Use IANA format (e.g., America/New_York).');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'timezone',
      value: timezone,
      description: 'Timezone for auto-checkout closing time (IANA format)',
      is_encrypted: false
    });

  if (error) {
    throw new Error(`Failed to update timezone: ${error.message}`);
  }
}
