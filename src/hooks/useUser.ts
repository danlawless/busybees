/**
 * useUser Hook
 * Custom hook to get current user information
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser) {
          // Fetch profile
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    };

    getUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(data);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    role: profile?.role,
    isStaff: profile?.role === 'staff' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    isCustomer: profile?.role === 'customer',
  };
}

