/**
 * Seed Script: Populate Promos Table
 * Run this script to seed the database with initial promotional campaigns
 *
 * Usage: npx tsx scripts/seed-promos.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/supabase/database.types';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

type PromoInsert = Database['public']['Tables']['promos']['Insert'];

// Initial promotional campaigns
const INITIAL_PROMOS: PromoInsert[] = [
  {
    name: 'Early Bee!',
    start_date: '2025-10-01',
    end_date: '2025-11-20',
    discount_percent: 20,
    description: 'Coming soon!  Bee one of the first!',
    stripe_coupon_code: 'EARLYBEE20',
    banner_style: 'honeycomb',
    is_active: true,
  },
  {
    name: 'Black Friday!',
    start_date: '2025-11-21',
    end_date: '2025-11-30',
    discount_percent: 30,
    description: 'Black Friday Deal! (Thanksgiving)',
    stripe_coupon_code: 'BLACKFRIDAY30',
    banner_style: 'bold-stripes',
    is_active: true,
  },
  {
    name: 'Cyber Monday',
    start_date: '2025-11-30',
    end_date: '2025-12-01',
    discount_percent: 40,
    description: 'Cyber Monday!',
    stripe_coupon_code: 'CYBERMONDAY40',
    banner_style: 'gradient-wave',
    is_active: true,
  },
  {
    name: 'Winter Special!',
    start_date: '2025-12-01',
    end_date: '2025-12-19',
    discount_percent: 15,
    description: 'Warm up with winter special!',
    stripe_coupon_code: 'WINTERSPECIAL15',
    banner_style: 'honeycomb',
    is_active: true,
  },
  {
    name: 'Christmas Special!',
    start_date: '2025-12-20',
    end_date: '2025-12-25',
    discount_percent: 25,
    description: 'Merry Christmas this week only!',
    stripe_coupon_code: 'XMASSGIFT25',
    banner_style: 'confetti',
    is_active: true,
  },
  {
    name: 'New Years Special!',
    start_date: '2025-12-29',
    end_date: '2026-01-01',
    discount_percent: 30,
    description: '2 Day New Years Special',
    stripe_coupon_code: 'NEWYEARS30',
    banner_style: 'confetti',
    is_active: true,
  },
  {
    name: 'Opening Special',
    start_date: '2026-01-01',
    end_date: '2026-03-01',
    discount_percent: 10,
    description: 'Special to leave running for 1st 3 months Opening',
    stripe_coupon_code: 'GRANDOPEN10',
    banner_style: 'honeycomb',
    is_active: true,
  },
];

async function seedPromos() {
  console.log('🌱 Starting promo seed...\n');

  // Check if promos already exist
  const { data: existingPromos, error: checkError } = await supabase
    .from('promos')
    .select('stripe_coupon_code');

  if (checkError) {
    console.error('❌ Error checking existing promos:', checkError);
    process.exit(1);
  }

  const existingCodes = new Set(existingPromos?.map(p => p.stripe_coupon_code) || []);

  // Filter out promos that already exist
  const promosToInsert = INITIAL_PROMOS.filter(promo => !existingCodes.has(promo.stripe_coupon_code));

  if (promosToInsert.length === 0) {
    console.log('✅ All initial promos already exist in the database.');
    console.log(`   Total promos: ${existingPromos?.length || 0}\n`);
    return;
  }

  console.log(`📝 Inserting ${promosToInsert.length} new promos...`);

  // Insert promos
  const { data, error } = await supabase
    .from('promos')
    .insert(promosToInsert)
    .select();

  if (error) {
    console.error('❌ Error inserting promos:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data?.length || 0} promos!\n`);

  // Display summary
  console.log('📊 Seeded Promos:');
  data?.forEach(promo => {
    console.log(`   • ${promo.name} (${promo.stripe_coupon_code}) - ${promo.discount_percent}% off`);
  });

  console.log(`\n✨ Total promos in database: ${(existingPromos?.length || 0) + (data?.length || 0)}\n`);
}

// Run the seed function
seedPromos()
  .then(() => {
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });

