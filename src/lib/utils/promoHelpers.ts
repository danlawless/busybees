/**
 * Promo Specials Helper Functions
 * Utilities for managing marketing promotions and promo codes
 */

export type BannerStyle =
    | "honeycomb"
    | "gradient-wave"
    | "confetti"
    | "minimal"
    | "bold-stripes";

export interface PromoSpecial {
    id: string;
    name: string; // "Early Early Bird!", "Black Friday!"
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    discountPercent: number; // 25, 40, etc.
    description: string; // "Coming soon! Bee one of the first!"
    stripeCouponCode: string; // Stripe coupon code to advertise
    isActive: boolean; // Quick enable/disable toggle
    bannerStyle?: BannerStyle; // Visual style for the banner (defaults to 'honeycomb')
    createdAt: string;
    updatedAt: string;
}

export interface PromoStatus {
    status: "active" | "scheduled" | "expired";
    daysRemaining: number;
    hoursRemaining: number;
    minutesRemaining: number;
}

/**
 * Check if a promo is currently active based on dates and isActive flag
 */
export function isPromoActive(promo: PromoSpecial): boolean {
    if (!promo.isActive) return false;

    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    return now >= start && now <= end;
}

/**
 * Get the status of a promo (active, scheduled, or expired)
 */
export function getPromoStatus(promo: PromoSpecial): PromoStatus {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    let status: "active" | "scheduled" | "expired";

    if (!promo.isActive) {
        status = "expired";
    } else if (now < start) {
        status = "scheduled";
    } else if (now > end) {
        status = "expired";
    } else {
        status = "active";
    }

    // Calculate time remaining
    const timeRemaining = end.getTime() - now.getTime();
    const daysRemaining = Math.max(
        0,
        Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
    );
    const hoursRemaining = Math.max(
        0,
        Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    );
    const minutesRemaining = Math.max(
        0,
        Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
    );

    return {
        status,
        daysRemaining,
        hoursRemaining,
        minutesRemaining,
    };
}

/**
 * Get the currently active promo with the highest discount
 * Returns null if no active promos
 */
export function getActivePromo(promos: PromoSpecial[]): PromoSpecial | null {
    const activePromos = promos.filter(isPromoActive);

    if (activePromos.length === 0) return null;

    // Return the promo with the highest discount percentage
    return activePromos.reduce((highest, current) =>
        current.discountPercent > highest.discountPercent ? current : highest
    );
}

/**
 * Get all scheduled (upcoming) promos
 */
export function getScheduledPromos(promos: PromoSpecial[]): PromoSpecial[] {
    return promos
        .filter((promo) => {
            const status = getPromoStatus(promo);
            return status.status === "scheduled";
        })
        .sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
}

/**
 * Get all expired promos
 */
export function getExpiredPromos(promos: PromoSpecial[]): PromoSpecial[] {
    return promos
        .filter((promo) => {
            const status = getPromoStatus(promo);
            return status.status === "expired";
        })
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
}

/**
 * Format date for display
 */
export function formatPromoDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Format date range for display
 */
export function formatPromoDateRange(startDate: string, endDate: string): string {
    return `${formatPromoDate(startDate)} - ${formatPromoDate(endDate)}`;
}

/**
 * Generate rotating messages for a promo
 */
export function generatePromoMessages(promo: PromoSpecial): string[] {
    const status = getPromoStatus(promo);
    const { daysRemaining, hoursRemaining } = status;

    const messages: string[] = [
        promo.description,
        `Save ${promo.discountPercent}% with code ${promo.stripeCouponCode}`,
    ];

    // Add urgency messages based on time remaining
    if (daysRemaining > 7) {
        messages.push(
            `${promo.name} - ${promo.discountPercent}% OFF through ${formatPromoDate(
                promo.endDate
            )}`
        );
    } else if (daysRemaining > 1) {
        messages.push(
            `Only ${daysRemaining} days left! Save ${promo.discountPercent}%`
        );
    } else if (daysRemaining === 1) {
        messages.push(`Last chance! Only ${hoursRemaining} hours remaining`);
    } else if (hoursRemaining > 0) {
        messages.push(
            `Final hours! ${hoursRemaining} hours left to save ${promo.discountPercent}%`
        );
    }

    messages.push(`Use code ${promo.stripeCouponCode} at checkout`);
    messages.push(
        `Don't miss out! ${promo.name} ends ${formatPromoDate(promo.endDate)}`
    );

    return messages;
}

/**
 * Validate promo code format
 */
export function validatePromoCode(code: string): { valid: boolean; error?: string } {
    if (!code || code.trim().length === 0) {
        return { valid: false, error: "Promo code is required" };
    }

    if (code.length < 3) {
        return { valid: false, error: "Promo code must be at least 3 characters" };
    }

    if (code.length > 50) {
        return { valid: false, error: "Promo code must be less than 50 characters" };
    }

    // Only allow alphanumeric and common special characters
    if (!/^[A-Z0-9_-]+$/i.test(code)) {
        return {
            valid: false,
            error: "Promo code can only contain letters, numbers, hyphens, and underscores",
        };
    }

    return { valid: true };
}

/**
 * Validate promo dates
 */
export function validatePromoDates(
    startDate: string,
    endDate: string
): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        return { valid: false, error: "Invalid start date" };
    }

    if (isNaN(end.getTime())) {
        return { valid: false, error: "Invalid end date" };
    }

    if (end <= start) {
        return { valid: false, error: "End date must be after start date" };
    }

    return { valid: true };
}

/**
 * Check if banner should be shown (not dismissed today)
 * Banner will come back every day (resets at midnight)
 */
export function shouldShowBanner(promoId: string): boolean {
    if (typeof window === "undefined") return true;

    const dismissedKey = `promo_dismissed_${promoId}`;
    const dismissedDateStr = localStorage.getItem(dismissedKey);

    if (!dismissedDateStr) return true;

    const dismissedDate = new Date(dismissedDateStr);
    const now = new Date();

    // Check if dismissed date is today
    // If it's a different day, show the banner again
    const dismissedDay = dismissedDate.toDateString();
    const todayDay = now.toDateString();

    return dismissedDay !== todayDay;
}

/**
 * Mark banner as dismissed for today
 */
export function dismissBanner(promoId: string): void {
    if (typeof window === "undefined") return;

    const dismissedKey = `promo_dismissed_${promoId}`;
    // Store the current date/time
    localStorage.setItem(dismissedKey, new Date().toISOString());
}

/**
 * Get all promos from localStorage with fallback to hardcoded defaults
 */
export function getPromosFromStorage(): PromoSpecial[] {
    if (typeof window === "undefined") {
        // Import here to avoid issues with SSR
        const { INITIAL_PROMOS } = require("./promoConstants");
        return INITIAL_PROMOS;
    }

    const stored = localStorage.getItem("busybees_promos");
    if (!stored) {
        // Fallback to hardcoded promos
        const { INITIAL_PROMOS } = require("./promoConstants");
        return INITIAL_PROMOS;
    }

    try {
        return JSON.parse(stored);
    } catch {
        // If parsing fails, return hardcoded promos
        const { INITIAL_PROMOS } = require("./promoConstants");
        return INITIAL_PROMOS;
    }
}

/**
 * Save promos to localStorage
 */
export function savePromosToStorage(promos: PromoSpecial[]): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("busybees_promos", JSON.stringify(promos));
}
