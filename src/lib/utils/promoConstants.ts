/**
 * Hardcoded Promo Specials
 * This is the single source of truth for all promotional offers
 * Later: These will be migrated to a database
 */

import { PromoSpecial } from "./promoHelpers";

export const PROMO_VERSION = "v4_dec10_2025_disabled"; // Update this to force reload of new promo codes

export const INITIAL_PROMOS: PromoSpecial[] = [
    {
        id: "promo-1",
        name: "Early Bee!",
        startDate: "2024-10-01",
        endDate: "2024-11-20",
        discountPercent: 20,
        description: "Coming soon!  Bee one of the first!",
        stripeCouponCode: "EARLYBEE20",
        bannerStyle: "honeycomb",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-2",
        name: "Black Friday!",
        startDate: "2024-11-21",
        endDate: "2024-11-30",
        discountPercent: 30,
        description: "Black Friday Deal! (Thanksgiving)",
        stripeCouponCode: "BLACKFRIDAY30",
        bannerStyle: "bold-stripes",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-3",
        name: "Cyber Monday",
        startDate: "2024-11-30",
        endDate: "2024-12-01",
        discountPercent: 40,
        description: "Cyber Monday!",
        stripeCouponCode: "CYBERMONDAY40",
        bannerStyle: "gradient-wave",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-4",
        name: "Winter Special!",
        startDate: "2024-12-01",
        endDate: "2024-12-19",
        discountPercent: 15,
        description: "Warm up with winter special!",
        stripeCouponCode: "WINTERSPECIAL15",
        bannerStyle: "honeycomb",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-5",
        name: "Christmas Special!",
        startDate: "2024-12-20",
        endDate: "2024-12-25",
        discountPercent: 25,
        description: "Merry Christmas this week only!",
        stripeCouponCode: "XMASSGIFT25",
        bannerStyle: "confetti",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-6",
        name: "New Years Special!",
        startDate: "2024-12-29",
        endDate: "2025-01-01",
        discountPercent: 30,
        description: "2 Day New Years Special",
        stripeCouponCode: "NEWYEARS30",
        bannerStyle: "confetti",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "promo-7",
        name: "Opening Special",
        startDate: "2025-01-01",
        endDate: "2025-03-01",
        discountPercent: 10,
        description: "Special to leave running for 1st 3 months Opening",
        stripeCouponCode: "GRANDOPEN10",
        bannerStyle: "honeycomb",
        isActive: false, // Disabled - promo data preserved for future use
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

