/**
 * POS Settings Service
 * Manages POS mode (kiosk vs staff-assisted)
 */

import { createAdminClient } from '../supabase/server';

export type POSMode = 'kiosk' | 'staff';

/**
 * Get the current POS mode
 * Returns 'kiosk' (self-serve) or 'staff' (staff-assisted)
 */
export async function getPOSMode(): Promise<POSMode> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'pos_mode')
    .single();

  if (error || !data) {
    // Default to kiosk mode if setting not found
    return 'kiosk';
  }

  return (data.value === 'staff' ? 'staff' : 'kiosk') as POSMode;
}

/**
 * Set the POS mode
 */
export async function setPOSMode(mode: POSMode): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('settings')
    .upsert({
      key: 'pos_mode',
      value: mode,
      description: 'POS operation mode: kiosk (self-serve) or staff (staff-assisted)',
      is_encrypted: false
    });
}

/**
 * Check if POS is in kiosk (self-serve) mode
 */
export async function isKioskMode(): Promise<boolean> {
  const mode = await getPOSMode();
  return mode === 'kiosk';
}

