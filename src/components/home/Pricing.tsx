"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    Star,
    Users,
    Ticket,
    Tag,
    Sparkles,
    TrendingDown,
    X,
    Copy,
    Check as CheckIcon,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { parseDateString } from "@/lib/utils";
import {
    PromoSpecial,
    getActivePromo,
    getPromosFromStorage,
} from "@/lib/utils/promoHelpers";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/lib/supabase/database.types";
import { PURCHASING_ENABLED } from "@/lib/feature-flags";

type Pass = Database["public"]["Tables"]["passes"]["Row"];

// Purchase intent stored in sessionStorage before redirecting to signup
interface PurchaseIntent {
    passId: string;
    passName: string;
    price: number;
    category: string;
    stripePriceId: string | null;
    stripeProductId: string | null;
}

// Helper function to calculate discounted price
const calculateDiscountedPrice = (
    originalPrice: number,
    discountPercent: number
): number => {
    return originalPrice * (1 - discountPercent / 100);
};

// Helper function to calculate savings
const calculateSavings = (originalPrice: number, discountPercent: number): number => {
    return originalPrice * (discountPercent / 100);
};

// Countdown hook
const useCountdown = (endDate: string) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const end = parseDateString(endDate).getTime();
            const now = new Date().getTime();
            const difference = end - now;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [endDate]);

    return timeLeft;
};

