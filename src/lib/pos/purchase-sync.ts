/**
 * POS Purchase Sync Utilities
 * Bridge layer to sync POS purchases to database
 */

interface Purchase {
  id: string;
  type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate?: string;
  firstUseDate?: string;
  actualExpiryDate?: string;
  usedSessions: number;
  totalSessions: number;
  status: 'active' | 'expired' | 'used';
  autoRenew?: boolean;
  nextRenewalDate?: string;
  childId?: string;
  partyDate?: string;
  partyStartTime?: string;
  partyEndTime?: string;
  partyGuests?: number;
  partyNotes?: string;
}

/**
 * Sync a purchase to the database
 */
export async function syncPurchaseToDatabase(
  customerId: string,
  purchase: Purchase,
  productId: string
): Promise<void> {
  try {
    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        child_id: purchase.childId || null,
        type: purchase.type,
        product_id: productId,
        name: purchase.name,
        price: purchase.price,
        purchase_date: purchase.purchaseDate,
        expiry_date: purchase.expiryDate || null,
        first_use_date: purchase.firstUseDate || null,
        actual_expiry_date: purchase.actualExpiryDate || null,
        used_sessions: purchase.usedSessions,
        total_sessions: purchase.totalSessions,
        status: purchase.status,
        auto_renew: purchase.autoRenew || false,
        next_renewal_date: purchase.nextRenewalDate || null,
        party_date: purchase.partyDate || null,
        party_start_time: purchase.partyStartTime || null,
        party_end_time: purchase.partyEndTime || null,
        party_guests: purchase.partyGuests || null,
        party_notes: purchase.partyNotes || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to sync purchase');
    }

    console.log('✅ Purchase synced to database:', purchase.id);
  } catch (error) {
    console.error('❌ Failed to sync purchase to database:', error);
    // Don't throw - allow POS to continue working even if sync fails
  }
}

/**
 * Batch sync multiple purchases
 */
export async function batchSyncPurchases(
  customerId: string,
  purchases: Array<{ purchase: Purchase; productId: string }>
): Promise<void> {
  await Promise.all(
    purchases.map(({ purchase, productId }) =>
      syncPurchaseToDatabase(customerId, purchase, productId)
    )
  );
}

