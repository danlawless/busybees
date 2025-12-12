"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatPrice, fadeInUp, staggerContainer } from "@/lib/utils";
import {
    PromoSpecial,
    getActivePromo,
    getPromosFromStorage,
} from "@/lib/utils/promoHelpers";

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
            const end = new Date(endDate).getTime();
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
            className="mt-6 mx-auto max-w-4xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="relative bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="Dismiss banner"
                >
                    <X className="w-5 h-5 text-white" />
                </button>

                <div className="px-4 py-5 sm:px-6 sm:py-6">
                    {/* Header Text */}
                    <div className="text-center mb-4">
                        <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md mb-1">
                            Save {promo.discountPercent}% with code
                        </h3>
                        <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md tracking-tight">
                            {promo.stripeCouponCode}
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="flex justify-center items-center gap-2 sm:gap-3 mb-4">
                        <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 sm:px-4 sm:py-2 min-w-[60px] sm:min-w-[70px]">
                            <div className="text-xl sm:text-2xl font-black text-orange-600 leading-none">
                                {timeLeft.days}
                            </div>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-600 uppercase mt-1">
                                Days
                            </div>
                        </div>
                        <div className="text-white text-2xl font-black pb-3">:</div>
                        <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 sm:px-4 sm:py-2 min-w-[60px] sm:min-w-[70px]">
                            <div className="text-xl sm:text-2xl font-black text-orange-600 leading-none">
                                {String(timeLeft.hours).padStart(2, "0")}
                            </div>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-600 uppercase mt-1">
                                Hours
                            </div>
                        </div>
                    </div>

                    {/* Promo Code Box */}
                    <div className="flex items-center justify-center">
                        <div className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-lg">
                            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                            <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                USE CODE
                            </span>
                            <span className="font-mono font-bold text-base sm:text-lg text-orange-600">
                                {promo.stripeCouponCode}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="ml-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Copy promo code"
                            >
                                {copied ? (
                                    <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="flex justify-center mt-4">
                        <div className="bg-red-500 text-white px-6 py-2 rounded-full text-sm sm:text-base font-black shadow-lg transform -rotate-2">
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

const pricingPlans = [
    {
        name: "General Admission (Infants)",
        price: 7,
        description: "Special pricing for our littlest visitors",
        features: [
            "Access to infant-safe areas",
            "FREE with paid sibling admission",
            "Dedicated infant play space",
            "All-day access",
        ],
        popular: false,
        cta: "Buy Now",
        icon: Users,
        stripeLink: "https://buy.stripe.com/dRm00ibE75Vzfyt5kgffy0a",
    },
    {
        name: "General Admission (Ages 2+)",
        price: 17,
        description: "All day access for children ages 2+",
        features: [
            "All-day access to play areas",
            "Age-appropriate zones (2-6 years)",
            "Safe, clean environment",
            "No time limits",
        ],
        popular: false,
        cta: "Buy Now",
        icon: Ticket,
        stripeLink: "https://buy.stripe.com/9B6bJ023x3Nr1HDeUQffy0b",
    },
    {
        name: "Monthly Membership (Infant)",
        price: 70,
        description: "Unlimited visits for your littlest one",
        features: [
            "Unlimited visits for 1 infant",
            "Access to infant-safe areas",
            "Perfect for regular visitors",
            "Member exclusive events",
        ],
        popular: false,
        cta: "Subscribe Now",
        icon: Star,
        stripeLink: "https://buy.stripe.com/7sY5kC37B2Jn0Dz8wsffy06",
    },
    {
        name: "Monthly Membership (Toddler)",
        price: 100,
        description: "Best value for regular families",
        features: [
            "Unlimited visits for 1 child (ages 2+)",
            "Pays for itself after 6 visits!",
            "10% off 2nd child ($90)",
            "20% off 3rd child ($80)",
            "Member exclusive events",
        ],
        popular: true,
        cta: "Subscribe Now",
        icon: Star,
        stripeLink: "https://buy.stripe.com/6oU3cu8rV6ZDae93c8ffy07",
    },
    {
        name: "10-Visit Punch Card (Infant)",
        price: 50,
        description: "Convenient bulk visits",
        features: [
            "10 visits at $5 each",
            "Never expires",
            "Transferable to family/friends",
        ],
        popular: false,
        cta: "Purchase Now",
        icon: Ticket,
        stripeLink: "https://buy.stripe.com/9B6aEW8rVgAdcmh6okffy08",
    },
    {
        name: "10-Visit Punch Card (Toddler)",
        price: 150,
        description: "Convenient bulk visits",
        features: [
            "10 visits at $15 each",
            "Bulk purchase convenience",
            "Never expires",
            "Transferable to family/friends",
        ],
        popular: false,
        cta: "Purchase Now",
        icon: Ticket,
        stripeLink: "https://buy.stripe.com/14A00i0Ztes5bid3c8ffy09",
    },
];

export function Pricing() {
    const [activePromo, setActivePromo] = useState<PromoSpecial | null>(null);
    const [showBanner, setShowBanner] = useState(true);

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

    return (
        <section className="relative py-20 bg-neutral-50 overflow-visible">
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl mb-4">
                        Services & Pricing
                    </h2>
                    <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
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

                {/* General Admission */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
                        General Admission
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {pricingPlans.slice(0, 2).map((plan, index) => {
                            const Icon = plan.icon;
                            return (
                                <Card
                                    key={index}
                                    className="h-full relative flex flex-col"
                                >
                                    <CardHeader className="text-center pb-4">
                                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Icon className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <CardTitle className="text-lg">
                                            {plan.name}
                                        </CardTitle>
                                        <div className="mt-4">
                                            <div className="text-4xl font-bold text-primary-600">
                                                ${plan.price}
                                            </div>
                                        </div>
                                        <p className="text-neutral-600 mt-2 text-sm">
                                            {plan.description}
                                        </p>
                                    </CardHeader>
                                    <CardContent className="pt-0 flex-1 flex flex-col">
                                        <ul className="space-y-2 mb-6 flex-1">
                                            {plan.features.map(
                                                (feature, featureIndex) => (
                                                    <li
                                                        key={featureIndex}
                                                        className="flex items-start"
                                                    >
                                                        <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                                                        <span className="text-neutral-600 text-sm">
                                                            {feature}
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                        <Button
                                            className="w-full mt-auto"
                                            variant="primary"
                                            size="sm"
                                            onClick={() =>
                                                window.open(plan.stripeLink, "_blank")
                                            }
                                        >
                                            {plan.cta}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Monthly Memberships */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mb-12 overflow-visible"
                >
                    <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
                        Monthly Memberships
                    </h3>
                    {activePromo && (
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-full border-2 border-green-400 shadow-lg">
                                <TrendingDown className="w-5 h-5 text-green-700" />
                                <span className="font-bold text-green-900">
                                    Save $
                                    {calculateSavings(
                                        115,
                                        activePromo.discountPercent
                                    ).toFixed(0)}
                                    + on memberships!
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto overflow-visible pt-20">
                        {pricingPlans.slice(2, 4).map((plan, index) => {
                            const Icon = plan.icon;
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
                                <div key={index} className="relative">
                                    {activePromo && (
                                        <div className="absolute -top-4 -right-4 z-30">
                                            <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-black shadow-2xl transform rotate-12 border-2 border-white">
                                                <div className="flex items-center gap-1">
                                                    <Sparkles className="w-4 h-4" />
                                                    SAVE ${savings?.toFixed(0)}!
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <Card
                                        className={`h-full relative flex flex-col overflow-visible z-10 ${
                                            plan.popular
                                                ? "ring-2 ring-primary-500 shadow-large"
                                                : ""
                                        } ${
                                            activePromo
                                                ? "ring-4 ring-yellow-400 shadow-2xl"
                                                : ""
                                        }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                                                <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                                                    <Star className="w-4 h-4 mr-1" />
                                                    Most Popular
                                                </div>
                                            </div>
                                        )}
                                        <CardHeader className="text-center pb-4">
                                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Icon className="w-6 h-6 text-primary-600" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                {plan.name}
                                            </CardTitle>
                                            <div className="mt-4">
                                                {activePromo ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-2xl font-bold text-gray-400 line-through">
                                                                ${plan.price}
                                                            </span>
                                                            <span className="text-4xl font-black text-green-600">
                                                                $
                                                                {discountedPrice?.toFixed(
                                                                    2
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg px-4 py-2">
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
                                                    <div className="text-4xl font-bold text-primary-600">
                                                        ${plan.price}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-neutral-600 mt-2 text-sm">
                                                {plan.description}
                                            </p>
                                        </CardHeader>
                                        <CardContent className="pt-0 flex-1 flex flex-col">
                                            <ul className="space-y-2 mb-6 flex-1">
                                                {plan.features.map(
                                                    (feature, featureIndex) => (
                                                        <li
                                                            key={featureIndex}
                                                            className="flex items-start"
                                                        >
                                                            <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                                                            <span className="text-neutral-600 text-sm">
                                                                {feature}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                            {activePromo && (
                                                <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg text-center shadow-md">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-yellow-600" />
                                                        <span className="text-sm text-yellow-900 font-bold">
                                                            {
                                                                activePromo.discountPercent
                                                            }
                                                            % OFF Applied at Checkout!
                                                        </span>
                                                        <Sparkles className="w-4 h-4 text-yellow-600" />
                                                    </div>
                                                </div>
                                            )}
                                            <Button
                                                className="w-full mt-auto"
                                                variant="primary"
                                                size="sm"
                                                onClick={() =>
                                                    window.open(
                                                        plan.stripeLink,
                                                        "_blank"
                                                    )
                                                }
                                            >
                                                {plan.cta}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Punch Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-12 overflow-visible"
                >
                    <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
                        10-Visit Punch Cards
                    </h3>
                    {activePromo && (
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full border-2 border-purple-400 shadow-lg">
                                <Tag className="w-5 h-5 text-purple-700" />
                                <span className="font-bold text-purple-900">
                                    $20 OFF 10-Visit Passes!
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto overflow-visible pt-20">
                        {pricingPlans.slice(4, 6).map((plan, index) => {
                            const Icon = plan.icon;
                            // Calculate savings vs daily passes
                            const dailyPrice = plan.name.includes("Infant") ? 7 : 17;
                            const dailySavings = dailyPrice * 10 - plan.price;

                            return (
                                <div key={index} className="relative">
                                    <div className="absolute -top-4 -right-4 z-30">
                                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-black shadow-2xl transform rotate-12 border-2 border-white">
                                            <div className="flex items-center gap-1">
                                                <Tag className="w-4 h-4" />
                                                SAVE ${dailySavings}!
                                            </div>
                                        </div>
                                    </div>
                                    <Card className="h-full relative flex flex-col overflow-visible z-10 ring-4 ring-purple-400 shadow-2xl">
                                        <CardHeader className="text-center pb-4">
                                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Icon className="w-6 h-6 text-primary-600" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                {plan.name}
                                            </CardTitle>
                                            <div className="mt-4">
                                                <div className="text-4xl font-bold text-primary-600">
                                                    ${plan.price}
                                                </div>
                                            </div>
                                            <p className="text-neutral-600 mt-2 text-sm">
                                                {plan.description}
                                            </p>
                                        </CardHeader>
                                        <CardContent className="pt-0 flex-1 flex flex-col">
                                            <ul className="space-y-2 mb-6 flex-1">
                                                {plan.features.map(
                                                    (feature, featureIndex) => (
                                                        <li
                                                            key={featureIndex}
                                                            className="flex items-start"
                                                        >
                                                            <Check className="w-4 h-4 text-secondary-500 mr-2 mt-0.5 flex-shrink-0" />
                                                            <span className="text-neutral-600 text-sm">
                                                                {feature}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                            <Button
                                                className="w-full mt-auto"
                                                variant="primary"
                                                size="sm"
                                                onClick={() =>
                                                    window.open(
                                                        plan.stripeLink,
                                                        "_blank"
                                                    )
                                                }
                                            >
                                                {plan.cta}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
