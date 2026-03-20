import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendLowStockAlertEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

// Simple in-memory dedup: don't send more than one alert per product per hour
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/inventory/low-stock-alert
 * Sends a low-stock email alert (fire-and-forget from purchase flow)
 */
export async function POST(request: NextRequest) {
  try {
    const { productId, productName, currentStock, threshold } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // Dedup: skip if we alerted for this product recently
    const lastAlert = recentAlerts.get(productId);
    if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
      return NextResponse.json({ skipped: true, reason: 'cooldown' });
    }

    // Get product details if not provided
    let name = productName;
    let stock = currentStock;
    let alertThreshold = threshold;
    let category: string | undefined;

    if (!name || stock === undefined) {
      const supabase = createAdminClient();
      const { data: product } = await supabase
        .from('products')
        .select('name, quantity_on_hand, low_stock_threshold, category')
        .eq('id', productId)
        .single();

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      name = product.name;
      stock = product.quantity_on_hand;
      alertThreshold = product.low_stock_threshold;
      category = product.category;
    }

    // Send email
    const result = await sendLowStockAlertEmail({
      productName: name,
      currentStock: stock,
      threshold: alertThreshold,
      category,
    });

    // Mark as sent for dedup
    recentAlerts.set(productId, Date.now());

    // Clean up old entries
    for (const [key, time] of recentAlerts.entries()) {
      if (Date.now() - time > ALERT_COOLDOWN_MS) {
        recentAlerts.delete(key);
      }
    }

    logger.info({ productId, name, stock }, '📧 Low stock alert sent');

    return NextResponse.json({ success: result.success });
  } catch (error) {
    logger.error({ error }, 'Failed to send low stock alert');
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 });
  }
}
