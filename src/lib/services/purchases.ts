/**
 * Purchase Service Layer
 * CRUD operations for purchases
 */

import { createClient } from "../supabase/server";
import { Database } from "../supabase/database.types";

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

    const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("purchase_date", { ascending: false });

    if (error) {
        console.error("Error fetching all purchases:", error);
        throw error;
    }

    return data;
}

/**
 * Create a new purchase
 */
export async function createPurchase(purchase: PurchaseInsert): Promise<Purchase> {
    const supabase = await createClient();

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
    const supabase = await createClient();

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
    const supabase = await createClient();

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
    const today = new Date().toISOString().split("T")[0];

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
