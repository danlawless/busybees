'use client';

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/client-logger';
import {
    PromoSpecial,
    getPromosFromStorage,
    savePromosToStorage,
} from '@/lib/utils/promoHelpers';
import { INITIAL_PROMOS } from '@/lib/utils/promoConstants';
import {
    PassProduct,
    PartyProduct,
    FoodProduct,
    VolumeDiscount,
    getVolumeDiscountsFromStorage,
    saveVolumeDiscountsToStorage,
} from '@/lib/utils/productHelpers';
import {
    fetchPasses,
    fetchParties,
    fetchProducts,
} from '@/lib/api/products';

/**
 * The catalog the POS and the admin bridge both need: promos, passes, parties,
 * products, volume discounts and the customer list. Moved verbatim from
 * src/app/pos/page.tsx; effects, their order and storage keys are unchanged.
 *
 * `C` is the caller's customer shape (the POS page and AdminPanel each declare
 * their own). Customers load on mount only when `loadCustomers` is true; the POS
 * passes false and keeps fetching them when staff open the admin view.
 */
export function usePosCatalog<C = unknown>(opts: { loadCustomers: boolean }) {
    // Promo specials state
    const [promos, setPromos] = useState<PromoSpecial[]>([]);

    // Product management state
    const [passes, setPasses] = useState<PassProduct[]>([]);
    const [parties, setParties] = useState<PartyProduct[]>([]);
    const [products, setProducts] = useState<FoodProduct[]>([]);
    const [volumeDiscounts, setVolumeDiscounts] = useState<VolumeDiscount[]>([]);

    // Initialize promos from database
    useEffect(() => {
        const loadPromos = async () => {
            try {
                const response = await fetch('/api/promos');
                if (response.ok) {
                    const { promos: dbPromos } = await response.json();

                    // Convert database format to UI format
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const formattedPromos: PromoSpecial[] = dbPromos.map((promo: any) => ({
                        id: promo.id,
                        name: promo.name,
                        startDate: promo.start_date,
                        endDate: promo.end_date,
                        discountPercent: promo.discount_percent,
                        description: promo.description,
                        stripeCouponCode: promo.stripe_coupon_code,
                        bannerStyle: promo.banner_style,
                        isActive: promo.is_active,
                        createdAt: promo.created_at,
                        updatedAt: promo.updated_at,
                    }));

                    setPromos(formattedPromos);

                    // Also save to localStorage for offline access
                    savePromosToStorage(formattedPromos);
                } else {
                    // Fallback to localStorage if API fails
                    const storedPromos = getPromosFromStorage();
                    if (storedPromos.length > 0) {
                        setPromos(storedPromos);
                    } else {
                        // Last resort: use hardcoded initial promos
                        setPromos(INITIAL_PROMOS);
                        savePromosToStorage(INITIAL_PROMOS);
                    }
                }
            } catch (error) {
                console.error('Failed to load promos:', error);
                // Fallback to localStorage
                const storedPromos = getPromosFromStorage();
                if (storedPromos.length > 0) {
                    setPromos(storedPromos);
                } else {
                    setPromos(INITIAL_PROMOS);
                    savePromosToStorage(INITIAL_PROMOS);
                }
            }
        };

        loadPromos();
    }, []);

    // Save promos to localStorage whenever they change (for offline caching)
    useEffect(() => {
        if (promos.length > 0) {
            savePromosToStorage(promos);
        }
    }, [promos]);

    // Fetch passes from database API
    useEffect(() => {
        const loadPasses = async () => {
            try {
                const dbPasses = await fetchPasses();
                if (dbPasses.length === 0) {
                    logger.error({}, "No passes found in database - run seed-all-products.sql");
                }
                setPasses(dbPasses);
            } catch (error) {
                logger.error({ error }, "Failed to fetch passes from database");
            }
        };
        loadPasses();
    }, []);

    // Fetch parties from database API
    useEffect(() => {
        const loadParties = async () => {
            try {
                const dbParties = await fetchParties();
                if (dbParties.length === 0) {
                    logger.error({}, "No party packages found in database - run seed-all-products.sql");
                }
                setParties(dbParties);
            } catch (error) {
                logger.error({ error }, "Failed to fetch parties from database");
            }
        };
        loadParties();
    }, []);

    // Fetch products from database API
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const dbProducts = await fetchProducts();
                if (dbProducts.length === 0) {
                    logger.error({}, "No products found in database - run seed-all-products.sql");
                }
                setProducts(dbProducts);
            } catch (error) {
                logger.error({ error }, "Failed to fetch products from database");
            }
        };
        loadProducts();
    }, []);

    // Load volume discounts from localStorage (no database table yet)
    useEffect(() => {
        const storedDiscounts = getVolumeDiscountsFromStorage();
        setVolumeDiscounts(storedDiscounts);
    }, []);

    // Save volume discounts to localStorage whenever they change (no database table yet)
    useEffect(() => {
        if (volumeDiscounts.length > 0) {
            saveVolumeDiscountsToStorage(volumeDiscounts);
        }
    }, [volumeDiscounts]);

    // All customer data comes from API calls via PhoneLogin
    const [customers, setCustomers] = useState<C[]>([]);

    // Fetch customers from database when entering admin mode
    const refreshCustomers = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/customers');
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.customers || []);
                logger.info({ customerCount: (data.customers || []).length }, "Loaded customers for admin panel");
            } else {
                logger.error({ status: response.status }, "Failed to fetch customers");
            }
        } catch (error) {
            logger.error({ error }, "Error fetching customers");
        }
    }, []);

    // Admin bridge only: load customers on mount (the POS loads them on entering admin)
    useEffect(() => {
        if (opts.loadCustomers) void refreshCustomers();
    }, [opts.loadCustomers, refreshCustomers]);

    return {
        customers, setCustomers,
        promos, setPromos,
        passes, setPasses,
        parties, setParties,
        products, setProducts,
        volumeDiscounts, setVolumeDiscounts,
        refreshCustomers,
    };
}
