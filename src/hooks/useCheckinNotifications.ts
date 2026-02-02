'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useCheckinNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channel = supabase
      .channel('session-checkins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
        },
        async (payload) => {
          // Fetch customer name for the new session
          const customerId = payload.new.customer_id;
          if (!customerId) return;

          try {
            const { data: user } = await supabase
              .from('users')
              .select('name')
              .eq('id', customerId)
              .single();

            const name = user?.name || 'A customer';
            toast.success(`${name} has checked in!`, {
              duration: 5000,
            });
          } catch {
            toast.success('A customer has checked in!', {
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
