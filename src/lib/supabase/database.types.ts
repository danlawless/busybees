/**
 * TypeScript types for Supabase database schema
 * These will be generated from Supabase once the schema is created
 * For now, this is a placeholder
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: 'customer' | 'staff' | 'admin';
          phone: string;
          name: string;
          email: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'customer' | 'staff' | 'admin';
          phone: string;
          name: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'customer' | 'staff' | 'admin';
          phone?: string;
          name?: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          birthdate: string;
          waiver_signed: boolean;
          waiver_signed_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          name: string;
          birthdate: string;
          waiver_signed?: boolean;
          waiver_signed_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          name?: string;
          birthdate?: string;
          waiver_signed?: boolean;
          waiver_signed_date?: string | null;
          created_at?: string;
        };
      };
      passes: {
        Row: {
          id: string;
          name: string;
          category: 'day' | 'weekly' | 'monthly';
          price: number;
          duration: number;
          sessions_included: number;
          description: string;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          stripe_purchase_link: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'day' | 'weekly' | 'monthly';
          price: number;
          duration: number;
          sessions_included: number;
          description: string;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'day' | 'weekly' | 'monthly';
          price?: number;
          duration?: number;
          sessions_included?: number;
          description?: string;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      party_packages: {
        Row: {
          id: string;
          name: string;
          base_price: number;
          capacity: number;
          duration: number;
          included_items: Json;
          add_ons: Json;
          description: string;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          stripe_purchase_link: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          base_price: number;
          capacity: number;
          duration: number;
          included_items: Json;
          add_ons: Json;
          description: string;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          base_price?: number;
          capacity?: number;
          duration?: number;
          included_items?: Json;
          add_ons?: Json;
          description?: string;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: 'food' | 'beverage' | 'retail';
          price: number;
          description: string;
          allergens: Json;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          stripe_purchase_link: string;
          is_active: boolean;
          available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'food' | 'beverage' | 'retail';
          price: number;
          description: string;
          allergens: Json;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link: string;
          is_active?: boolean;
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'food' | 'beverage' | 'retail';
          price?: number;
          description?: string;
          allergens?: Json;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          stripe_purchase_link?: string;
          is_active?: boolean;
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          customer_id: string;
          child_id: string | null;
          type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
          product_id: string;
          name: string;
          price: number;
          purchase_date: string;
          expiry_date: string | null;
          first_use_date: string | null;
          actual_expiry_date: string | null;
          used_sessions: number;
          total_sessions: number;
          status: 'active' | 'expired' | 'used';
          auto_renew: boolean;
          next_renewal_date: string | null;
          stripe_payment_intent_id: string | null;
          stripe_subscription_id: string | null;
          party_date: string | null;
          party_start_time: string | null;
          party_end_time: string | null;
          party_guests: number | null;
          party_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          child_id?: string | null;
          type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
          product_id: string;
          name: string;
          price: number;
          purchase_date?: string;
          expiry_date?: string | null;
          first_use_date?: string | null;
          actual_expiry_date?: string | null;
          used_sessions?: number;
          total_sessions: number;
          status?: 'active' | 'expired' | 'used';
          auto_renew?: boolean;
          next_renewal_date?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_subscription_id?: string | null;
          party_date?: string | null;
          party_start_time?: string | null;
          party_end_time?: string | null;
          party_guests?: number | null;
          party_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          child_id?: string | null;
          type?: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
          product_id?: string;
          name?: string;
          price?: number;
          purchase_date?: string;
          expiry_date?: string | null;
          first_use_date?: string | null;
          actual_expiry_date?: string | null;
          used_sessions?: number;
          total_sessions?: number;
          status?: 'active' | 'expired' | 'used';
          auto_renew?: boolean;
          next_renewal_date?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_subscription_id?: string | null;
          party_date?: string | null;
          party_start_time?: string | null;
          party_end_time?: string | null;
          party_guests?: number | null;
          party_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          customer_id: string;
          purchase_id: string;
          start_time: string;
          end_time: string | null;
          duration: number | null;
          auto_checkout_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          purchase_id: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number | null;
          auto_checkout_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          purchase_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number | null;
          auto_checkout_time?: string;
          created_at?: string;
        };
      };
      promos: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          discount_percent: number;
          description: string;
          stripe_coupon_id: string | null;
          stripe_coupon_code: string;
          banner_style: 'honeycomb' | 'gradient-wave' | 'confetti' | 'minimal' | 'bold-stripes';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          discount_percent: number;
          description: string;
          stripe_coupon_id?: string | null;
          stripe_coupon_code: string;
          banner_style?: 'honeycomb' | 'gradient-wave' | 'confetti' | 'minimal' | 'bold-stripes';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          discount_percent?: number;
          description?: string;
          stripe_coupon_id?: string | null;
          stripe_coupon_code?: string;
          banner_style?: 'honeycomb' | 'gradient-wave' | 'confetti' | 'minimal' | 'bold-stripes';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      volume_discounts: {
        Row: {
          id: string;
          product_id: string;
          product_type: 'pass' | 'party' | 'product';
          min_quantity: number;
          discount_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          product_type: 'pass' | 'party' | 'product';
          min_quantity: number;
          discount_percent: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          product_type?: 'pass' | 'party' | 'product';
          min_quantity?: number;
          discount_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_cards: {
        Row: {
          id: string;
          customer_id: string;
          stripe_payment_method_id: string;
          last4: string;
          brand: string;
          expiry_month: number;
          expiry_year: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          stripe_payment_method_id: string;
          last4: string;
          brand: string;
          expiry_month: number;
          expiry_year: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          stripe_payment_method_id?: string;
          last4?: string;
          brand?: string;
          expiry_month?: number;
          expiry_year?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          is_encrypted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          is_encrypted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string | null;
          is_encrypted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      party_bookings: {
        Row: {
          id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          customer_address: string | null;
          party_type: 'private' | 'semi_private';
          package_name: 'queen_bee' | 'worker_bee' | 'basic_bee';
          party_date: string;
          start_time: string;
          end_time: string;
          child_name: string;
          child_age: number | null;
          guest_count: number;
          additional_kids: number;
          base_price: number;
          additional_kids_price: number;
          total_price: number;
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          notes: string | null;
          stripe_payment_intent_id: string | null;
          stripe_checkout_session_id: string | null;
          payment_status: string | null;
          customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          customer_address?: string | null;
          party_type: 'private' | 'semi_private';
          package_name: 'queen_bee' | 'worker_bee' | 'basic_bee';
          party_date: string;
          start_time: string;
          end_time: string;
          child_name: string;
          child_age?: number | null;
          guest_count?: number;
          additional_kids?: number;
          base_price: number;
          additional_kids_price?: number;
          total_price: number;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          notes?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_status?: string | null;
          customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          customer_address?: string | null;
          party_type?: 'private' | 'semi_private';
          package_name?: 'queen_bee' | 'worker_bee' | 'basic_bee';
          party_date?: string;
          start_time?: string;
          end_time?: string;
          child_name?: string;
          child_age?: number | null;
          guest_count?: number;
          additional_kids?: number;
          base_price?: number;
          additional_kids_price?: number;
          total_price?: number;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          notes?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_status?: string | null;
          customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'customer' | 'staff' | 'admin';
      pass_category: 'day' | 'weekly' | 'monthly';
      product_category: 'food' | 'beverage' | 'retail';
      purchase_type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
      purchase_status: 'active' | 'expired' | 'used';
      product_type: 'pass' | 'party' | 'product';
      banner_style: 'honeycomb' | 'gradient-wave' | 'confetti' | 'minimal' | 'bold-stripes';
    };
  };
}
