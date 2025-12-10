"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Check,
    Star,
    Users,
    Ticket,
    Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * NOTE: Promo banner functionality has been temporarily disabled.
 * To re-enable promos in the future, restore the PromoBanner component,
 * promo state management, and promo-related UI elements.
 * See git history for the original implementation.
 */

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
        price: 80,
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
        price: 115,
        description: "Best value for regular families",
        features: [
            "Unlimited visits for 1 child (ages 2+)",
            "Pays for itself after 7 visits!",
            "10% off 2nd child ($103.50)",
            "20% off 3rd child ($92)",
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto overflow-visible pt-8">
                        {pricingPlans.slice(2, 4).map((plan, index) => {
                            const Icon = plan.icon;

                            return (
                                <div key={index} className="relative">
                                    <Card
                                        className={`h-full relative flex flex-col overflow-visible z-10 ${
                                            plan.popular
                                                ? "ring-2 ring-primary-500 shadow-large"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto overflow-visible pt-8">
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
