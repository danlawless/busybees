/**
 * Cron Route: Birthday Party Promo Email (45 Days Before)
 * Runs daily — sends a promo email to parents whose child's birthday is 45 days away
 * Encourages them to book a party at Busy Bees
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendBirthdayPromoEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { easternNow } from '@/lib/services/report-aggregations';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    // Calculate the target birthday (45 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 45);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    // Find children whose birthday month and day match (any year)
    // We query all children and filter by month/day since birthdate includes the birth year
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, birthdate, customer_id')
      .not('customer_id', 'is', null);

    if (error) {
      logger.error({ error }, 'Failed to fetch children for birthday promo');
      return NextResponse.json({ success: false, error: 'Failed to fetch children' }, { status: 500 });
    }

    // Filter children whose birthday (month/day) matches 45 days from now
    const matchingChildren = (children || []).filter(child => {
      if (!child.birthdate) return false;
      const [, month, day] = child.birthdate.split('-').map(Number);
      return month === targetMonth && day === targetDay;
    });

    if (matchingChildren.length === 0) {
      logger.info({ targetMonth, targetDay }, 'No children with birthdays 45 days from now');
      return NextResponse.json({
        success: true,
        message: 'No upcoming birthdays to promote',
        sent: 0,
        targetDate: `${targetMonth}/${targetDay}`,
      });
    }

    // Fetch parent profiles for matching children
    const customerIds = [...new Set(matchingChildren.map(c => c.customer_id))];
    const { data: parents } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', customerIds);

    const parentMap = new Map((parents || []).map(p => [p.id, p]));

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < matchingChildren.length; i++) {
      const child = matchingChildren[i];
      const parent = parentMap.get(child.customer_id);

      if (!parent?.email) {
        skipped++;
        continue;
      }

      // Calculate child's current age
      const birthDate = new Date(child.birthdate + 'T00:00:00');
      const et = easternNow();
      const today = new Date(et.year, et.month - 1, et.day);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Rate limit: wait 600ms between sends
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const result = await sendBirthdayPromoEmail({
        to: parent.email,
        parentName: parent.name || 'Busy Bees Family',
        childName: child.name,
        childAge: age,
      });

      if (result.success) {
        sent++;
        logger.info({ childName: child.name, to: parent.email }, 'Birthday promo email sent');
      } else {
        failed++;
        errors.push({ email: parent.email, error: result.error || 'Unknown error' });
        logger.error({ childName: child.name, error: result.error }, 'Failed to send birthday promo email');
      }
    }

    logger.info({ sent, failed, skipped, total: matchingChildren.length }, 'Birthday promo batch complete');

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} birthday promo email${sent !== 1 ? 's' : ''}`,
      sent,
      failed,
      skipped,
      total: matchingChildren.length,
      targetDate: `${targetMonth}/${targetDay}`,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Birthday promo cron error');
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
