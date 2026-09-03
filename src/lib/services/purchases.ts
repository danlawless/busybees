/**
 * Purchase Service Layer
 * CRUD operations for purchases
 */

import { createClient, createAdminClient } from "../supabase/server";
import { Database } from "../supabase/database.types";
import { formatDateToYYYYMMDD } from "../utils";

type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];
type PurchaseUpdate = Database["public"]["Tables"]["purchases"]["Update"];

/**
 * Get purchase by ID
 */
export async function getPurchase(id: string): Promise<Purchase | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching purchase:", error);
        throw error;
    }

    return data;
}

/**
 * Get purchase by ID, bypassing RLS.
 *
 * Feeds server-side validation gates (batch check-in ownership and capacity)
 * that deny on an absent row. POS routes are PIN-gated at the application
 * level and `/api` is excluded from auth middleware, so a request here may
 * carry no Supabase auth session for RLS to evaluate `auth.uid() =
 * customer_id` against -- `getPurchase` above would then silently see
 * nothing for reasons that have nothing to do with who owns the purchase. A
 * gate that treats absence as "deny" must not be fed by a read that can
 * return absence for an unrelated reason, so this reads with the same admin
 * client the insert already uses. Do not swap this back to `createClient()`.
 */
export async function getPurchaseAsAdmin(id: string): Promise<Purchase | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        // A genuinely missing row surfaces as PGRST116 ("no rows returned")
        // -- that is a real "not found", not an RLS artifact, so return null
        // rather than throwing.
        if (error.code === "PGRST116") {
            return null;
        }
        console.error("Error fetching purchase (admin):", error);
        throw error;
    }

    return data;
}

/**
 * Get all purchases for a customer
 */
export async function getCustomerPurchases(customerId: string): Promise<Purchase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("customer_id", customerId)
        .order("purchase_date", { ascending: false });

    if (error) {
        console.error("Error fetching customer purchases:", error);
        throw error;
    }

    return data;
}

/**
 * Get purchases for a customer filtered by type
 */
export async function getCustomerPurchasesByType(
    customerId: string,
    type: string
): Promise<Purchase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("customer_id", customerId)
        .eq("type", type)
        .order("purchase_date", { ascending: false });

    if (error) {
        console.error("Error fetching customer purchases by type:", error);
        throw error;
    }

    return data;
}

/**
 * Get active purchases for a customer
 */
export async function getActivePurchases(customerId: string): Promise<Purchase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("customer_id", customerId)
        .eq("status", "active")
        .order("purchase_date", { ascending: false });

    if (error) {
        console.error("Error fetching active purchases:", error);
        throw error;
    }

    return data;
}

/**
 * Get all purchases (staff only)
 */
export async function getAllPurchases(): Promise<Purchase[]> {
    const supabase = await createClient();

    // Paginated to bypass Supabase 1000-row cap
    const PAGE_SIZE = 1000;
    const all: Purchase[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from("purchases")
            .select("*")
            .order("purchase_date", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("Error fetching all purchases:", error);
            throw error;
        }

        const rows = data || [];
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return all;
}

/**
 * Create a new purchase
 */
export async function createPurchase(purchase: PurchaseInsert): Promise<Purchase> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("purchases")
        .insert(purchase)
        .select()
        .single();

    if (error) {
        console.error("Error creating purchase:", error);
        throw error;
    }

    return data;
}

/**
 * Update a purchase
 */
export async function updatePurchase(
    id: string,
    updates: PurchaseUpdate
): Promise<Purchase> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("purchases")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating purchase:", error);
        throw error;
    }

    return data;
}

/**
 * Delete a purchase (for refunds)
 */
export async function deletePurchase(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (error) {
        console.error("Error deleting purchase:", error);
        throw error;
    }
}

/**
 * Get purchases for today
 */
export async function getTodayPurchases(): Promise<Purchase[]> {
    const supabase = await createClient();
    const today = formatDateToYYYYMMDD(new Date());

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .gte("purchase_date", `${today}T00:00:00.000Z`)
        .lte("purchase_date", `${today}T23:59:59.999Z`)
        .order("purchase_date", { ascending: false });

    if (error) {
        console.error("Error fetching today purchases:", error);
        throw error;
    }

    return data;
}