// Compact Promo Banner Component
const PromoBanner = ({
    promo,
    onDismiss,
}: {
    promo: PromoSpecial;
    onDismiss: () => void;
}) => {
    const timeLeft = useCountdown(promo.endDate);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(promo.stripeCouponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            className="mt-8 mx-auto max-w-4xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="relative bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 rounded-3xl shadow-honey overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="Dismiss banner"
                >
                    <X className="w-5 h-5 text-white" />
                </button>

                <div className="px-5 py-6 sm:px-8 sm:py-8">
                    {/* Header Text */}
                    <div className="text-center mb-5">
                        <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md mb-1">
                            Save {promo.discountPercent}% with code
                        </h3>
                        <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md tracking-tight">
                            {promo.stripeCouponCode}
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="flex justify-center items-center gap-3 sm:gap-4 mb-5">
                        <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 min-w-[65px] sm:min-w-[75px]">
                            <div className="text-xl sm:text-2xl font-black text-primary-600 leading-none">
                                {timeLeft.days}
                            </div>
                            <div className="text-[10px] sm:text-xs font-medium text-charcoal-600 uppercase mt-1">
                                Days
                            </div>
                        </div>
                        <div className="text-white text-2xl font-black pb-3">:</div>
                        <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 min-w-[65px] sm:min-w-[75px]">
                            <div className="text-xl sm:text-2xl font-black text-primary-600 leading-none">
                                {String(timeLeft.hours).padStart(2, "0")}
                            </div>
                            <div className="text-[10px] sm:text-xs font-medium text-charcoal-600 uppercase mt-1">
                                Hours
                            </div>
                        </div>
                    </div>

                    {/* Promo Code Box */}
                    <div className="flex items-center justify-center">
                        <div className="inline-flex items-center gap-2.5 bg-white rounded-2xl px-5 py-3.5 shadow-soft">
                            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                            <span className="text-xs sm:text-sm font-semibold text-charcoal-700">
                                USE CODE
                            </span>
                            <span className="font-mono font-bold text-base sm:text-lg text-primary-600">
                                {promo.stripeCouponCode}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="ml-2 p-1.5 hover:bg-neutral-100 rounded-xl transition-colors"
                                aria-label="Copy promo code"
                            >
                                {copied ? (
                                    <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-charcoal-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="flex justify-center mt-5">
                        <div className="bg-[#FFB3BA] text-charcoal-800 px-6 py-2 rounded-full text-sm sm:text-base font-black shadow-soft transform -rotate-2">
                            {promo.discountPercent}% OFF
                        </div>
                    </div>

                    {/* Bee Illustrations - Hidden on very small screens */}
                    <div className="hidden sm:block absolute left-4 bottom-4 text-4xl opacity-50">
                        🐝
                    </div>
                    <div className="hidden sm:block absolute right-12 top-6 text-3xl opacity-50">
                        🐝
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Map database pass to display plan format
interface DisplayPlan {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    popular: boolean;
    cta: string;
    icon: typeof Users | typeof Ticket | typeof Star;
    category: string;
    stripePriceId: string | null;
    stripeProductId: string | null;
}

// Helper to get icon based on category
const getIconForCategory = (category: string): typeof Users | typeof Ticket | typeof Star => {
    switch (category) {
        case "day":
            return category.includes("infant") ? Users : Ticket;
        case "weekly":
        case "monthly":
            return Star;
        default:
            return Ticket;
    }
};

// Helper to get CTA text based on category
const getCtaForCategory = (category: string): string => {
    switch (category) {
        case "monthly":
            return "Subscribe Now";
        case "weekly":
            return "Purchase Now";
        default:
            return "Buy Now";
    }
};

// Parse features from description (assumes features separated by newlines or | character)
const parseFeatures = (description: string): string[] => {
    if (!description) return [];
    // Try splitting by | first, then by newlines
    const features = description.includes("|")
        ? description.split("|").map((f) => f.trim())
        : description.split("\n").map((f) => f.trim());
    return features.filter((f) => f.length > 0);
};

interface SavedCard {
    stripe_payment_method_id: string;
    last4: string;
    brand: string;
    is_default: boolean;
}

export function Pricing() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [activePromo, setActivePromo] = useState<PromoSpecial | null>(null);
    const [showBanner, setShowBanner] = useState(true);
    const [passes, setPasses] = useState<Pass[]>([]);
    const [loadingPasses, setLoadingPasses] = useState(true);
    const [purchasingPassId, setPurchasingPassId] = useState<string | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

    // Fetch passes from API
    useEffect(() => {
        const fetchPasses = async () => {
            try {
                const response = await fetch("/api/passes");
                if (!response.ok) throw new Error("Failed to fetch passes");
                const data = await response.json();
                setPasses(data.passes || []);
            } catch (error) {
                console.error("Error fetching passes:", error);
            } finally {
                setLoadingPasses(false);
            }
        };
        fetchPasses();
    }, []);

    // Fetch saved cards when authenticated
    useEffect(() => {
        const fetchSavedCards = async () => {
            if (!isAuthenticated) {
                setSavedCards([]);
                return;
            }
            try {
                const response = await fetch("/api/stripe/payment-methods");
                if (response.ok) {
                    const { paymentMethods } = await response.json();
                    setSavedCards(paymentMethods || []);
                }
            } catch (error) {
                console.error("Error fetching saved cards:", error);
            }
        };
        fetchSavedCards();
    }, [isAuthenticated]);

    // Get default payment method
    const getDefaultPaymentMethod = () => {
        const defaultCard = savedCards.find(c => c.is_default);
        return defaultCard || savedCards[0] || null;
    };

    useEffect(() => {
        const promos = getPromosFromStorage();
        const active = getActivePromo(promos);
        setActivePromo(active);

        // Check if banner was dismissed in this session
        const dismissed = sessionStorage.getItem("promo_banner_dismissed");
        if (dismissed) {
            setShowBanner(false);
        }
    }, []);

    const handleDismissBanner = () => {
        setShowBanner(false);
        sessionStorage.setItem("promo_banner_dismissed", "true");
    };

    // Handle purchase button click
    const handlePurchase = async (plan: DisplayPlan) => {
        if (authLoading) return;

        setPurchasingPassId(plan.id);

        if (isAuthenticated) {
            const paymentMethod = getDefaultPaymentMethod();
                const purchaseType = `${plan.category}_pass` as "day_pass" | "weekly_pass" | "monthly_pass";

            // If user has saved card, use direct payment (one-click purchase)
            if (paymentMethod) {
                try {
                    const response = await fetch("/api/stripe/direct-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: plan.id,
                        productName: plan.name,
                            productPrice: plan.price,
                        productDescription: plan.description,
                        purchaseType,
                            paymentMethodId: paymentMethod.stripe_payment_method_id,
                        metadata: {
                            stripe_price_id: plan.stripePriceId,
                            stripe_product_id: plan.stripeProductId,
                        },
                    }),
                });

                    const data = await response.json();

                if (!response.ok) {
                        throw new Error(data.error || "Payment failed");
                    }

                    // Handle 3DS if required
                    if (data.requiresAction) {
                        alert("Your bank requires additional verification. Please try a different card or use the account page.");
                        setPurchasingPassId(null);
                        return;
                    }

                    if (data.success) {
                        // Show success and redirect to account
                        setPurchaseSuccess(`🎉 ${plan.name} purchased! Charged to card ending in ${paymentMethod.last4}.`);
                        setTimeout(() => {
                            router.push("/customer/dashboard?tab=passes");
                        }, 2000);
                    } else {
                        throw new Error(data.message || "Something went wrong. Please try again.");
                    }
            } catch (error) {
                    console.error("Direct payment error:", error);
                    alert(error instanceof Error ? error.message : "Payment failed. Please try again.");
            } finally {
                    setPurchasingPassId(null);
                }
            } else {
                // No saved card - redirect to account to add one, or use checkout as fallback
                // For better UX, redirect to account page to add payment method first
                router.push("/customer/dashboard?tab=payments");
                setPurchasingPassId(null);
            }
        } else {
            // User not authenticated - store purchase intent and redirect to signup
            const purchaseIntent: PurchaseIntent = {
                passId: plan.id,
                passName: plan.name,
                price: plan.price,
                category: plan.category,
                stripePriceId: plan.stripePriceId,
                stripeProductId: plan.stripeProductId,
            };
            sessionStorage.setItem("purchaseIntent", JSON.stringify(purchaseIntent));

            // Redirect to signup with return URL to purchase page
            router.push("/customer/signup?redirect=/customer/purchase");
            setPurchasingPassId(null);
        }
    };

    // Convert passes to display plans grouped by category
    const dayPasses = passes.filter((p) => p.category === "day");
    const monthlyPasses = passes.filter((p) => p.category === "monthly");
    const weeklyPasses = passes.filter((p) => p.category === "weekly");

    // Create display plans from passes
    const createDisplayPlan = (pass: Pass, isPopular = false): DisplayPlan => ({
        id: pass.id,
        name: pass.name,
        price: Number(pass.price),
        description: pass.description || "",
        features: parseFeatures(pass.description || ""),
        popular: isPopular,
        cta: getCtaForCategory(pass.category),
        icon: getIconForCategory(pass.category),
        category: pass.category,
        stripePriceId: pass.stripe_price_id,
        stripeProductId: pass.stripe_product_id,
    });

    const dayPlans = dayPasses.map((p) => createDisplayPlan(p));
    const monthlyPlans = monthlyPasses.map((p, index) =>
        createDisplayPlan(p, index === monthlyPasses.length - 1) // Last monthly pass is popular
    );
    const weeklyPlans = weeklyPasses.map((p) => createDisplayPlan(p));

    // Loading state
    if (loadingPasses) {
        return (
            <section className="relative py-24 bg-[#FFFDF7] overflow-visible">
                <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
                        <p className="mt-4 text-charcoal-600">Loading passes...</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative py-24 bg-[#FFFDF7] overflow-visible">
            <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-20">
                {/* Purchase Success Message */}
                <AnimatePresence>
                    {purchaseSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-8 p-5 bg-[#A8E6CF]/20 border border-[#A8E6CF]/40 rounded-2xl text-center"
                        >
                            <p className="text-green-800 font-semibold">{purchaseSuccess}</p>
                            <p className="text-green-600 text-sm mt-1">Redirecting to your account...</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl font-bold text-charcoal-800 sm:text-4xl mb-5">
                        Services & Pricing
                    </h2>
                    <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                        Choose the option that works best for your family
                    </p>

                    {/* New Compact Promo Banner */}
                    <AnimatePresence>
                        {activePromo && showBanner && (
                            <PromoBanner
                                promo={activePromo}
                                onDismiss={handleDismissBanner}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Photo accent strip */}
                <motion.div
                    className="mb-16 max-w-5xl mx-auto"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 rounded-2xl overflow-hidden">
                        {['/album/MH_12608.jpg', '/album/MH_12657.jpg', '/album/MH_12693.jpg', '/album/MH_12731.jpg', '/album/MH_12785.jpg', '/album/MH_12824.jpg'].map((src, i) => (
                            <div key={i} className="relative aspect-square overflow-hidden">
                                <Image src={src} alt="" fill className="object-cover" sizes="17vw" loading="lazy" />
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* General Admission (Day Passes) */}
                {dayPlans.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-16"
                    >
                        <h3 className="text-2xl font-bold text-charcoal-800 mb-8 text-center">
                            General Admission
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {dayPlans.map((plan) => {
                                const Icon = plan.icon;
                                const isPurchasing = purchasingPassId === plan.id;
                                return (
                                    <Card
                                        key={plan.id}
                                        className="h-full relative flex flex-col rounded-3xl"
                                    >
                                        <CardHeader className="text-center pb-4">
                                            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                                <Icon className="w-7 h-7 text-primary-500" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                {plan.name}
                                            </CardTitle>
                                            <div className="mt-5">
                                                <div className="text-4xl font-bold text-primary-500">
                                                    ${plan.price}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0 flex-1 flex flex-col">
                                            <ul className="space-y-3 mb-8 flex-1">
                                                {plan.features.map(
                                                    (feature, featureIndex) => (
                                                        <li
                                                            key={featureIndex}
                                                            className="flex items-start"
                                                        >
                                                            <Check className="w-4 h-4 text-[#A8E6CF] mr-2.5 mt-0.5 flex-shrink-0" />
                                                            <span className="text-charcoal-600 text-sm">
                                                                {feature}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                            <Button
                                                className="w-full mt-auto rounded-2xl"
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handlePurchase(plan)}
                                                disabled={!PURCHASING_ENABLED || authLoading || isPurchasing}
                                            >
                                                {!PURCHASING_ENABLED ? (
                                                    "Coming Soon"
                                                ) : isPurchasing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    plan.cta
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Monthly Memberships */}
                {monthlyPlans.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-16 overflow-visible"
                    >
                        <h3 className="text-2xl font-bold text-charcoal-800 mb-8 text-center">
                            Monthly Memberships
                        </h3>
                        {activePromo && (
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-[#A8E6CF]/20 px-6 py-3 rounded-full border-2 border-[#A8E6CF]/50 shadow-soft">
                                    <TrendingDown className="w-5 h-5 text-green-700" />
                                    <span className="font-bold text-green-900">
                                        Save with code {activePromo.stripeCouponCode}!
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto overflow-visible pt-20">
                            {monthlyPlans.map((plan) => {
                                const Icon = plan.icon;
                                const isPurchasing = purchasingPassId === plan.id;
                                const discountedPrice = activePromo
                                    ? calculateDiscountedPrice(
                                          plan.price,
                                          activePromo.discountPercent
                                      )
                                    : null;
                                const savings = activePromo
                                    ? calculateSavings(
                                          plan.price,
                                          activePromo.discountPercent
                                      )
                                    : null;

                                return (
                                    <div key={plan.id} className="relative">
                                        {activePromo && (
                                            <div className="absolute -top-4 -right-4 z-30">
                                                <div className="bg-[#FFB3BA] text-charcoal-800 px-4 py-2 rounded-full text-sm font-black shadow-soft transform rotate-12 border-2 border-white">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkles className="w-4 h-4" />
                                                        SAVE ${savings?.toFixed(0)}!
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <Card
                                            className={`h-full relative flex flex-col overflow-visible z-10 rounded-3xl ${
                                                plan.popular
                                                    ? "ring-2 ring-primary-500 shadow-honey"
                                                    : ""
                                            } ${
                                                activePromo
                                                    ? "ring-4 ring-primary-400 shadow-honey"
                                                    : ""
                                            }`}
                                        >
                                            {plan.popular && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                                                    <div className="bg-primary-500 text-white px-5 py-1.5 rounded-full text-sm font-medium flex items-center">
                                                        <Star className="w-4 h-4 mr-1" />
                                                        Most Popular
                                                    </div>
                                                </div>
                                            )}
                                            <CardHeader className="text-center pb-4">
                                                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                                    <Icon className="w-7 h-7 text-primary-500" />
                                                </div>
                                                <CardTitle className="text-lg">
                                                    {plan.name}
                                                </CardTitle>
                                                <div className="mt-5">
                                                    {activePromo ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-2xl font-bold text-charcoal-400 line-through">
                                                                    ${plan.price}
                                                                </span>
                                                                <span className="text-4xl font-black text-green-600">
                                                                    $
                                                                    {discountedPrice?.toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="bg-[#A8E6CF]/20 border-2 border-[#A8E6CF]/40 rounded-2xl px-4 py-2">
                                                                <div className="text-sm font-bold text-green-800">
                                                                    💰 You save $
                                                                    {savings?.toFixed(2)}
                                                                </div>
                                                                <div className="text-xs text-green-700 mt-1">
                                                                    Use code:{" "}
                                                                    <span className="font-mono font-bold">
                                                                        {
                                                                            activePromo.stripeCouponCode
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-4xl font-bold text-primary-500">
                                                            ${plan.price}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 flex-1 flex flex-col">
                                                <ul className="space-y-3 mb-8 flex-1">
                                                    {plan.features.map(
                                                        (feature, featureIndex) => (
                                                            <li
                                                                key={featureIndex}
                                                                className="flex items-start"
                                                            >
                                                                <Check className="w-4 h-4 text-[#A8E6CF] mr-2.5 mt-0.5 flex-shrink-0" />
                                                                <span className="text-charcoal-600 text-sm">
                                                                    {feature}
                                                                </span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                                {activePromo && (
                                                    <div className="mb-4 p-3.5 bg-primary-100/50 border-2 border-primary-300/40 rounded-2xl text-center shadow-soft">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Sparkles className="w-4 h-4 text-primary-600" />
                                                            <span className="text-sm text-charcoal-800 font-bold">
                                                                {
                                                                    activePromo.discountPercent
                                                                }
                                                                % OFF Applied at Checkout!
                                                            </span>
                                                            <Sparkles className="w-4 h-4 text-primary-600" />
                                                        </div>
                                                    </div>
                                                )}
                                                <Button
                                                    className="w-full mt-auto rounded-2xl"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handlePurchase(plan)}
                                                    disabled={!PURCHASING_ENABLED || authLoading || isPurchasing}
                                                >
                                                    {!PURCHASING_ENABLED ? (
                                                        "Coming Soon"
                                                    ) : isPurchasing ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        plan.cta
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Punch Cards (Weekly Passes) */}
                {weeklyPlans.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-16 overflow-visible"
                    >
                        <h3 className="text-2xl font-bold text-charcoal-800 mb-8 text-center">
                            10-Visit Punch Cards
                        </h3>
                        {activePromo && (
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-[#B4D7E8]/20 px-6 py-3 rounded-full border-2 border-[#B4D7E8]/50 shadow-soft">
                                    <Tag className="w-5 h-5 text-blue-700" />
                                    <span className="font-bold text-blue-900">
                                        Save with code {activePromo.stripeCouponCode}!
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto overflow-visible pt-20">
                            {weeklyPlans.map((plan) => {
                                const Icon = plan.icon;
                                const isPurchasing = purchasingPassId === plan.id;

                                return (
                                    <div key={plan.id} className="relative">
                                        <div className="absolute -top-4 -right-4 z-30">
                                            <div className="bg-[#B4D7E8] text-charcoal-800 px-4 py-2 rounded-full text-sm font-black shadow-soft transform rotate-12 border-2 border-white">
                                                <div className="flex items-center gap-1">
                                                    <Tag className="w-4 h-4" />
                                                    GREAT VALUE!
                                                </div>
                                            </div>
                                        </div>
                                        <Card className="h-full relative flex flex-col overflow-visible z-10 ring-4 ring-[#B4D7E8]/60 shadow-honey rounded-3xl">
                                            <CardHeader className="text-center pb-4">
                                                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                                    <Icon className="w-7 h-7 text-primary-500" />
                                                </div>
                                                <CardTitle className="text-lg">
                                                    {plan.name}
                                                </CardTitle>
                                                <div className="mt-5">
                                                    <div className="text-4xl font-bold text-primary-500">
                                                        ${plan.price}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 flex-1 flex flex-col">
                                                <ul className="space-y-3 mb-8 flex-1">
                                                    {plan.features.map(
                                                        (feature, featureIndex) => (
                                                            <li
                                                                key={featureIndex}
                                                                className="flex items-start"
                                                            >
                                                                <Check className="w-4 h-4 text-[#A8E6CF] mr-2.5 mt-0.5 flex-shrink-0" />
                                                                <span className="text-charcoal-600 text-sm">
                                                                    {feature}
                                                                </span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                                <Button
                                                    className="w-full mt-auto rounded-2xl"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handlePurchase(plan)}
                                                    disabled={!PURCHASING_ENABLED || authLoading || isPurchasing}
                                                >
                                                    {!PURCHASING_ENABLED ? (
                                                        "Coming Soon"
                                                    ) : isPurchasing ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        plan.cta
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* No passes available message */}
                {passes.length === 0 && !loadingPasses && (
                    <div className="text-center py-16">
                        <p className="text-charcoal-600">
                            No passes are currently available. Please check back later.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
