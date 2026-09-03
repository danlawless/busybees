"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PartySchedulingModal } from "./PartySchedulingModal";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { AddPaymentMethodModal } from "./AddPaymentMethodModal";
import { WaiverModal } from "@/components/ui/WaiverModal";
import { AfterDarkWaiver, type WaiverFormData as AfterDarkWaiverFormData } from "@/components/customer/AfterDarkWaiver";
import { GroupChildrenManager } from "./GroupChildrenManager";
import { PunchCardCheckIn } from "@/components/pos/PunchCardCheckIn";
import { groupDayPassLines } from "@/lib/pos/punchAllocation";
import type { AllocationLine, PunchAllocation } from "@/lib/pos/punchAllocation";
import { formatCurrency } from "@/lib/utils/productHelpers";
import { validateAgeForProduct, hasAgeRestriction, getProductAgeGroup, getAgeGroup } from "@/lib/utils/ageUtils";
import { getNextClosingTime } from "@/lib/utils/timeUtils";
import { parseDateString } from "@/lib/utils";
import {
    MEMBERSHIP_DISCOUNT_PERCENT,
    applyMemberDiscount,
    hasActiveMembership,
} from "@/lib/membership";
import {
    PASS_KINDS,
    PASS_KIND_LABEL,
    groupQuoteByProduct,
    quotePasses,
    punchCardOptions,
    type PassKind,
    type PassQuote,
    type SelectablePass,
} from "@/lib/pos/passSelection";

interface SiblingDiscount {
    id: string;
    child_position: number;
    discount_percent: number;
    is_active: boolean;
    applies_to_monthly_only: boolean;
}

interface Child {
    id: string;
    name: string;
    birthdate: string;
    age: number; // Calculated from birthdate
    waiverSigned: boolean;
    waiverSignedDate?: string;
    createdAt: string;
}

interface Customer {
    id: string;
    phone: string;
    name: string;
    email?: string;
    children: Child[]; // Children registered to this customer
    purchases: Purchase[];
    activeSessions: Session[];
    savedCards: SavedCard[];
    giftCardBalance?: number; // Account credit from redeemed gift cards
    createdAt: string;
    lastVisit?: string;
    notes?: string | null; // Staff notes (allergies, pickup info, etc.)
}

interface Purchase {
    id: string;
    type:
        | "day_pass"
        | "weekly_pass"
        | "monthly_pass"
        | "party_package"
        | "food_beverage";
    name: string;
    price: number;
    purchaseDate: string;
    expiryDate?: string;
    firstUseDate?: string; // When the pass was first used
    actualExpiryDate?: string; // Calculated expiry from first use
    usedSessions: number;
    totalSessions: number;
    status: "active" | "expired" | "used";
    autoRenew?: boolean;
    nextRenewalDate?: string;
    childId?: string; // ID of the child this pass is for (required for passes, optional for party packages)
    childIds?: string[]; // For family passes: all children covered by this purchase
    passScope?: 'child' | 'account';
    // Party scheduling fields
    partyDate?: string;
    partyStartTime?: string;
    partyEndTime?: string;
    partyGuests?: number;
    partyNotes?: string;
}

interface Session {
    id: string;
    customerId: string;
    purchaseId: string;
    // Who actually played on this session. Set for account-scoped punch card
    // check-ins (one session per child); absent for the older single-child
    // pass path, where the purchase's own childId already says who it is.
    childId?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    autoCheckoutTime: string;
}

interface SavedCard {
    id: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

/** A purchase as the API returns it, in the database's snake_case. */
interface PurchaseRow {
    id: string;
    type: Purchase["type"];
    name: string;
    price: number;
    purchase_date?: string;
    created_at?: string;
    expiry_date?: string;
    first_use_date?: string;
    actual_expiry_date?: string;
    used_sessions: number;
    total_sessions: number;
    status: Purchase["status"];
    child_id?: string;
    pass_scope?: 'child' | 'account';
}

function toPurchase(row: PurchaseRow): Purchase {
    return {
        id: row.id,
        type: row.type,
        name: row.name,
        price: row.price,
        purchaseDate: row.purchase_date || row.created_at || "",
        expiryDate: row.expiry_date,
        firstUseDate: row.first_use_date,
        actualExpiryDate: row.actual_expiry_date,
        usedSessions: row.used_sessions,
        totalSessions: row.total_sessions,
        status: row.status,
        childId: row.child_id,
        passScope: row.pass_scope,
    };
}

interface CheckInProps {
    customers: Customer[];
    currentCustomer: Customer | null;
    isStaffMode: boolean;
    onUpdateCustomer: (customer: Customer) => void;
}

export function CheckIn({
    customers,
    currentCustomer,
    isStaffMode,
    onUpdateCustomer,
}: CheckInProps) {
    const [searchPhone, setSearchPhone] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmingPurchase, setConfirmingPurchase] = useState<Purchase | null>(null);
    const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string>("");
    const [confirmingProduct, setConfirmingProduct] = useState<string | null>(null);
    // Authoritative gift card credit for the on-screen customer. Fetched fresh so it
    // never depends on the (sometimes rebuilt) customers array carrying the field.
    const [headerGiftCardBalance, setHeaderGiftCardBalance] = useState<number | null>(null);
    // Staff notes for the on-screen customer, fetched fresh for the same reason
    // (the customers array is sometimes rebuilt without notes). Staff mode only.
    const [headerNotes, setHeaderNotes] = useState<string | null>(null);
    // Per-product coupon UI state (day-pass products only)
    const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});
    const [couponLoading, setCouponLoading] = useState<Record<string, boolean>>({});
    const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});
    const [appliedCoupons, setAppliedCoupons] = useState<Record<string, {
        code: string;
        name: string | null;
        discountType: 'amount' | 'percent';
        applied: number;
        forfeited: number;
    }>>({});
    const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
    const [confirmingCheckIn, setConfirmingCheckIn] = useState<string | null>(null);
    // The account punch card currently open in the "who's playing" picker,
    // by purchase id.
    const [punchCardCheckIn, setPunchCardCheckIn] = useState<string | null>(null);
    // Set once any day-pass purchase has actually succeeded for a punch-card
    // check-in but the check-in itself did not finish (the batch session
    // call failed, or a later day-pass group failed after an earlier one
    // went through). From this point on, that purchase id must never run the
    // purchase loop again -- only retry opening sessions against what was
    // already bought -- or the same passes get bought twice. Cleared only on
    // a successful check-in; a Cancel intentionally leaves it in place.
    const [pendingPunchCardRetry, setPendingPunchCardRetry] = useState<{
        purchaseId: string;
        entries: { purchase_id: string; child_id: string }[];
        boughtSummary: string;
    } | null>(null);
    const [checkInTimeout, setCheckInTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showPartyModal, setShowPartyModal] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Purchase | null>(null);
    const [showPartyScheduling, setShowPartyScheduling] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successDetails, setSuccessDetails] = useState<{
        title: string;
        message: string;
        details?: any;
    }>({
        title: "",
        message: "",
    });
    const [activeTab, setActiveTab] = useState<
        "children" | "passes" | "parties" | "snacks" | "afterdark"
    >("children");
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [cardholderName, setCardholderName] = useState("");
    const [saveCard, setSaveCard] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
    const [paymentSuccessDetails, setPaymentSuccessDetails] = useState({
        cardBrand: "",
        last4: "",
        saved: false,
    });
    const [showAutoRenewConfirm, setShowAutoRenewConfirm] = useState(false);
    const [confirmingAutoRenewFor, setConfirmingAutoRenewFor] = useState<string | null>(
        null
    );

    // Quantity state for purchases - defaulting to 0 to avoid NaN issues
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // POS mode state - kiosk (self-serve) or staff (staff-assisted)
    const [posMode, setPosMode] = useState<'kiosk' | 'staff'>('kiosk');

    // Auto-checkout settings state
    const [autoCheckoutSettings, setAutoCheckoutSettings] = useState({
        timezone: 'America/New_York',
        closingTime: '22:00',
    });

    // Children-related state
    const [selectedChildForPurchase, setSelectedChildForPurchase] =
        useState<string>("");
    const [comboChildId, setComboChildId] = useState<string | null>(null); // child 2+ for combo pass
    const [comboInfantId, setComboInfantId] = useState<string | null>(null); // infant under 2 for combo pass
    const [selectedChildrenForFamilyPass, setSelectedChildrenForFamilyPass] =
        useState<string[]>([]);
    // Child-first pass buying: pick who's playing, then the kind of pass.
    const [passChildIds, setPassChildIds] = useState<string[]>([]);
    const [passKind, setPassKind] = useState<PassKind>("day");
    // Punch card buying is account-scoped: one card is picked, not a child.
    const [selectedPunchCard, setSelectedPunchCard] = useState<SelectablePass | null>(null);
    const [buyingPasses, setBuyingPasses] = useState(false);
    const [passError, setPassError] = useState<string | null>(null);
    const [showAddChild, setShowAddChild] = useState(false);
    const [showWaiverModal, setShowWaiverModal] = useState(false);
    const [waiverChild, setWaiverChild] = useState<Child | null>(null);
    const [showViewWaiverModal, setShowViewWaiverModal] = useState(false);
    const [viewWaiverChildName, setViewWaiverChildName] = useState<string | undefined>(undefined);
    const [childName, setChildName] = useState("");
    const [childBirthdate, setChildBirthdate] = useState("");
    const [showChildSelectionModal, setShowChildSelectionModal] = useState(false);
    const [selectedProductForPurchase, setSelectedProductForPurchase] =
        useState<string>("");
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [isSigningWaiver, setIsSigningWaiver] = useState(false);
    const [isDeletingChild, setIsDeletingChild] = useState(false);

    // Load passes, parties, and products from localStorage
    const [availablePasses, setAvailablePasses] = useState<any[]>([]);
    const [availableParties, setAvailableParties] = useState<any[]>([]);
    const [availableSnacks, setAvailableSnacks] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);

    // Sibling discount configuration
    const [siblingDiscounts, setSiblingDiscounts] = useState<SiblingDiscount[]>([]);

    // Filter states
    const [passFilter, setPassFilter] = useState<"all" | "infant" | "toddler">("all");

    // Complimentary pass state (staff only)
    const [showComplimentaryModal, setShowComplimentaryModal] = useState(false);
    const [complimentaryChildId, setComplimentaryChildId] = useState<string>("");
    const [complimentaryPassId, setComplimentaryPassId] = useState<string>("");
    const [complimentaryReason, setComplimentaryReason] = useState<string>("");
    const [isIssuingComplimentary, setIsIssuingComplimentary] = useState(false);

    // After Dark POS booking state
    type AfterDarkAvailability = {
        date: string;
        maxKids: number;
        booked: number;
        remaining: number;
        isFull: boolean;
        movieTitle: string | null;
        movieRating: string | null;
    };
    type AfterDarkStep = "select" | "waiver";
    const [afterDarkEvents, setAfterDarkEvents] = useState<AfterDarkAvailability[]>([]);
    const [afterDarkLoading, setAfterDarkLoading] = useState(false);
    const [afterDarkError, setAfterDarkError] = useState<string | null>(null);
    const [afterDarkStep, setAfterDarkStep] = useState<AfterDarkStep>("select");
    const [afterDarkBookingDate, setAfterDarkBookingDate] = useState<string | null>(null);
    const [afterDarkSelectedChildren, setAfterDarkSelectedChildren] = useState<string[]>([]);
    const [afterDarkNotes, setAfterDarkNotes] = useState("");
    const [afterDarkSubmitting, setAfterDarkSubmitting] = useState(false);

    // Group children manager state (for group rate bookings)
    const [showGroupChildrenManager, setShowGroupChildrenManager] = useState(false);
    const [groupRateGuestCount, setGroupRateGuestCount] = useState(10);
    const [groupRateProductId, setGroupRateProductId] = useState<string | null>(null);
    const [groupRateTotalPrice, setGroupRateTotalPrice] = useState<number | null>(null);
    const [pendingGroupChildren, setPendingGroupChildren] = useState<Array<{
        id: string;
        name: string;
        birthdate: string;
        waiver_signed: boolean;
        customer_id: string;
        parent_name: string;
        is_new_child: boolean;
    }>>([]);

    // Fetch POS mode on mount
    useEffect(() => {
        const fetchPosMode = async () => {
            try {
                const response = await fetch('/api/settings/pos-mode');
                if (response.ok) {
                    const data = await response.json();
                    setPosMode(data.mode || 'kiosk');
                }
            } catch (error) {
                console.error('Error fetching POS mode:', error);
                // Default to kiosk mode on error
                setPosMode('kiosk');
            }
        };
        fetchPosMode();
    }, []);

    // Fetch the on-screen customer's gift card credit authoritatively (staff may read
    // any customer's balance). Re-runs when the selected customer changes or after a
    // purchase, so the header badge always reflects the true current balance.
    const activeCustomerId = isStaffMode
        ? selectedCustomer?.id
        : currentCustomer?.id || selectedCustomer?.id;
    useEffect(() => {
        if (!activeCustomerId) {
            setHeaderGiftCardBalance(null);
            return;
        }
        let cancelled = false;
        fetch(`/api/gift-cards/balance?customerId=${activeCustomerId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!cancelled && d) setHeaderGiftCardBalance(d.balance ?? 0);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [activeCustomerId, purchaseSuccess]);

    // Fetch staff notes fresh for the header. The endpoint is staff/admin-only,
    // so notes only come back when the POS device is running a staff session —
    // a customer's own session gets 403 and sees nothing. That keeps these
    // internal flags private while still showing them to front-desk staff on
    // both the staff-search and phone-lookup (currentCustomer) flows.
    useEffect(() => {
        if (!activeCustomerId) {
            setHeaderNotes(null);
            return;
        }
        let cancelled = false;
        fetch(`/api/pos/customer-notes?customerId=${activeCustomerId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!cancelled) setHeaderNotes(d?.notes ?? null);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [activeCustomerId]);

    // Fetch auto-checkout settings on mount
    useEffect(() => {
        const fetchAutoCheckoutSettings = async () => {
            try {
                const response = await fetch('/api/settings/auto-checkout');
                if (response.ok) {
                    const data = await response.json();
                    setAutoCheckoutSettings({
                        timezone: data.timezone || 'America/New_York',
                        closingTime: data.closingTime || '22:00',
                    });
                }
            } catch (error) {
                console.error('Error fetching auto-checkout settings:', error);
            }
        };
        fetchAutoCheckoutSettings();
    }, []);

    // Fetch passes, parties, and snacks from database API
    useEffect(() => {
        const loadProducts = async () => {
            setIsLoadingProducts(true);
            try {
                // Fetch passes, parties, products, and sibling discounts from API in parallel
                const [passesResponse, partiesResponse, productsResponse, discountsResponse] = await Promise.all([
                    fetch('/api/passes'),
                    fetch('/api/parties'),
                    fetch('/api/products'),
                    fetch('/api/sibling-discounts'),
                ]);

                // Process sibling discounts
                if (discountsResponse.ok) {
                    const discounts = await discountsResponse.json();
                    setSiblingDiscounts(discounts || []);
                }

                // Process passes from API
                let formattedPasses: any[] = [];
                if (passesResponse.ok) {
                    const { passes } = await passesResponse.json();
                    formattedPasses = (passes || []).map((pass: any) => ({
                        id: pass.id,
                        name: pass.name,
                        price: pass.price,
                        description: pass.description,
                        sessions: pass.sessions_included || pass.sessionsIncluded || 1,
                        category: pass.category, // day, weekly, monthly
                        validity:
                            pass.category === "day"
                                ? `${pass.duration} hours`
                                : `${pass.duration} days`,
                    }));
                }

                // Process parties from API
                let formattedParties: any[] = [];
                if (partiesResponse.ok) {
                    const { parties } = await partiesResponse.json();
                    formattedParties = (parties || []).map((party: any) => ({
                        id: party.id,
                        name: party.name,
                        price: party.base_price || party.basePrice,
                        description: party.description
                            ? `${party.description} (${party.capacity} kids, ${party.duration} hours)`
                            : `Party package for up to ${party.capacity} kids, ${party.duration} hours`,
                        sessions: 1,
                        validity: "90 days to book",
                        capacity: party.capacity,
                        duration: party.duration,
                        includedItems: party.included_items || party.includedItems,
                        addOns: party.add_ons || party.addOns,
                    }));
                }

                // Process products (snacks) from API
                let formattedSnacks: any[] = [];
                if (productsResponse.ok) {
                    const { products } = await productsResponse.json();
                    formattedSnacks = (products || []).map((product: any) => ({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        description: product.description,
                        emoji:
                            product.category === "food"
                                ? "🍎"
                                : product.category === "beverage"
                                ? "🥤"
                                : "🛍️",
                        quantityOnHand: product.quantity_on_hand ?? null,
                        lowStockThreshold: product.low_stock_threshold ?? 5,
                    }));
                }

                setAvailablePasses(formattedPasses);
                setAvailableParties(formattedParties);
                setAvailableSnacks(formattedSnacks);

                // Initialize quantities for all products at 0
                const initialQuantities: Record<string, number> = {};
                [...formattedPasses, ...formattedParties, ...formattedSnacks].forEach(
                    (product) => {
                        initialQuantities[product.id] = 0;
                    }
                );
                setQuantities(initialQuantities);
            } catch (error) {
                console.error("Error loading products from API:", error);
                // Set empty arrays on error so UI doesn't break
                setAvailablePasses([]);
                setAvailableParties([]);
                setAvailableSnacks([]);
            } finally {
                setIsLoadingProducts(false);
            }
        };

        loadProducts();

        // No need for storage change listener - products come from API now
        const handleStorageChange = (e: StorageEvent) => {
            // Only reload for admin panel updates (if localStorage is used for sync)
            if (
                e.key?.includes("busybees_passes") ||
                e.key?.includes("busybees_parties") ||
                e.key?.includes("busybees_products")
            ) {
                loadProducts();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Helper function to get child name by ID
    const getChildName = (childId: string, customer: Customer): string => {
        const child = customer.children.find((c) => c.id === childId);
        return child ? child.name : "Unknown Child";
    };

    // Helper function to calculate age from birthdate
    const calculateAge = (birthdate: string): number => {
        const today = new Date();
        // Use parseDateString to handle YYYY-MM-DD format correctly in all timezones
        const birth = parseDateString(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    };

    // Children management functions
    const handleAddChild = async () => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer || !childName.trim() || !childBirthdate) return;

        setIsAddingChild(true);

        try {
            const response = await fetch("/api/children", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    name: childName.trim(),
                    birthdate: childBirthdate,
                    waiver_signed: false,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to add child");
            }

            const newChild = await response.json();

            // Convert API child format to component Child format
            const childToAdd: Child = {
                id: newChild.id,
                name: newChild.name,
                birthdate: newChild.birthdate,
                age: calculateAge(newChild.birthdate),
                waiverSigned: newChild.waiver_signed,
                waiverSignedDate: newChild.waiver_signed_date,
                createdAt: newChild.created_at,
            };

            // Update customer with the new child
            const updatedCustomer = {
                ...customer,
                children: [...customer.children, childToAdd],
            };

            // Reset form
            setChildName("");
            setChildBirthdate("");
            setShowAddChild(false);

            // Show success message for adding the child
            setSuccessDetails({
                title: "Child Added Successfully!",
                message: `${childName.trim()} has been added to the customer's account. Next, you'll need to sign a waiver for them to purchase passes.`,
            });
            setShowSuccessModal(true);

            // After success modal closes, show waiver modal
            setTimeout(() => {
                setWaiverChild(childToAdd);
                setShowWaiverModal(true);
            }, 5000); // Wait for success modal auto-close

            // Trigger refresh via parent component with updated customer
            onUpdateCustomer(updatedCustomer);
        } catch (error) {
            console.error("Error adding child:", error);
            setSuccessDetails({
                title: "Error Adding Child",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to add child. Please try again.",
            });
            setShowSuccessModal(true);
        } finally {
            setIsAddingChild(false);
        }
    };

    const handleSignWaiver = async (child: Child) => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        setIsSigningWaiver(true);

        try {
            const response = await fetch(`/api/children/${child.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sign_waiver: true,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to sign waiver");
            }

            const updatedChildData = await response.json();

            // Update the child in the customer's children array
            const updatedCustomer = {
                ...customer,
                children: customer.children.map((c) =>
                    c.id === child.id
                        ? {
                              ...c,
                              waiverSigned: updatedChildData.waiver_signed,
                              waiverSignedDate: updatedChildData.waiver_signed_date,
                          }
                        : c
                ),
            };

            setShowWaiverModal(false);
            setWaiverChild(null);

            setSuccessDetails({
                title: "Waiver Signed Successfully",
                message: `Waiver has been signed for ${child.name}. They can now purchase passes and play!`,
            });
            setShowSuccessModal(true);

            // Trigger refresh via parent component with updated customer
            onUpdateCustomer(updatedCustomer);
        } catch (error) {
            console.error("Error signing waiver:", error);
            setSuccessDetails({
                title: "Error Signing Waiver",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to sign waiver. Please try again.",
            });
            setShowSuccessModal(true);
        } finally {
            setIsSigningWaiver(false);
        }
    };

    const handleDeleteChild = async (childId: string) => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        // Check if child has any active passes
        const hasActivePasses = customer.purchases.some(
            (p) => p.childId === childId && p.status === "active"
        );

        if (hasActivePasses) {
            setSuccessDetails({
                title: "Cannot Delete Child",
                message:
                    "This child has active passes. Please wait for passes to expire or contact management.",
            });
            setShowSuccessModal(true);
            return;
        }

        setIsDeletingChild(true);

        try {
            const response = await fetch(`/api/children/${childId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete child");
            }

            // Remove the child from the customer's children array
            const updatedCustomer = {
                ...customer,
                children: customer.children.filter((c) => c.id !== childId),
            };

            setSuccessDetails({
                title: "Child Deleted",
                message: "Child has been removed from the account.",
            });
            setShowSuccessModal(true);

            // Trigger refresh via parent component with updated customer
            onUpdateCustomer(updatedCustomer);
        } catch (error) {
            console.error("Error deleting child:", error);
            setSuccessDetails({
                title: "Error Deleting Child",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete child. Please try again.",
            });
            setShowSuccessModal(true);
        } finally {
            setIsDeletingChild(false);
        }
    };

    const handleChildSelectionForPurchase = (childId: string) => {
        // Validate age against the product the user is buying BEFORE proceeding,
        // so an ineligible pick is rejected at selection time (not at the
        // confirm-tap step where bad state can sneak through).
        const customer = selectedCustomer || currentCustomer;
        const product = [...AVAILABLE_PASS_PRODUCTS, ...AVAILABLE_PARTY_PRODUCTS].find(
            (p) => p.id === selectedProductForPurchase,
        );
        const child = customer?.children.find((c) => c.id === childId);

        if (product && child && hasAgeRestriction(product.name)) {
            const ageValidation = validateAgeForProduct(child.age, product.name);
            if (!ageValidation.valid) {
                setSuccessDetails({
                    title: "Age Restriction",
                    message:
                        ageValidation.error ||
                        `${child.name} is age ${child.age} and isn't eligible for "${product.name}".`,
                });
                setShowSuccessModal(true);
                return;
            }
        }

        setSelectedChildForPurchase(childId);
        setShowChildSelectionModal(false);

        // Now proceed with the purchase using the selected child
        if (selectedProductForPurchase) {
            handleQuickPurchase(selectedProductForPurchase);
        }
    };

    const toggleChildForFamilyPass = (childId: string) => {
        setSelectedChildrenForFamilyPass((prev) =>
            prev.includes(childId)
                ? prev.filter((id) => id !== childId)
                : [...prev, childId]
        );
    };

    const handleFamilyPassChildrenConfirm = () => {
        if (selectedChildrenForFamilyPass.length === 0) return;
        // Use the first child as the "primary" for the purchase record's child_id
        setSelectedChildForPurchase(selectedChildrenForFamilyPass[0]);
        setShowChildSelectionModal(false);

        if (selectedProductForPurchase) {
            handleQuickPurchase(selectedProductForPurchase);
        }
    };

    // Handle escape key for modals
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (showAddChild) {
                    setShowAddChild(false);
                    setChildName("");
                    setChildBirthdate("");
                } else if (showWaiverModal) {
                    setShowWaiverModal(false);
                    setWaiverChild(null);
                } else if (showChildSelectionModal) {
                    setShowChildSelectionModal(false);
                    setSelectedProductForPurchase("");
                }
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [showAddChild, showWaiverModal, showChildSelectionModal]);

    // Quantity management functions
    const increaseQuantity = (productId: string) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: Math.min((prev[productId] || 0) + 1, 10), // Max 10 items, default to 0 if undefined
        }));
    };

    const decreaseQuantity = (productId: string) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: Math.max((prev[productId] || 0) - 1, 0), // Min 0 items, default to 0 if undefined
        }));
    };

    // Customer on screen (selected via staff search, or the logged-in customer).
    // Resolved here rather than at render time because the pricing helpers below
    // need to know whether this customer holds a membership.
    const displayCustomer = isStaffMode
        ? selectedCustomer
        : currentCustomer || selectedCustomer;

    // Active monthly pass holders get member pricing automatically. Derived from
    // the purchases already loaded for this customer, so it costs no extra
    // request and can't fall out of step with what's on screen.
    const isActiveMember = hasActiveMembership(displayCustomer?.purchases);

    /**
     * Whether member-only sibling pricing applies to this transaction.
     *
     * Sibling discounts are priced per child, so they only ever apply to pass
     * purchases — never to snacks or retail, which get the flat member discount
     * server-side instead.
     *
     * Two ways to qualify: the customer already holds an active membership, or
     * they're buying monthly passes right now (so a parent signing up two
     * children still gets the sibling rate on the spot).
     */
    const qualifiesForMemberPricing = (
        purchaseType: string | undefined,
        isPassPurchase: boolean
    ) => isPassPurchase && (isActiveMember || purchaseType === "monthly_pass");

    // --- Child-first pass buying -------------------------------------------
    // Staff (or the customer) picks which children are playing; the product and
    // rate for each one are derived from their age, and siblings are priced by
    // the configured discount ladder.

    const passChildren = (displayCustomer?.children ?? []).filter((c) =>
        passChildIds.includes(c.id)
    );

    // Punch cards are account-scoped from 1 October 2026 — there is no child to
    // price them against, so the per-child quote does not apply to them.
    const passQuote: PassQuote =
        passKind === "punch"
            ? { lines: [], unresolved: [], total: 0, savings: 0, productCount: 0 }
            : quotePasses(
                  passChildren,
                  passKind,
                  availablePasses,
                  siblingDiscounts,
                  qualifiesForMemberPricing(
                      passKind === "monthly" ? "monthly_pass" : "day_pass",
                      true
                  )
              );

    const togglePassChild = (childId: string) => {
        setPassError(null);
        setPassChildIds((prev) =>
            prev.includes(childId)
                ? prev.filter((id) => id !== childId)
                : [...prev, childId]
        );
    };

    /**
     * Buy the quoted passes.
     *
     * Day passes for siblings share one payment and record a row per child, so
     * each child's pass is tracked at its own rate. Monthly passes are bought
     * per child at full price, so each is its own purchase. Punch cards have no
     * child to price against at all — they belong to the account — and are
     * handled by their own early branch below.
     */
    const handleBuyPasses = async () => {
        const customer = displayCustomer;

        // A punch card belongs to the account, so there is no child to pick and
        // no per-child quote to build — one card, one row.
        if (passKind === "punch") {
            if (!customer) return;
            if (!selectedPunchCard) {
                setPassError("Choose a punch card.");
                return;
            }

            setBuyingPasses(true);
            setPassError(null);

            try {
                const response = await fetch("/api/purchases/pos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customer.id,
                        product_id: selectedPunchCard.id,
                        product_name: selectedPunchCard.name,
                        product_price: selectedPunchCard.price,
                        product_description: "",
                        purchase_type: "weekly_pass",
                        child_id: null,
                        pass_scope: "account",
                        quantity: 1,
                        metadata: {},
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Purchase failed");
                }

                setSuccessDetails({
                    title: "Punch Card Purchased ✅",
                    message: `${selectedPunchCard.name} — any child on the account can use it.`,
                    details: `💰 ${formatCurrency(selectedPunchCard.price)}`,
                });
                setShowSuccessModal(true);
                setSelectedPunchCard(null);

                // Refresh the customer so the new card shows immediately
                const purchasesResponse = await fetch(
                    `/api/purchases?customer_id=${customer.id}`
                );
                if (purchasesResponse.ok) {
                    const { purchases: purchasesData } = (await purchasesResponse.json()) as {
                        purchases: PurchaseRow[] | null;
                    };
                    onUpdateCustomer({
                        ...customer,
                        purchases: (purchasesData || []).map(toPurchase),
                    });
                }
            } catch (error) {
                setPassError(
                    error instanceof Error ? error.message : "Purchase failed. Please try again."
                );
            } finally {
                setBuyingPasses(false);
            }
            return;
        }

        if (!customer || passQuote.lines.length === 0) return;

        const missingWaiver = passQuote.lines.find((l) => !l.child.waiverSigned);
        if (missingWaiver) {
            setPassError(
                `${missingWaiver.child.name} needs a signed waiver before buying a pass.`
            );
            return;
        }

        setBuyingPasses(true);
        setPassError(null);

        try {
            // Day passes group onto one payment per product; punch cards and
            // monthly passes stay one purchase per child.
            const groups =
                passKind === "day"
                    ? groupQuoteByProduct(passQuote)
                    : passQuote.lines.map((line) => ({
                          pass: line.pass,
                          lines: [line],
                          total: line.price,
                          isCombo: false,
                      }));

            for (const group of groups) {
                const childIds = group.lines.map((l) => l.child.id);
                // The combo product already has its own handling server-side —
                // one payment, a row per child. Everything else uses the
                // per-child split with the exact prices we quoted.
                const useSplit = passKind === "day" && !group.isCombo;

                const response = await fetch("/api/purchases/pos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customer.id,
                        product_id: group.pass.id,
                        product_name: group.pass.name,
                        product_price: group.total,
                        product_description: "",
                        // Punch cards return above before this point — only
                        // day and monthly passes are ever bought per child here.
                        purchase_type:
                            passKind === "monthly" ? "monthly_pass" : "day_pass",
                        child_id: childIds[0],
                        children_ids: childIds,
                        split_per_child: useSplit,
                        child_prices: useSplit
                            ? group.lines.map((l) => l.price)
                            : undefined,
                        quantity: 1,
                        metadata: {},
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Purchase failed");
                }
            }

            const names = passQuote.lines.map((l) => l.child.name).join(", ");
            setSuccessDetails({
                title: "Passes Purchased ✅",
                message: `${PASS_KIND_LABEL[passKind]} for ${names}.`,
                details: `💰 ${formatCurrency(passQuote.total)}${
                    passQuote.savings > 0
                        ? `\n🎉 Sibling discount saved ${formatCurrency(passQuote.savings)}`
                        : ""
                }`,
            });
            setShowSuccessModal(true);
            setPassChildIds([]);

            // Refresh the customer so the new passes show immediately
            const purchasesResponse = await fetch(
                `/api/purchases?customer_id=${customer.id}`
            );
            if (purchasesResponse.ok) {
                const { purchases: purchasesData } = (await purchasesResponse.json()) as {
                    purchases: PurchaseRow[] | null;
                };
                onUpdateCustomer({
                    ...customer,
                    purchases: (purchasesData || []).map(toPurchase),
                });
            }
        } catch (error) {
            setPassError(
                error instanceof Error ? error.message : "Purchase failed. Please try again."
            );
        } finally {
            setBuyingPasses(false);
        }
    };

    // Get pricing breakdown for display
    // Only shows sibling discounts for monthly memberships
    const getPricingBreakdown = (
        basePrice: number,
        quantity: number,
        isMonthlyMembership: boolean = false
    ) => {
        // Handle 0 or undefined quantities
        const validQuantity = quantity || 0;

        if (validQuantity <= 0) {
            return {
                total: 0,
                breakdown: '$0.00',
                savings: 0,
                discountDetails: [],
                hasDiscount: false,
            };
        }

        if (validQuantity === 1) {
            return {
                total: basePrice,
                breakdown: `$${basePrice.toFixed(2)}`,
                savings: 0,
                discountDetails: [{ position: 1, discount: 0, price: basePrice }],
                hasDiscount: false,
            };
        }

        // Build discount map for quick lookup
        const discountMap = new Map<number, number>();
        for (const d of siblingDiscounts) {
            // Only apply if active and either it's a monthly membership or it's not restricted to monthly only
            if (d.is_active && (isMonthlyMembership || !d.applies_to_monthly_only)) {
                discountMap.set(d.child_position, d.discount_percent);
            }
        }

        let total = 0;
        const details: Array<{ position: number; discount: number; price: number }> = [];

        for (let position = 1; position <= validQuantity; position++) {
            const discountPercent = discountMap.get(position) || 0;
            const price = basePrice * (1 - discountPercent / 100);
            total += price;
            details.push({ position, discount: discountPercent, price });
        }

        const regularTotal = basePrice * validQuantity;
        const savings = regularTotal - total;

        // Build breakdown string
        const breakdownParts = details.map((d) => {
            if (d.discount > 0) {
                return `$${d.price.toFixed(2)} (${d.discount}% off)`;
            }
            return `$${d.price.toFixed(2)}`;
        });

        return {
            total,
            breakdown: breakdownParts.join(' + '),
            savings,
            discountDetails: details,
            hasDiscount: savings > 0,
        };
    };

    // Reset all quantities to 1 after purchase
    const resetAllQuantities = () => {
        setQuantities({
            day_pass: 1,
            weekly_pass: 1,
            monthly_pass: 1,
            party_package: 1,
            apple_sauce_pouches: 1,
            veggie_sticks: 1,
            pirates_booty: 1,
            goldfish: 1,
            granola_bars: 1,
        });
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (confirmTimeout) {
                clearTimeout(confirmTimeout);
            }
            if (checkInTimeout) {
                clearTimeout(checkInTimeout);
            }
        };
    }, [confirmTimeout, checkInTimeout]);

    // Filter and sort passes based on selected filter
    const getFilteredPasses = () => {
        let filtered = [...availablePasses];

        // Apply filter
        if (passFilter === "infant") {
            filtered = filtered.filter((pass) =>
                pass.name.toLowerCase().includes("infant")
            );
        } else if (passFilter === "toddler") {
            filtered = filtered.filter((pass) =>
                pass.name.toLowerCase().includes("toddler")
            );
        }

        // Sort by price (lowest to highest)
        return filtered.sort((a, b) => a.price - b.price);
    };

    // Party packages are no longer sold from the POS — parties are booked
    // through the website. The catalogue is still needed so the POS can
    // recognise a package a customer already owns and schedule it.
    const AVAILABLE_PASS_PRODUCTS = getFilteredPasses();
    const AVAILABLE_PARTY_PRODUCTS = [...availableParties].sort(
        (a, b) => a.price - b.price
    );
    const AVAILABLE_SNACKS = [...availableSnacks].sort((a, b) => a.price - b.price); // Sort snacks by price too

    const formatPhoneNumber = (value: string) => {
        const phoneNumber = value.replace(/[^\d]/g, "");

        if (phoneNumber.length <= 3) {
            return phoneNumber;
        } else if (phoneNumber.length <= 6) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        } else {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
                3,
                6
            )}-${phoneNumber.slice(6, 10)}`;
        }
    };

    const getCleanPhoneNumber = (phone: string) => {
        return phone.replace(/[^\d]/g, "");
    };

    // Helper to detect family passes by product name
    const isFamilyPass = (productName: string): boolean => {
        const lowerName = productName.toLowerCase();
        return lowerName.includes('family');
    };

    const isChildInfantComboPass = (productName: string): boolean => {
        const lowerName = productName.toLowerCase();
        return (lowerName.includes('child') || lowerName.includes('toddler')) && lowerName.includes('infant');
    };

    const handlePhoneSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setSearchPhone(formatted);

        if (formatted.replace(/[^\d]/g, "").length === 10) {
            const cleanPhone = getCleanPhoneNumber(formatted);
            const foundCustomer = customers.find(
                (c) => getCleanPhoneNumber(c.phone) === cleanPhone
            );
            setSelectedCustomer(foundCustomer || null);
        } else {
            setSelectedCustomer(null);
        }
    };

    const calculateActualExpiry = (
        type: Purchase["type"],
        firstUseDate: string,
        totalSessions: number = 1
    ): string => {
        const firstUse = new Date(firstUseDate);

        switch (type) {
            case "day_pass":
                if (totalSessions > 1) {
                    // Multi-visit punch card: 365 days from first use
                    return new Date(firstUse.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
                }
                // Single day pass: 12 hours after first use
                return new Date(firstUse.getTime() + 12 * 60 * 60 * 1000).toISOString();
            case "weekly_pass":
                // Expires 7 days after first use
                return new Date(
                    firstUse.getTime() + 7 * 24 * 60 * 60 * 1000
                ).toISOString();
            case "monthly_pass":
                // Expires 30 days after first use
                return new Date(
                    firstUse.getTime() + 30 * 24 * 60 * 60 * 1000
                ).toISOString();
            case "party_package":
                // Party packages are single use, expire immediately
                return firstUseDate;
            default:
                return new Date(firstUse.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
    };

    /**
     * Confirm a punch card check-in.
     *
     * Day passes are bought first: a declined card must never leave children
     * checked in. Then every child goes in on one batch insert, so a family
     * either all gets in or none does.
     *
     * The picker's `remaining` comes from the client's stale `usedSessions`,
     * so the batch call below can fail on capacity *after* the day passes
     * above have already been paid for -- another till may have drawn the
     * card down in between. Once any day-pass purchase has actually
     * succeeded for this purchase id, this must never run the purchase loop
     * again: a retry only reopens sessions against what was already bought.
     * That lockout (`pendingPunchCardRetry`) is cleared solely by a
     * successful check-in -- Cancel deliberately leaves it in place, since
     * forgetting it would let the next Confirm buy the same passes twice.
     */
    const handlePunchCardConfirm = async (
        customer: Customer,
        purchaseId: string,
        allocation: PunchAllocation
    ) => {
        const autoCheckoutTime = getNextClosingTime(
            autoCheckoutSettings.timezone,
            autoCheckoutSettings.closingTime
        );

        const retrying = pendingPunchCardRetry?.purchaseId === purchaseId;
        let entries: { purchase_id: string; child_id: string }[];
        // Set once day passes are known to have been bought -- either just
        // now, or by an earlier attempt this retry is resuming.
        let boughtSummary: string | null = retrying ? pendingPunchCardRetry!.boughtSummary : null;

        // Money has moved for these lines: build the message that both locks
        // out re-buying and tells staff plainly what already happened.
        const describePurchased = (lines: readonly AllocationLine[]): string => {
            const names = lines.map((l) => l.child.name).join(", ");
            const total = formatCurrency(lines.reduce((sum, l) => sum + l.price, 0));
            return `Day passes were already purchased for ${names} (${total}). Press Confirm again to finish checking them in — do not buy passes again. If it keeps failing, check them in individually from Available Passes below.`;
        };

        if (retrying) {
            entries = pendingPunchCardRetry!.entries;
        } else {
            entries = allocation.lines
                .filter((l) => l.method === "punch")
                .map((l) => ({ purchase_id: purchaseId, child_id: l.child.id }));

            // Lines whose day pass actually got bought this call, so a
            // failure -- here or later, opening sessions -- can say exactly
            // what already happened and this purchase id can be locked out
            // of ever running the purchase loop again.
            const purchasedLines: AllocationLine[] = [];

            try {
                // Different ages can resolve to different day-pass products in
                // the same shortfall -- the under-1 rate is its own product --
                // so this buys one purchase per product, never one purchase
                // for the whole shortfall labeled under the first child's
                // product. See groupDayPassLines for why keying by pass.id
                // (rather than quotePasses' own groupId, the way
                // groupQuoteByProduct does for a direct purchase) is safe here.
                const groups = groupDayPassLines(allocation.lines);
                for (const { pass, lines, total } of groups) {
                    const response = await fetch("/api/purchases/pos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            customer_id: customer.id,
                            product_id: pass.id,
                            product_name: pass.name,
                            product_price: total,
                            product_description: "",
                            purchase_type: "day_pass",
                            child_id: lines[0].child.id,
                            children_ids: lines.map((l) => l.child.id),
                            split_per_child: true,
                            child_prices: lines.map((l) => l.price),
                            quantity: 1,
                            metadata: {},
                        }),
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Purchase failed");
                    }
                    const { purchases: created } = (await response.json()) as {
                        purchases: { id: string; child_id: string | null }[];
                    };
                    for (const line of lines) {
                        const match = created.find((p) => p.child_id === line.child.id);
                        if (!match) throw new Error(`No purchase returned for ${line.child.name}`);
                        entries.push({ purchase_id: match.id, child_id: line.child.id });
                    }
                    purchasedLines.push(...lines);
                }
            } catch (error) {
                console.error("Punch card day-pass purchase failed:", error);
                if (purchasedLines.length > 0) {
                    // Some money already moved. This purchase id is locked out
                    // of the purchase loop from here on -- a second press may
                    // only retry opening sessions against what was bought.
                    boughtSummary = describePurchased(purchasedLines);
                    setPendingPunchCardRetry({ purchaseId, entries, boughtSummary });
                    alert(`${boughtSummary}\n\n(Buying the rest failed: ${
                        error instanceof Error ? error.message : "unknown error"
                    })`);
                } else {
                    // Nothing was charged yet, so a plain retry is safe.
                    alert(error instanceof Error ? error.message : "Purchase failed");
                }
                return;
            }

            if (purchasedLines.length > 0) {
                // Every group that needed buying succeeded. This purchase id
                // is locked out of the purchase loop from here on even
                // though nothing has failed yet -- if opening sessions fails
                // next, it must not be allowed to buy these again.
                boughtSummary = describePurchased(purchasedLines);
            }
        }

        try {
            const sessionsResponse = await fetch("/api/sessions/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    auto_checkout_time: autoCheckoutTime,
                    entries,
                }),
            });
            if (!sessionsResponse.ok) {
                const errorData = await sessionsResponse.json();
                throw new Error(errorData.error || "Check-in failed");
            }
            const { sessions: createdSessions } = (await sessionsResponse.json()) as {
                sessions: {
                    id: string;
                    customer_id: string;
                    purchase_id: string;
                    child_id: string | null;
                    start_time: string;
                    auto_checkout_time: string;
                }[];
            };
            const newSessions: Session[] = createdSessions.map((s) => ({
                id: s.id,
                customerId: s.customer_id,
                purchaseId: s.purchase_id,
                childId: s.child_id ?? undefined,
                startTime: s.start_time,
                autoCheckoutTime: s.auto_checkout_time,
            }));

            // The check-in itself has succeeded from here down: the sessions
            // exist in the database and every day pass this attempt bought is
            // spent. Nothing past this point may re-arm the retry lock or
            // tell staff to press Confirm again -- a replay would only be
            // rejected by checkBatchCapacity (these purchases are now used
            // up), leaving this card stuck locked forever for no reason.
            setPunchCardCheckIn(null);
            setPendingPunchCardRetry(null);

            // Refresh the customer's purchases so the card's reduced balance
            // and any new day passes show immediately. Best-effort, and
            // deliberately its own try/catch: a failure here is a stale
            // screen, not a failed check-in, and must not be read as one by
            // the outer catch below (which exists to handle check-in itself
            // failing, not a follow-up refresh).
            try {
                const purchasesResponse = await fetch(
                    `/api/purchases?customer_id=${customer.id}`
                );
                if (purchasesResponse.ok) {
                    const { purchases: purchasesData } = (await purchasesResponse.json()) as {
                        purchases: PurchaseRow[] | null;
                    };
                    onUpdateCustomer({
                        ...customer,
                        purchases: (purchasesData || []).map(toPurchase),
                        activeSessions: [...(customer.activeSessions || []), ...newSessions],
                    });
                } else {
                    onUpdateCustomer({
                        ...customer,
                        activeSessions: [...(customer.activeSessions || []), ...newSessions],
                    });
                }
            } catch (refreshError) {
                console.error(
                    "Punch card check-in succeeded but refreshing purchases failed:",
                    refreshError
                );
                // The children are checked in either way -- fold in the new
                // sessions so the screen doesn't read as if nobody is.
                onUpdateCustomer({
                    ...customer,
                    activeSessions: [...(customer.activeSessions || []), ...newSessions],
                });
            }
        } catch (error) {
            console.error("Punch card check-in failed:", error);
            if (boughtSummary) {
                // Day passes for this card are already bought -- this attempt
                // or an earlier one -- so stay locked into retry-only-sessions
                // rather than letting the next press buy them again.
                setPendingPunchCardRetry({ purchaseId, entries, boughtSummary });
                alert(
                    `${boughtSummary}\n\n(Check-in failed again: ${
                        error instanceof Error ? error.message : "unknown error"
                    })`
                );
            } else {
                alert(error instanceof Error ? error.message : "Check-in failed");
            }
        }
    };

    const handleCheckIn = async (customer: Customer, purchaseId: string) => {
        const now = new Date();
        const nowIso = now.toISOString();

        // Block check-in if pass is expired
        const purchase = customer.purchases.find(p => p.id === purchaseId);
        if (purchase?.actualExpiryDate && new Date(purchase.actualExpiryDate) < now) {
            alert('This pass has expired. Please purchase a new pass.');
            return;
        }

        // Calculate auto-checkout time based on configured closing time
        const autoCheckoutTime = getNextClosingTime(
            autoCheckoutSettings.timezone,
            autoCheckoutSettings.closingTime
        );

        // Persist session to Supabase
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customer.id,
                    purchase_id: purchaseId,
                    start_time: nowIso,
                    auto_checkout_time: autoCheckoutTime,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to create session:', errorData);
                return;
            }

            const { session: dbSession } = await response.json();
            // Convert database session to frontend format
            const newSession: Session = {
                id: dbSession.id,
                customerId: dbSession.customer_id,
                purchaseId: dbSession.purchase_id,
                startTime: dbSession.start_time,
                autoCheckoutTime: dbSession.auto_checkout_time,
            };

            const updatedPurchases = customer.purchases.map((p) => {
                if (p.id === purchaseId) {
                    const newUsedSessions = p.usedSessions + 1;
                    const isFirstUse = !p.firstUseDate;

                    // Calculate actual expiry on first use
                    let actualExpiryDate = p.actualExpiryDate;
                    let firstUseDate = p.firstUseDate;
                    let nextRenewalDate = p.nextRenewalDate;

                    if (isFirstUse) {
                        firstUseDate = nowIso;
                        actualExpiryDate = calculateActualExpiry(p.type, nowIso, p.totalSessions);
                        // If auto-renew is enabled and no renewal date is set, calculate it now
                        if (
                            p.autoRenew &&
                            (!p.nextRenewalDate || p.nextRenewalDate.trim() === "")
                        ) {
                            const expiryDate = new Date(actualExpiryDate);
                            nextRenewalDate = new Date(
                                expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString();
                        }
                    }

                    const newStatus =
                        p.totalSessions === 999
                            ? p.status
                            : p.totalSessions === 1
                            ? p.status
                            : newUsedSessions >= p.totalSessions
                            ? ("used" as const)
                            : p.status;

                    return {
                        ...p,
                        usedSessions: newUsedSessions,
                        firstUseDate,
                        actualExpiryDate,
                        nextRenewalDate,
                        status: newStatus,
                    };
                }
                return p;
            });

            const updatedCustomer = {
                ...customer,
                purchases: updatedPurchases,
                activeSessions: [...(customer.activeSessions || []), newSession],
            };

            onUpdateCustomer(updatedCustomer);
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const handleCheckOut = async (customer: Customer, sessionId: string) => {
        // End session in Supabase
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to end session:', errorData);
                return;
            }

            const { session: dbSession } = await response.json();
            // Remove the checked-out session from local state
            const activeSessions = customer.activeSessions || [];
            const updatedSessions = activeSessions.filter(
                (session) => session.id !== sessionId
            );

            const updatedCustomer = {
                ...customer,
                activeSessions: updatedSessions,
            };

            onUpdateCustomer(updatedCustomer);
        } catch (error) {
            console.error('Error ending session:', error);
        }
    };

    const handleUsePassClick = (customer: Customer, purchaseId: string) => {
        const purchase = customer.purchases.find((p) => p.id === purchaseId);
        if (!purchase) return;

        // Handle party packages specially
        if (purchase.type === "party_package") {
            if (!purchase.partyDate || !purchase.partyStartTime) {
                // Show party scheduling modal for unscheduled parties
                setSelectedParty(purchase);
                setShowPartyScheduling(true);
                return;
            }

            // Check if party is within ±30 minute check-in window
            const now = new Date();
            const partyDateTime = new Date(
                `${purchase.partyDate}T${purchase.partyStartTime}`
            );
            const timeDifference = partyDateTime.getTime() - now.getTime();
            const thirtyMinutes = 30 * 60 * 1000;

            if (Math.abs(timeDifference) > thirtyMinutes) {
                // Show party details modal with timing information
                setSelectedParty(purchase);
                setShowPartyModal(true);
                return;
            }

            // Within check-in window, show confirmation
            setConfirmingPurchase(purchase);
            setShowConfirmDialog(true);
            return;
        }

        if (purchase.totalSessions === 1 && !purchase.firstUseDate) {
            // Show confirmation for single-use passes
            setConfirmingPurchase(purchase);
            setShowConfirmDialog(true);
        } else {
            // Directly check in for multi-use passes or already used passes
            void handleCheckIn(customer, purchaseId);
        }
    };

    const handleConfirmUse = () => {
        if (confirmingPurchase && (selectedCustomer || currentCustomer)) {
            const customer = selectedCustomer || currentCustomer!;
            void handleCheckIn(customer, confirmingPurchase.id);
        }
        setShowConfirmDialog(false);
        setConfirmingPurchase(null);
    };

    const handleCancelUse = () => {
        setShowConfirmDialog(false);
        setConfirmingPurchase(null);
    };

    const handlePartySchedule = async (partyData: {
        partyDate: string;
        partyStartTime: string;
        partyEndTime: string;
        partyGuests: number;
        partyNotes: string;
    }) => {
        if (!selectedParty) return;

        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        // Call the API to persist to database (syncs to party_bookings table)
        try {
            const response = await fetch(`/api/purchases/${selectedParty.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    party_date: partyData.partyDate,
                    party_start_time: partyData.partyStartTime,
                    party_end_time: partyData.partyEndTime,
                    party_guests: partyData.partyGuests,
                    party_notes: partyData.partyNotes,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to schedule party');
            }

            // Calculate new price if guests exceed 15
            let newPrice = selectedParty.price;
            if (partyData.partyGuests > 15) {
                const basePrice = selectedParty.name.includes("Private") ? 425 : 350;
                newPrice = basePrice + (partyData.partyGuests - 15) * 12;
            }

            // Update local state after successful API call
            const updatedPurchases = customer.purchases.map((p) => {
                if (p.id === selectedParty.id) {
                    return {
                        ...p,
                        partyDate: partyData.partyDate,
                        partyStartTime: partyData.partyStartTime,
                        partyEndTime: partyData.partyEndTime,
                        partyGuests: partyData.partyGuests,
                        partyNotes: partyData.partyNotes,
                        price: newPrice,
                    };
                }
                return p;
            });

            const updatedCustomer = {
                ...customer,
                purchases: updatedPurchases,
            };

            onUpdateCustomer(updatedCustomer);

            // Close scheduling modal and show success
            setShowPartyScheduling(false);
            setSelectedParty(null);

            const formatTime = (time: string) => {
                const [hours, minutes] = time.split(":");
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? "PM" : "AM";
                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                return `${displayHour}:${minutes} ${ampm}`;
            };

            setSuccessDetails({
                title: "🎉 Party Scheduled Successfully!",
                message: `Your ${selectedParty.name} has been scheduled!`,
                details: {
                    date: partyData.partyDate,
                    time: `${formatTime(partyData.partyStartTime)} - ${formatTime(
                        partyData.partyEndTime
                    )}`,
                    guests: partyData.partyGuests,
                    price: newPrice,
                    type: selectedParty.name,
                },
            });
            setShowSuccessModal(true);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to schedule party. Please try again.');
        }
    };

    const handleApplyCoupon = async (productId: string, productPrice: number) => {
        const raw = (couponInputs[productId] || "").trim();
        if (!raw) {
            setCouponErrors(prev => ({ ...prev, [productId]: "Enter a coupon code" }));
            return;
        }
        const code = raw.toUpperCase();
        setCouponLoading(prev => ({ ...prev, [productId]: true }));
        setCouponErrors(prev => ({ ...prev, [productId]: "" }));
        try {
            const res = await fetch(
                `/api/coupons/validate?code=${encodeURIComponent(code)}&passPrice=${productPrice}`
            );
            const data = await res.json();
            if (!data.valid) {
                setCouponErrors(prev => ({ ...prev, [productId]: data.error || "Invalid coupon" }));
                return;
            }
            setAppliedCoupons(prev => ({
                ...prev,
                [productId]: {
                    code: data.coupon.code,
                    name: data.coupon.name,
                    discountType: data.coupon.discount_type,
                    applied: Number(data.preview?.applied || 0),
                    forfeited: Number(data.preview?.forfeited || 0),
                },
            }));
            setCouponInputs(prev => ({ ...prev, [productId]: "" }));
        } catch {
            setCouponErrors(prev => ({ ...prev, [productId]: "Failed to validate coupon" }));
        } finally {
            setCouponLoading(prev => ({ ...prev, [productId]: false }));
        }
    };

    const handleRemoveCoupon = (productId: string) => {
        setAppliedCoupons(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
        setCouponErrors(prev => ({ ...prev, [productId]: "" }));
    };

    const handleQuickPurchase = (productId: string) => {
        // Clear any existing timeout
        if (confirmTimeout) {
            clearTimeout(confirmTimeout);
        }

        // Set confirmation state
        setConfirmingProduct(productId);

        // Set timeout to reset confirmation after 5 seconds
        const timeout = setTimeout(() => {
            setConfirmingProduct(null);
        }, 5000);

        setConfirmTimeout(timeout);
    };

    const handleCheckInClick = (purchaseId: string) => {
        // Clear any existing timeout
        if (checkInTimeout) {
            clearTimeout(checkInTimeout);
        }

        // Set confirmation state
        setConfirmingCheckIn(purchaseId);

        // Set timeout to reset confirmation after 5 seconds
        const timeout = setTimeout(() => {
            setConfirmingCheckIn(null);
        }, 5000);

        setCheckInTimeout(timeout);
    };

    const handleConfirmCheckIn = (purchaseId: string) => {
        // Clear confirmation state and timeout
        setConfirmingCheckIn(null);
        if (checkInTimeout) {
            clearTimeout(checkInTimeout);
            setCheckInTimeout(null);
        }

        // Proceed with the actual check-in
        const customer = selectedCustomer || currentCustomer;
        if (customer) {
            void handleCheckIn(customer, purchaseId);
        }
    };

    const fetchSavedCards = async () => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        try {
            const response = await fetch("/api/stripe/payment-methods");
            if (response.ok) {
                const { paymentMethods } = await response.json();
                // Convert API format to component format
                const savedCards = paymentMethods.map((pm: any) => ({
                    id: pm.stripe_payment_method_id,
                    last4: pm.last4,
                    brand: pm.brand,
                    expiryMonth: pm.expiry_month,
                    expiryYear: pm.expiry_year,
                    isDefault: pm.is_default,
                }));

                const updatedCustomer = {
                    ...customer,
                    savedCards,
                };
                onUpdateCustomer(updatedCustomer);
            }
        } catch (error) {
            console.error("Error fetching saved cards:", error);
        }
    };

    // Fetch saved cards when customer is selected
    useEffect(() => {
        if (selectedCustomer || currentCustomer) {
            fetchSavedCards();
        }
    }, [selectedCustomer?.id, currentCustomer?.id]);

    // After Dark availability — fetch when tab activated
    const fetchAfterDarkAvailability = async () => {
        setAfterDarkLoading(true);
        setAfterDarkError(null);
        try {
            const res = await fetch("/api/after-dark/availability");
            if (!res.ok) throw new Error("Failed to load After Dark dates");
            const data = await res.json();
            setAfterDarkEvents(data.availability || []);
        } catch (err) {
            setAfterDarkError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setAfterDarkLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "afterdark" && afterDarkEvents.length === 0 && !afterDarkLoading) {
            fetchAfterDarkAvailability();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const resetAfterDarkBooking = () => {
        setAfterDarkStep("select");
        setAfterDarkBookingDate(null);
        setAfterDarkSelectedChildren([]);
        setAfterDarkNotes("");
        setAfterDarkError(null);
    };

    const handleAfterDarkWaiverComplete = async (waiver: AfterDarkWaiverFormData) => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer || !afterDarkBookingDate) return;

        const defaultCard =
            customer.savedCards.find((c) => c.isDefault) || customer.savedCards[0];

        if (!defaultCard) {
            setAfterDarkError(
                "No saved card on file. Add a payment method on the Payment tab first."
            );
            return;
        }

        const numKids = afterDarkSelectedChildren.length;
        const kidDetails = afterDarkSelectedChildren
            .map((id) => {
                const c = customer.children.find((ch) => ch.id === id);
                return c ? `${c.name} (${c.age})` : "";
            })
            .filter(Boolean)
            .join(", ");

        setAfterDarkSubmitting(true);
        setAfterDarkError(null);

        try {
            const res = await fetch("/api/after-dark/book-pos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    event_date: afterDarkBookingDate,
                    num_kids: numKids,
                    paymentMethodId: defaultCard.id,
                    kid_details: kidDetails,
                    notes: afterDarkNotes || undefined,
                    waiver,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Booking failed");
            }

            const charged = (data.amountPaid || 0) - (data.giftCardAmountUsed || 0);
            setSuccessDetails({
                title: "🌙 After Dark Booked!",
                message: `${numKids} kid${numKids > 1 ? "s" : ""} booked for ${afterDarkBookingDate}.`,
                details:
                    `💳 Charged •••• ${defaultCard.last4}: ${formatCurrency(charged)}` +
                    `\n👶 ${kidDetails}` +
                    ((data.giftCardAmountUsed || 0) > 0
                        ? `\n🎁 Gift card applied: ${formatCurrency(data.giftCardAmountUsed)}`
                        : ""),
            });
            setShowSuccessModal(true);

            resetAfterDarkBooking();
            await fetchAfterDarkAvailability();
        } catch (err) {
            setAfterDarkError(err instanceof Error ? err.message : "Booking failed");
            // Stay on waiver step so they can retry/cancel
        } finally {
            setAfterDarkSubmitting(false);
        }
    };

    const handleAddPaymentMethodSuccess = async () => {
        // Fetch updated saved cards from API
        await fetchSavedCards();
        setShowPaymentModal(false);
        alert("Payment method added successfully!");
    };

    const handleClosePaymentModal = () => {
        if (processingPayment) return; // Prevent closing during processing

        setShowPaymentModal(false);
        setCardNumber("");
        setExpiryDate("");
        setCvv("");
        setCardholderName("");
        setSaveCard(true);
    };

    const handleAutoRenewToggle = (purchaseId: string, currentAutoRenew: boolean) => {
        if (!currentAutoRenew) {
            // Enabling auto-renew, show confirmation
            setConfirmingAutoRenewFor(purchaseId);
            setShowAutoRenewConfirm(true);
        } else {
            // Disabling auto-renew, do it immediately
            updateAutoRenewStatus(purchaseId, false);
        }
    };

    const handleConfirmAutoRenew = () => {
        if (confirmingAutoRenewFor) {
            updateAutoRenewStatus(confirmingAutoRenewFor, true);
        }
        setShowAutoRenewConfirm(false);
        setConfirmingAutoRenewFor(null);
    };

    const updateAutoRenewStatus = (purchaseId: string, autoRenew: boolean) => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        const updatedPurchases = customer.purchases.map((p) => {
            if (p.id === purchaseId) {
                let nextRenewalDate = p.nextRenewalDate;

                if (autoRenew && p.firstUseDate) {
                    // Calculate next renewal date based on pass type
                    const firstUse = new Date(p.firstUseDate);
                    if (p.type === "weekly_pass") {
                        nextRenewalDate = new Date(
                            firstUse.getTime() + 7 * 24 * 60 * 60 * 1000
                        ).toISOString();
                    } else if (p.type === "monthly_pass") {
                        nextRenewalDate = new Date(
                            firstUse.getTime() + 30 * 24 * 60 * 60 * 1000
                        ).toISOString();
                    }
                } else if (!autoRenew) {
                    nextRenewalDate = "";
                }

                return {
                    ...p,
                    autoRenew,
                    nextRenewalDate,
                };
            }
            return p;
        });

        const updatedCustomer = {
            ...customer,
            purchases: updatedPurchases,
        };

        onUpdateCustomer(updatedCustomer);
    };

    // Check if a product is a group rate product
    const isGroupRateProduct = (product: { name: string }) => {
        return product.name.toLowerCase().includes('group rate') ||
            product.name.toLowerCase().includes('group_rate');
    };

    // Callback when group children assignment is complete
    const handleGroupChildrenComplete = (children: typeof pendingGroupChildren, totalPrice: number) => {
        setPendingGroupChildren(children);
        setGroupRateTotalPrice(totalPrice);
        setShowGroupChildrenManager(false);

        // Proceed with purchase now that children are assigned
        if (groupRateProductId) {
            handleConfirmPurchase(groupRateProductId);
        }
    };

    const handleConfirmPurchase = async (productId: string) => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer) return;

        const product = [
            ...AVAILABLE_PASS_PRODUCTS,
            ...AVAILABLE_PARTY_PRODUCTS,
            ...AVAILABLE_SNACKS,
        ].find((p) => p.id === productId);
        if (!product) return;

        // Determine product type using the arrays loaded from database API
        const isSnackPurchase = availableSnacks.some((s) => s.id === productId);
        const isPartyPurchase = availableParties.some((p) => p.id === productId);
        const isPassPurchase = availablePasses.some((p) => p.id === productId);

        if (isPassPurchase) {
            const isFamilyProduct = isFamilyPass(product.name);
            const isComboProduct = isChildInfantComboPass(product.name);

            if (isComboProduct) {
                // Combo pass: require both a child (2+) and infant (under 2)
                if (selectedChildrenForFamilyPass.length < 2) {
                    setSuccessDetails({
                        title: "Child & Infant Selection Required",
                        message: "Please select one child (age 2+) and one infant (under 2) for this combo pass.",
                    });
                    setShowSuccessModal(true);
                    return;
                }
            } else if (isFamilyProduct) {
                // Family pass: require at least one child selected
                if (selectedChildrenForFamilyPass.length === 0) {
                    setSuccessDetails({
                        title: "Child Selection Required",
                        message: "Please select which children this family pass covers before purchasing.",
                    });
                    setShowSuccessModal(true);
                    return;
                }

                // Validate all selected children have signed waivers
                for (const childId of selectedChildrenForFamilyPass) {
                    const child = customer.children.find((c) => c.id === childId);
                    if (!child || !child.waiverSigned) {
                        setSuccessDetails({
                            title: "Waiver Required",
                            message: `${child?.name || 'Selected child'} must have a signed waiver before purchasing a pass.`,
                        });
                        setShowSuccessModal(true);
                        return;
                    }
                }
            } else {
                // Single-child pass: require child selection
                if (!selectedChildForPurchase) {
                    setSuccessDetails({
                        title: "Child Selection Required",
                        message:
                            "Please select which child this pass is for before purchasing.",
                    });
                    setShowSuccessModal(true);
                    return;
                }

                // Check if the selected child has a signed waiver
                const selectedChild = customer.children.find(
                    (c) => c.id === selectedChildForPurchase
                );
                if (!selectedChild || !selectedChild.waiverSigned) {
                    setSuccessDetails({
                        title: "Waiver Required",
                        message:
                            "The selected child must have a signed waiver before purchasing a pass.",
                    });
                    setShowSuccessModal(true);
                    return;
                }

                // Age gate validation - check if child's age matches the pass type
                if (selectedChild && hasAgeRestriction(product.name)) {
                    const ageValidation = validateAgeForProduct(selectedChild.age, product.name);
                    if (!ageValidation.valid) {
                        const productAgeGroup = getProductAgeGroup(product.name);
                        const childAgeGroup = getAgeGroup(selectedChild.age);
                        const suggestedPassType = childAgeGroup === 'infant' ? 'infant' : 'toddler';

                        setSuccessDetails({
                            title: "Age Restriction",
                            message: ageValidation.error || `This pass is not appropriate for ${selectedChild.name}'s age. Please select a ${suggestedPassType} pass instead.`,
                        });
                        setShowSuccessModal(true);
                        return;
                    }
                }
            }
        }

        // Clear confirmation state and timeout
        setConfirmingProduct(null);
        if (confirmTimeout) {
            clearTimeout(confirmTimeout);
            setConfirmTimeout(null);
        }

        setPurchasingProduct(productId);

        try {
            // Determine purchase type from product category or name
            // Products have category field: day, weekly, monthly for passes
            // Parties are in availableParties array
            // Snacks are in availableSnacks array
            let purchaseType: Purchase["type"];

            if (isSnackPurchase) {
                purchaseType = "food_beverage";
            } else if (isPartyPurchase) {
                purchaseType = "party_package";
            } else if (product.category === "day") {
                purchaseType = "day_pass";
            } else if (product.category === "weekly") {
                purchaseType = "weekly_pass";
            } else if (product.category === "monthly") {
                purchaseType = "monthly_pass";
            } else {
                // Fallback: infer from name if category not set
                const lowerName = product.name.toLowerCase();
                if (lowerName.includes("day")) {
                    purchaseType = "day_pass";
                } else if (lowerName.includes("punch") || lowerName.includes("weekly") || lowerName.includes("10")) {
                    purchaseType = "weekly_pass";
                } else if (lowerName.includes("monthly") || lowerName.includes("membership")) {
                    purchaseType = "monthly_pass";
                } else if (lowerName.includes("party")) {
                    purchaseType = "party_package";
                } else {
                    // Default to day pass if we can't determine
                    purchaseType = "day_pass";
                    console.warn(`Could not determine purchase type for product: ${product.name}, defaulting to day_pass`);
                }
            }

            // Optional coupon code (day-pass purchases only). Pulled from the
            // per-product Apply Coupon UI on each day-pass row.
            const couponCode: string | undefined =
                purchaseType === "day_pass" ? appliedCoupons[productId]?.code : undefined;

            // In kiosk mode, use self-serve payment with saved cards (no redirect)
            if (posMode === 'kiosk') {
                // Check if customer has a saved payment method
                if (!customer.savedCards || customer.savedCards.length === 0) {
                    throw new Error("Please add a payment method first. Tap 'Add Card' to save your payment method.");
                }

                // Get the default card or first card
                const defaultCard = customer.savedCards.find(c => c.isDefault) || customer.savedCards[0];

                // Get quantity and calculate discounted total. Sibling discounts
                // apply to passes for members (or when buying memberships); the
                // member discount on food & retail is applied server-side.
                const quantity = quantities[productId] || 1;
                const pricing = getPricingBreakdown(
                    product.price,
                    quantity,
                    qualifiesForMemberPricing(purchaseType, isPassPurchase)
                );
                const totalPrice = pricing.total;

                // Use kiosk payment API with saved card (self-serve endpoint)
                const response = await fetch("/api/stripe/kiosk-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customerId: customer.id,
                        productId: productId,
                        productName: product.name,
                        productPrice: totalPrice, // Send discounted total
                        productDescription: product.description || "",
                        purchaseType: purchaseType,
                        childId: isPassPurchase ? selectedChildForPurchase : undefined,
                        childrenIds: (isPassPurchase && (isFamilyPass(product.name) || isChildInfantComboPass(product.name))) ? selectedChildrenForFamilyPass : undefined,
                        paymentMethodId: defaultCard.id,
                        quantity: quantity,
                        couponCode: couponCode,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    // Handle specific error cases
                    if (data.requires_action) {
                        throw new Error("This card requires additional verification. Please use a different card or contact support.");
                    }
                    throw new Error(data.error || data.details || "Payment failed. Please try again.");
                }

                // Clear family pass selection
                setSelectedChildrenForFamilyPass([]);

                // Payment successful - refresh purchases and show success
                const purchasesResponse = await fetch(
                    `/api/purchases?customer_id=${customer.id}`
                );
                if (purchasesResponse.ok) {
                    const { purchases: purchasesData } = await purchasesResponse.json();
                    const purchases = (purchasesData || []).map((p: any) => ({
                        id: p.id,
                        type: p.type,
                        name: p.name,
                        price: p.price,
                        purchaseDate: p.purchase_date || p.created_at,
                        expiryDate: p.expiry_date,
                        firstUseDate: p.first_use_date,
                        actualExpiryDate: p.actual_expiry_date,
                        usedSessions: p.used_sessions || 0,
                        totalSessions: p.total_sessions || 1,
                        status: p.status || "active",
                        partyDate: p.party_date,
                        partyStartTime: p.party_start_time,
                        partyEndTime: p.party_end_time,
                        partyGuests: p.party_guests,
                        partyNotes: p.party_notes,
                        childId: p.child_id,
                    }));

                    const updatedCustomer = {
                        ...customer,
                        purchases,
                    };
                    onUpdateCustomer(updatedCustomer);
                }

                // Decrement local inventory count for snacks
                if (isSnackPurchase) {
                    setAvailableSnacks(prev => prev.map(s =>
                        s.id === productId && s.quantityOnHand !== null && s.quantityOnHand !== undefined
                            ? { ...s, quantityOnHand: Math.max(0, s.quantityOnHand - quantity) }
                            : s
                    ));
                }

                // Reset quantities after successful purchase
                setQuantities((prev) => ({
                    ...prev,
                    [productId]: 0,
                }));

                // Build success message with quantity and savings
                const giftCardUsed = data.giftCardAmountUsed || 0;
                const amountCharged = data.amountCharged ?? (totalPrice - giftCardUsed);
                let successDetails = `💳 Charged •••• ${defaultCard.last4}\n💰 ${formatCurrency(amountCharged)}`;
                if (giftCardUsed > 0) {
                    successDetails += `\n🎁 Gift card applied: ${formatCurrency(giftCardUsed)}`;
                }
                if (quantity > 1) {
                    successDetails += `\n📦 Quantity: ${quantity}`;
                    if (pricing.savings > 0) {
                        successDetails += `\n🎉 You saved ${formatCurrency(pricing.savings)}!`;
                    }
                }

                // Show success message
                setSuccessDetails({
                    title: "Payment Successful! ✅",
                    message: quantity > 1
                        ? `Your purchase of ${quantity}x ${product.name} has been completed.`
                        : `Your purchase of ${product.name} has been completed.`,
                    details: successDetails,
                });
                setShowSuccessModal(true);
                setPurchasingProduct(null);
                return;
            }

            // In staff mode, use the existing POS endpoint (requires staff role)
            // For group rate, use the age-based total from GroupChildrenManager
            const isGroupRate = isGroupRateProduct(product);
            const purchasePrice = isGroupRate && groupRateTotalPrice !== null
                ? groupRateTotalPrice
                : product.price;

            const response = await fetch("/api/purchases/pos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    product_id: productId,
                    product_name: product.name,
                    product_price: purchasePrice,
                    product_description: product.description || "",
                    purchase_type: purchaseType,
                    child_id: isPassPurchase ? selectedChildForPurchase : undefined,
                    children_ids: (isPassPurchase && (isFamilyPass(product.name) || isChildInfantComboPass(product.name))) ? selectedChildrenForFamilyPass : undefined,
                    quantity: isGroupRate ? 1 : 1, // Group rate total already includes all children
                    metadata: {},
                    coupon_code: couponCode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Purchase failed");
            }

            const { purchase, gift_card_amount_used: staffGiftCardUsed } = await response.json();

            // Clear family pass selection
            setSelectedChildrenForFamilyPass([]);

            // Fetch updated purchases from database
            const purchasesResponse = await fetch(
                `/api/purchases?customer_id=${customer.id}`
            );
            if (purchasesResponse.ok) {
                const { purchases: purchasesData } = await purchasesResponse.json();
                const purchases = (purchasesData || []).map((p: any) => ({
                    id: p.id,
                    type: p.type,
                    name: p.name,
                    price: p.price,
                    purchaseDate: p.purchase_date,
                    expiryDate: p.expiry_date,
                    usedSessions: p.used_sessions,
                    totalSessions: p.total_sessions,
                    status: p.status,
                    firstUseDate: p.first_use_date,
                    actualExpiryDate: p.actual_expiry_date,
                    childId: p.child_id,
                    autoRenew: p.auto_renew,
                    nextRenewalDate: p.next_renewal_date,
                    stripePaymentIntentId: p.stripe_payment_intent_id,
                    stripeSubscriptionId: p.stripe_subscription_id,
                    partyDate: p.party_date,
                    partyStartTime: p.party_start_time,
                    partyGuests: p.party_guests,
                    partyNotes: p.party_notes,
                }));

                const updatedCustomer = {
                    ...customer,
                    purchases: purchases,
                };

                onUpdateCustomer(updatedCustomer);
            }

            // Decrement local inventory count for snacks
            if (isSnackPurchase) {
                const qty = quantities[productId] || 1;
                setAvailableSnacks(prev => prev.map(s =>
                    s.id === productId && s.quantityOnHand !== null && s.quantityOnHand !== undefined
                        ? { ...s, quantityOnHand: Math.max(0, s.quantityOnHand - qty) }
                        : s
                ));
            }

            // Clear selected child for next purchase
            if (isPassPurchase) {
                setSelectedChildForPurchase("");
            }

            // Persist group booking children assignments if this was a group rate purchase
            if (isGroupRateProduct(product) && pendingGroupChildren.length > 0 && purchase?.id) {
                try {
                    await fetch("/api/admin/group-booking/assign-children", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            booking_id: purchase.id,
                            children: pendingGroupChildren.map((c) => ({
                                child_id: c.id,
                                waiver_signed_at_booking: c.waiver_signed,
                                is_new_child: c.is_new_child,
                            })),
                        }),
                    });
                } catch (assignError) {
                    console.error("Failed to persist group children assignments:", assignError);
                }
                setPendingGroupChildren([]);
                setGroupRateProductId(null);
                setGroupRateTotalPrice(null);
            }

            setPurchaseSuccess(
                (staffGiftCardUsed || 0) > 0
                    ? `✅ ${product.name} purchased! 🎁 ${formatCurrency(staffGiftCardUsed)} gift card credit applied.`
                    : `✅ ${product.name} purchased successfully!`
            );

            // Clear success message after 3 seconds
            setTimeout(() => setPurchaseSuccess(""), 3000);
        } catch (error) {
            console.error("Purchase failed:", error);
            setSuccessDetails({
                title: "Purchase Failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unable to process purchase. Please try again.",
            });
            setShowSuccessModal(true);
        } finally {
            setPurchasingProduct(null);
        }
    };

    // Handle issuing complimentary pass (staff only)
    const handleIssueComplimentaryPass = async () => {
        const customer = selectedCustomer || currentCustomer;
        if (!customer || !complimentaryChildId || !complimentaryPassId) {
            setSuccessDetails({
                title: "Missing Information",
                message: "Please select a child and pass type.",
            });
            setShowSuccessModal(true);
            return;
        }

        const selectedChild = customer.children.find(
            (c) => c.id === complimentaryChildId
        );
        if (!selectedChild || !selectedChild.waiverSigned) {
            setSuccessDetails({
                title: "Waiver Required",
                message: "The selected child must have a signed waiver first.",
            });
            setShowSuccessModal(true);
            return;
        }

        const selectedPass = availablePasses.find(
            (p) => p.id === complimentaryPassId
        );
        if (!selectedPass) return;

        // Age gate validation
        if (hasAgeRestriction(selectedPass.name)) {
            const ageValidation = validateAgeForProduct(selectedChild.age, selectedPass.name);
            if (!ageValidation.valid) {
                setSuccessDetails({
                    title: "Age Restriction",
                    message: ageValidation.error || "This pass is not appropriate for this child's age.",
                });
                setShowSuccessModal(true);
                return;
            }
        }

        setIsIssuingComplimentary(true);

        try {
            // Determine purchase type from pass category
            let purchaseType: Purchase["type"] = "day_pass";
            if (selectedPass.category === "weekly") {
                purchaseType = "weekly_pass";
            } else if (selectedPass.category === "monthly") {
                purchaseType = "monthly_pass";
            }

            const response = await fetch("/api/purchases/pos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    product_id: selectedPass.id,
                    product_name: selectedPass.name,
                    product_price: selectedPass.price,
                    product_description: selectedPass.description || "",
                    purchase_type: purchaseType,
                    child_id: complimentaryChildId,
                    quantity: 1,
                    payment_method: "complimentary",
                    metadata: {
                        complimentary_reason: complimentaryReason || "Raffle donation",
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to issue complimentary pass");
            }

            // Refresh customer purchases
            const purchasesResponse = await fetch(
                `/api/purchases?customer_id=${customer.id}`
            );
            if (purchasesResponse.ok) {
                const { purchases: purchasesData } = await purchasesResponse.json();
                const purchases = (purchasesData || []).map((p: any) => ({
                    id: p.id,
                    type: p.type,
                    name: p.name,
                    price: p.price,
                    purchaseDate: p.purchase_date,
                    expiryDate: p.expiry_date,
                    usedSessions: p.used_sessions,
                    totalSessions: p.total_sessions,
                    status: p.status,
                    firstUseDate: p.first_use_date,
                    actualExpiryDate: p.actual_expiry_date,
                    childId: p.child_id,
                }));

                const updatedCustomer = {
                    ...customer,
                    purchases: purchases,
                };
                onUpdateCustomer(updatedCustomer);
            }

            // Reset modal state
            setShowComplimentaryModal(false);
            setComplimentaryChildId("");
            setComplimentaryPassId("");
            setComplimentaryReason("");

            setSuccessDetails({
                title: "Complimentary Pass Issued",
                message: `${selectedPass.name} has been issued to ${selectedChild.name} at no charge.`,
                details: complimentaryReason ? `Reason: ${complimentaryReason}` : undefined,
            });
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Failed to issue complimentary pass:", error);
            setSuccessDetails({
                title: "Error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to issue complimentary pass. Please try again.",
            });
            setShowSuccessModal(true);
        } finally {
            setIsIssuingComplimentary(false);
        }
    };

    const formatDate = (dateString: string) => {
        // Use parseDateString to avoid UTC timezone bug for date-only strings
        return parseDateString(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getSessionDuration = (startTime: string) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffInMinutes = Math.floor(
            (now.getTime() - start.getTime()) / (1000 * 60)
        );

        if (diffInMinutes < 60) {
            return `${diffInMinutes} minutes`;
        } else {
            const hours = Math.floor(diffInMinutes / 60);
            const minutes = diffInMinutes % 60;
            return `${hours}h ${minutes}m`;
        }
    };

    const isPartyCheckInAvailable = (purchase: Purchase) => {
        if (
            purchase.type !== "party_package" ||
            !purchase.partyDate ||
            !purchase.partyStartTime
        ) {
            return false;
        }

        const now = new Date();
        const partyDateTime = new Date(
            `${purchase.partyDate}T${purchase.partyStartTime}`
        );
        const timeDifference = partyDateTime.getTime() - now.getTime();
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

        // Allow check-in within ±30 minutes of party start time
        return Math.abs(timeDifference) <= thirtyMinutes;
    };

    const getPartyCheckInStatus = (purchase: Purchase) => {
        if (purchase.type !== "party_package") return null;

        if (!purchase.partyDate || !purchase.partyStartTime) return "needs_scheduling";

        const now = new Date();
        const partyDateTime = new Date(
            `${purchase.partyDate}T${purchase.partyStartTime}`
        );
        const timeDifference = partyDateTime.getTime() - now.getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        if (Math.abs(timeDifference) <= thirtyMinutes) {
            return "available"; // Within ±30 minutes
        } else if (timeDifference > thirtyMinutes) {
            const hoursUntil = Math.ceil(timeDifference / (60 * 60 * 1000));
            const minutesUntil = Math.ceil(timeDifference / (60 * 1000));

            if (hoursUntil >= 24) {
                const daysUntil = Math.ceil(timeDifference / (24 * 60 * 60 * 1000));
                return `too_early_days:${daysUntil}`;
            } else if (hoursUntil >= 1) {
                return `too_early_hours:${hoursUntil}`;
            } else {
                return `too_early_minutes:${minutesUntil}`;
            }
        } else {
            // Party time has passed by more than 30 minutes
            return "expired";
        }
    };

    // Get currently active sessions
    const activeCustomers = customers.filter(
        (c) => c.activeSessions && c.activeSessions.length > 0
    );

    return (
        <div className="space-y-8">
            {/* Staff Search */}
            {isStaffMode && (
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Customer Lookup</h3>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label
                                htmlFor="phone-search"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Enter Customer Phone Number
                            </label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                id="phone-search"
                                value={searchPhone}
                                onChange={handlePhoneSearch}
                                placeholder="(555) 123-4567"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                maxLength={14}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={() =>
                                    setShowCustomerDetails(!showCustomerDetails)
                                }
                                disabled={!selectedCustomer}
                                variant="outline"
                            >
                                {showCustomerDetails ? "Hide Details" : "Show Details"}
                            </Button>
                        </div>
                    </div>

                    {selectedCustomer && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800">
                                ✅ Found: <strong>{selectedCustomer.name}</strong> -{" "}
                                {formatPhoneNumber(selectedCustomer.phone)}
                            </p>
                            {(selectedCustomer.giftCardBalance || 0) > 0 && (
                                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-300 px-3 py-1 text-sm font-semibold text-yellow-800">
                                    🎁 Gift card credit: {formatCurrency(selectedCustomer.giftCardBalance || 0)}
                                    <span className="font-normal text-yellow-700">— applies automatically at checkout</span>
                                </p>
                            )}
                        </div>
                    )}

                    {searchPhone.replace(/[^\d]/g, "").length === 10 &&
                        !selectedCustomer && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800">
                                    ❌ No customer found with this phone number
                                </p>
                            </div>
                        )}
                </Card>
            )}

            {/* Active Sessions Overview */}
            {isStaffMode && activeCustomers.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">
                        Currently Checked In ({activeCustomers.length})
                    </h3>
                    <div className="space-y-3">
                        {activeCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{customer.name}</p>
                                    <p className="text-sm text-gray-600">
                                        {formatPhoneNumber(customer.phone)} • Checked in
                                        at{" "}
                                        {formatTime(
                                            customer.activeSessions![0].startTime
                                        )}{" "}
                                        • Duration:{" "}
                                        {getSessionDuration(
                                            customer.activeSessions![0].startTime
                                        )}
                                        {customer.activeSessions!.length > 1 && (
                                            <span className="ml-2 text-blue-600">
                                                +{customer.activeSessions!.length - 1}{" "}
                                                more sessions
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <Button
                                    onClick={() =>
                                        void handleCheckOut(
                                            customer,
                                            customer.activeSessions![0].id
                                        )
                                    }
                                    size="sm"
                                    variant="outline"
                                >
                                    Check Out
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Customer Check-in Interface */}
            {displayCustomer && (
                <div className="space-y-6">
                    {/* Success Message */}
                    {purchaseSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg text-center">
                            <p className="text-lg font-semibold">{purchaseSuccess}</p>
                        </div>
                    )}
                    {/* Customer Header */}
                    <Card className="p-8 bg-gradient-to-r from-yellow-50 to-orange-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    {displayCustomer.name}
                                </h2>
                                <p className="text-lg text-gray-700 mb-1">
                                    {formatPhoneNumber(displayCustomer.phone)}
                                    {displayCustomer.email &&
                                        ` • ${displayCustomer.email}`}
                                </p>
                                <p className="text-base text-gray-600">
                                    Customer since {formatDate(displayCustomer.createdAt)}
                                    {displayCustomer.lastVisit &&
                                        ` • Last visit: ${formatDate(
                                            displayCustomer.lastVisit
                                        )}`}
                                </p>
                                {isActiveMember && (
                                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-400 px-4 py-2">
                                        <span className="text-xl">🐝</span>
                                        <span className="text-sm font-bold text-amber-900">
                                            Active Member
                                        </span>
                                        <span className="text-xs text-amber-800">
                                            {MEMBERSHIP_DISCOUNT_PERCENT}% off food &amp; retail, applied automatically
                                        </span>
                                    </div>
                                )}
                                {(headerGiftCardBalance ?? displayCustomer.giftCardBalance ?? 0) > 0 && (
                                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-yellow-100 border border-yellow-300 px-4 py-2">
                                        <span className="text-xl">🎁</span>
                                        <span className="text-sm font-bold text-yellow-800">
                                            Gift Card Credit:{" "}
                                            {formatCurrency(headerGiftCardBalance ?? displayCustomer.giftCardBalance ?? 0)}
                                        </span>
                                        <span className="text-xs text-yellow-700">
                                            applies automatically at checkout
                                        </span>
                                    </div>
                                )}
                            </div>

                            {headerNotes && (
                                <div className="mx-6 flex-1 flex items-start gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 max-w-xl">
                                    <span className="text-xl leading-none">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                                            Notes
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap font-medium text-red-800">
                                            {headerNotes}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {displayCustomer.activeSessions &&
                                displayCustomer.activeSessions.length > 0 && (
                                    <div className="text-right">
                                        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                                            <p className="font-semibold">
                                                ✅ Currently Checked In (
                                                {displayCustomer.activeSessions.length})
                                            </p>
                                            <p className="text-sm">
                                                Since{" "}
                                                {formatTime(
                                                    displayCustomer.activeSessions[0]
                                                        .startTime
                                                )}
                                            </p>
                                            <p className="text-sm">
                                                Duration:{" "}
                                                {getSessionDuration(
                                                    displayCustomer.activeSessions[0]
                                                        .startTime
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </Card>

                    {/* Tab Navigation */}
                    <Card className="p-2 mb-8">
                        <div className="flex space-x-1">
                            <button
                                onClick={() => setActiveTab("children")}
                                className={`flex-1 px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
                                    activeTab === "children"
                                        ? "bg-green-600 text-white shadow-md"
                                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                                👶 Children ({displayCustomer.children.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("passes")}
                                className={`flex-1 px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
                                    activeTab === "passes"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                                🎫 Passes
                            </button>
                            <button
                                onClick={() => setActiveTab("parties")}
                                className={`flex-1 px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
                                    activeTab === "parties"
                                        ? "bg-purple-600 text-white shadow-md"
                                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                                🎉 Parties
                            </button>
                            <button
                                onClick={() => setActiveTab("snacks")}
                                className={`flex-1 px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
                                    activeTab === "snacks"
                                        ? "bg-orange-600 text-white shadow-md"
                                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                                🍎 Snacks
                            </button>
                            <button
                                onClick={() => setActiveTab("afterdark")}
                                className={`flex-1 px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
                                    activeTab === "afterdark"
                                        ? "bg-indigo-700 text-white shadow-md"
                                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                                🌙 After Dark
                            </button>
                        </div>
                    </Card>

                    {/* Children Management */}
                    {activeTab === "children" && (
                        <div className="space-y-8">
                            {/* Children Header */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-bold">Manage Children</h3>
                                <Button
                                    onClick={() => setShowAddChild(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                                >
                                    <span className="text-lg mr-2">+</span>
                                    Add Child
                                </Button>
                            </div>

                            {/* Buy passes: pick who's playing, then the pass.
                                The rate for each child comes from their age. */}
                            {displayCustomer.children.length > 0 && (
                                <Card className="p-6 border-l-4 border-l-amber-400">
                                    <h4 className="text-xl font-bold mb-1">
                                        {passKind === "punch"
                                            ? "Buy a punch card"
                                            : "Who's playing?"}
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-4">
                                        {passKind === "punch" ? (
                                            "Choose a card below — any child on the account can use it."
                                        ) : (
                                            <>
                                                Select the children, then choose a pass. The
                                                right rate is worked out from each
                                                child&apos;s age.
                                            </>
                                        )}
                                    </p>

                                    {passKind !== "punch" && (
                                        <div className="flex flex-wrap gap-2 mb-5">
                                            {displayCustomer.children.map((child) => {
                                                const selected = passChildIds.includes(child.id);
                                                return (
                                                    <button
                                                        key={child.id}
                                                        type="button"
                                                        onClick={() => togglePassChild(child.id)}
                                                        aria-pressed={selected}
                                                        className={`px-4 py-3 rounded-lg border-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                                            selected
                                                                ? "bg-amber-100 border-amber-500"
                                                                : "bg-white border-gray-300 hover:border-amber-400"
                                                        }`}
                                                    >
                                                        <span className="block font-semibold text-gray-900">
                                                            {selected ? "✓ " : ""}
                                                            {child.name}
                                                        </span>
                                                        <span className="block text-xs text-gray-600">
                                                            Age {child.age}
                                                            {!child.waiverSigned && " · waiver needed"}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {PASS_KINDS.map((kind) => (
                                            <button
                                                key={kind}
                                                type="button"
                                                onClick={() => {
                                                    setPassKind(kind);
                                                    setPassError(null);
                                                    setSelectedPunchCard(null);
                                                }}
                                                aria-pressed={passKind === kind}
                                                className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                                    passKind === kind
                                                        ? "bg-gray-900 text-white border-gray-900"
                                                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                                                }`}
                                            >
                                                {PASS_KIND_LABEL[kind]}
                                            </button>
                                        ))}
                                    </div>

                                    {passKind === "punch" ? (
                                        <div className="space-y-3">
                                            {punchCardOptions(availablePasses).map((card) => (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => setSelectedPunchCard(card)}
                                                    className={`w-full p-4 rounded-xl border-4 text-left transition-colors ${
                                                        selectedPunchCard?.id === card.id
                                                            ? "border-yellow-400 bg-yellow-50"
                                                            : "border-gray-200 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <span className="text-xl font-bold">
                                                        {card.name}
                                                    </span>
                                                    <span className="ml-3 text-xl">
                                                        {formatCurrency(card.price)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : passChildIds.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            Select at least one child to see pricing.
                                        </p>
                                    ) : (
                                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                                            {passQuote.lines.map((line) => (
                                                <div
                                                    key={line.child.id}
                                                    className="flex justify-between items-baseline py-1"
                                                >
                                                    <span className="text-gray-800">
                                                        {line.child.name}
                                                        <span className="text-gray-500 text-sm">
                                                            {" "}
                                                            · {line.pass.name}
                                                        </span>
                                                        {line.includedFree ? (
                                                            <span className="ml-2 text-xs font-semibold text-green-700">
                                                                plays free
                                                            </span>
                                                        ) : (
                                                            line.discountPercent > 0 && (
                                                                <span className="ml-2 text-xs font-semibold text-green-700">
                                                                    sibling −{line.discountPercent}%
                                                                </span>
                                                            )
                                                        )}
                                                    </span>
                                                    <span className="font-semibold tabular-nums">
                                                        {line.includedFree ? (
                                                            <span className="text-green-700">Free</span>
                                                        ) : (
                                                            <>
                                                                {line.discountPercent > 0 && (
                                                                    <span className="line-through text-gray-400 font-normal mr-2">
                                                                        {formatCurrency(line.basePrice)}
                                                                    </span>
                                                                )}
                                                                {formatCurrency(line.price)}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}

                                            {passQuote.unresolved.length > 0 && (
                                                <p className="mt-2 text-sm text-red-700">
                                                    No {PASS_KIND_LABEL[passKind].toLowerCase()} is
                                                    available for{" "}
                                                    {passQuote.unresolved
                                                        .map((c) => c.name)
                                                        .join(", ")}
                                                    .
                                                </p>
                                            )}

                                            <div className="flex justify-between items-baseline border-t border-gray-300 mt-3 pt-3">
                                                <span className="font-bold text-lg">Total</span>
                                                <span className="font-bold text-lg tabular-nums">
                                                    {formatCurrency(passQuote.total)}
                                                </span>
                                            </div>
                                            {passQuote.savings > 0 && (
                                                <p className="text-sm text-green-700 text-right">
                                                    Sibling discount saves{" "}
                                                    {formatCurrency(passQuote.savings)}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {passError && (
                                        <p className="mt-3 text-sm font-medium text-red-700">
                                            {passError}
                                        </p>
                                    )}

                                    <Button
                                        onClick={handleBuyPasses}
                                        disabled={
                                            buyingPasses ||
                                            (passKind === "punch"
                                                ? !selectedPunchCard
                                                : passQuote.lines.length === 0)
                                        }
                                        className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50"
                                    >
                                        {buyingPasses
                                            ? "Processing…"
                                            : passKind === "punch"
                                              ? selectedPunchCard
                                                    ? `Buy ${PASS_KIND_LABEL[passKind]} · ${formatCurrency(selectedPunchCard.price)}`
                                                    : `Buy ${PASS_KIND_LABEL[passKind]}`
                                              : passQuote.lines.length === 0
                                                ? `Buy ${PASS_KIND_LABEL[passKind]}`
                                                : `Buy ${PASS_KIND_LABEL[passKind]} · ${formatCurrency(passQuote.total)}`}
                                    </Button>
                                </Card>
                            )}

                            {/* Children List */}
                            {displayCustomer.children.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">👶</div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                        No Children Added
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Add children to this customer account to
                                        purchase passes and track waivers
                                    </p>
                                    <Button
                                        onClick={() => setShowAddChild(true)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
                                    >
                                        Add First Child
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {displayCustomer.children.map((child) => (
                                        <Card
                                            key={child.id}
                                            className="p-6 border-l-4 border-l-green-400"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-lg">
                                                        {child.name}
                                                    </h4>
                                                    <p className="text-gray-600">
                                                        Age: {child.age}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Born:{" "}
                                                        {new Date(
                                                            child.birthdate
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        handleDeleteChild(child.id)
                                                    }
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Delete child"
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Waiver Status */}
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">
                                                        Waiver Status:
                                                    </span>
                                                    <div className="flex items-center space-x-2">
                                                        {child.waiverSigned ? (
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                                                                ✅ Signed{child.waiverSignedDate ? ` ${new Date(child.waiverSignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                                                    ❌ Not Signed
                                                                </span>
                                                                <Button
                                                                    onClick={() => {
                                                                        setWaiverChild(
                                                                            child
                                                                        );
                                                                        setShowWaiverModal(
                                                                            true
                                                                        );
                                                                    }}
                                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                                                >
                                                                    Sign Waiver
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button
                                                            onClick={() => {
                                                                setViewWaiverChildName(child.name);
                                                                setShowViewWaiverModal(true);
                                                            }}
                                                            variant="outline"
                                                            className="px-3 py-1 rounded text-sm"
                                                            title="View full waiver document"
                                                        >
                                                            📄 View Waiver
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Active Passes for this child - grouped by pass type */}
                                                {(() => {
                                                    const childPasses =
                                                        displayCustomer.purchases.filter(
                                                            (p) =>
                                                                p.childId ===
                                                                    child.id &&
                                                                p.status === "active"
                                                        );

// Group passes by type and sum remaining sessions
                                                    // Extract pass type from name if type field is missing
                                                    const inferPassType = (name: string, type?: string): string => {
                                                        const lowerName = name.toLowerCase();
                                                        // Event passes get their own group based on name
                                                        if (lowerName.includes('easter egg') || lowerName.includes('egg hunt')) return 'event_easter';
                                                        if (type && type !== 'undefined') return type;
                                                        if (lowerName.includes('day pass') || lowerName.includes('day_pass')) return 'day_pass';
                                                        if (lowerName.includes('punch') || lowerName.includes('weekly')) return 'weekly_pass';
                                                        if (lowerName.includes('monthly') || lowerName.includes('membership')) return 'monthly_pass';
                                                        if (lowerName.includes('party')) return 'party_package';
                                                        return 'day_pass'; // Default fallback
                                                    };

                                                    // Map type to friendly display name
                                                    const getPassTypeName = (type: string, passName?: string) => {
                                                        if (type.startsWith('event_')) {
                                                            return passName || 'Event Pass';
                                                        }
                                                        switch (type) {
                                                            case 'day_pass': return 'Day Pass';
                                                            case 'weekly_pass': return 'Punch Card';
                                                            case 'monthly_pass': return 'Monthly Pass';
                                                            case 'party_package': return 'Party Package';
                                                            default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                        }
                                                    };

                                                    const groupedPasses = childPasses.reduce((acc, pass) => {
                                                        // Normalize type - infer from name if missing
                                                        const normalizedType = inferPassType(pass.name, pass.type);
                                                        const key = normalizedType;
                                                        if (!acc[key]) {
                                                            acc[key] = {
                                                                type: normalizedType,
                                                                name: getPassTypeName(normalizedType, pass.name),
                                                                totalRemaining: 0,
                                                                isUnlimited: false,
                                                                purchaseIds: [],
                                                            };
                                                        }
                                                        const remaining = pass.totalSessions - pass.usedSessions;
                                                        if (pass.totalSessions === 999) {
                                                            acc[key].isUnlimited = true;
                                                        }
                                                        acc[key].totalRemaining += remaining;
                                                        acc[key].purchaseIds.push(pass.id);
                                                        return acc;
                                                    }, {} as Record<string, { type: string; name: string; totalRemaining: number; isUnlimited: boolean; purchaseIds: string[] }>);

                                                    const groupedPassesList = Object.values(groupedPasses);

                                                    return (
                                                        groupedPassesList.length > 0 && (
                                                            <div>
                                                                <p className="font-medium text-sm text-gray-700 mb-2">
                                                                    Active Passes:
                                                                </p>
                                                                {groupedPassesList.map(
                                                                    (passGroup) => (
                                                                            <div
                                                                                key={passGroup.type}
                                                                                className="bg-yellow-50 p-2 rounded text-sm flex items-center justify-between mb-1"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    {!passGroup.isUnlimited && passGroup.totalRemaining > 1 && (
                                                                                        <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
                                                                                            {passGroup.totalRemaining}x
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="font-medium">
                                                                                        {passGroup.name}
                                                                                    </span>
                                                                                </div>
                                                                                {passGroup.isUnlimited ? (
                                                                                    <span className="text-green-600 text-xs font-medium">
                                                                                        ∞ Unlimited
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-500 text-xs">
                                                                                        {passGroup.totalRemaining} visit{passGroup.totalRemaining !== 1 ? 's' : ''} left
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                )}
                                                            </div>
                                                        )
                                                    );
                                                })()}

                                                {child.waiverSigned &&
                                                    child.waiverSignedDate && (
                                                        <p className="text-xs text-gray-500">
                                                            Waiver signed:{" "}
                                                            {new Date(
                                                                child.waiverSignedDate
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Add Child Modal */}
                            {showAddChild && (
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            setShowAddChild(false);
                                            setChildName("");
                                            setChildBirthdate("");
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setShowAddChild(false);
                                            setChildName("");
                                            setChildBirthdate("");
                                        }
                                    }}
                                >
                                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
                                        {/* Close Button */}
                                        <button
                                            onClick={() => {
                                                setShowAddChild(false);
                                                setChildName("");
                                                setChildBirthdate("");
                                            }}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            ✕
                                        </button>

                                        <h3 className="text-lg font-semibold mb-4">
                                            Add New Child
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Child's Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={childName}
                                                    onChange={(e) =>
                                                        setChildName(e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    placeholder="Enter child's full name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Date of Birth
                                                </label>
                                                <input
                                                    type="date"
                                                    value={childBirthdate}
                                                    onChange={(e) =>
                                                        setChildBirthdate(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    max={
                                                        new Date()
                                                            .toISOString()
                                                            .split("T")[0]
                                                    }
                                                />
                                            </div>
                                            {childBirthdate && (
                                                <p className="text-sm text-gray-600">
                                                    Age: {calculateAge(childBirthdate)}{" "}
                                                    years old
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex justify-end space-x-3 mt-6">
                                            <Button
                                                onClick={() => {
                                                    setShowAddChild(false);
                                                    setChildName("");
                                                    setChildBirthdate("");
                                                }}
                                                variant="secondary"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleAddChild}
                                                className="bg-green-500 hover:bg-green-600 text-white"
                                                disabled={
                                                    !childName.trim() ||
                                                    !childBirthdate ||
                                                    isAddingChild
                                                }
                                            >
                                                {isAddingChild
                                                    ? "Adding..."
                                                    : "Add Child"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Waiver Modal */}
                            {showWaiverModal && waiverChild && (
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            setShowWaiverModal(false);
                                            setWaiverChild(null);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setShowWaiverModal(false);
                                            setWaiverChild(null);
                                        }
                                    }}
                                >
                                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
                                        {/* Close Button */}
                                        <button
                                            onClick={() => {
                                                setShowWaiverModal(false);
                                                setWaiverChild(null);
                                            }}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                                        >
                                            ✕
                                        </button>

                                        <h3 className="text-lg font-semibold mb-4">
                                            Waiver for {waiverChild.name}
                                        </h3>
                                        <div className="bg-gray-50 p-4 rounded-lg mb-6 max-h-64 overflow-y-auto">
                                            <h4 className="font-medium mb-2">
                                                LIABILITY WAIVER AND RELEASE
                                            </h4>
                                            <p className="text-sm text-gray-700 mb-2">
                                                I hereby acknowledge that I am the
                                                parent/guardian of {waiverChild.name},
                                                age {waiverChild.age}, and I understand
                                                that participation in activities at Busy
                                                Bees Indoor Playground involves inherent
                                                risks.
                                            </p>
                                            <p className="text-sm text-gray-700 mb-2">
                                                I hereby release, waive, discharge and
                                                covenant not to sue Busy Bees Indoor
                                                Playground, its owners, employees, and
                                                agents from any and all liability,
                                                claims, demands, actions and causes of
                                                action whatsoever arising out of or
                                                related to any loss, damage, or injury
                                                that may be sustained by my child while
                                                participating in activities.
                                            </p>
                                            <p className="text-sm text-gray-700 mb-2">
                                                I acknowledge that I have read and
                                                understood this waiver and that I am
                                                signing it voluntarily. This waiver
                                                shall be binding upon my heirs,
                                                executors, administrators and assigns.
                                            </p>
                                            <p className="text-sm font-medium text-gray-800">
                                                By clicking "I Agree and Sign", I
                                                electronically sign this waiver on
                                                behalf of my child.
                                            </p>
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <Button
                                                onClick={() => {
                                                    setShowWaiverModal(false);
                                                    setWaiverChild(null);
                                                }}
                                                variant="secondary"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    handleSignWaiver(waiverChild)
                                                }
                                                className="bg-green-500 hover:bg-green-600 text-white"
                                                disabled={isSigningWaiver}
                                            >
                                                {isSigningWaiver
                                                    ? "Signing..."
                                                    : "I Agree and Sign"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pass Management */}
                    {activeTab === "passes" && (
                        <div className="space-y-10">
                            {/* Currently Checked In Passes */}
                            {(() => {
                                // Driven by open sessions, not purchase status. Migration
                                // 052 moved the punch deduction from check-out to
                                // check-in, so a single-visit pass (a day pass, or a
                                // punch card on its last punch) now flips to "used" the
                                // instant the child walks in -- before this section ever
                                // filtered on status, that flip would hide the tile and
                                // leave staff with no way to check the child back out. A
                                // purchase with an open session is, by definition,
                                // someone in the building, regardless of what its
                                // remaining-balance status says.
                                const checkedInPasses =
                                    displayCustomer.purchases.filter(
                                        (p) =>
                                            p.type !== "party_package" &&
                                            (displayCustomer.activeSessions || []).some(
                                                (session) => session.purchaseId === p.id
                                            )
                                    );

                                // An account punch card can carry several open
                                // sessions at once -- one per child playing on
                                // it -- so it gets one tile per session, named,
                                // each with its own Check Out. A child-scoped
                                // pass still carries at most one open session
                                // (the available-passes filter hides it the
                                // moment a session opens), so it keeps its
                                // original one-tile-per-purchase behaviour.
                                const checkedInTiles = checkedInPasses.flatMap((purchase) => {
                                    const purchaseSessions = (
                                        displayCustomer.activeSessions || []
                                    ).filter((session) => session.purchaseId === purchase.id);

                                    if (purchase.passScope === "account") {
                                        return purchaseSessions.map((session) => ({
                                            key: session.id,
                                            purchase,
                                            session,
                                            childName: session.childId
                                                ? getChildName(session.childId, displayCustomer)
                                                : null,
                                        }));
                                    }

                                    const session =
                                        purchaseSessions[purchaseSessions.length - 1];
                                    if (!session) return [];
                                    return [
                                        {
                                            key: purchase.id,
                                            purchase,
                                            session,
                                            childName: purchase.childId
                                                ? getChildName(purchase.childId, displayCustomer)
                                                : null,
                                        },
                                    ];
                                });

                                if (checkedInTiles.length > 0) {
                                    return (
                                        <div>
                                            <h3 className="text-2xl font-bold mb-6 text-green-700">
                                                ✅ Currently Checked In
                                            </h3>
                                            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                                                {checkedInTiles.map(
                                                    ({ key, purchase, session, childName }) => {
                                                        return (
                                                            <Card
                                                                key={key}
                                                                className="p-8 border-l-8 border-l-green-500 bg-green-50 hover:bg-green-100 transition-colors min-w-[300px]"
                                                            >
                                                                <div className="flex flex-col items-center text-center space-y-4">
                                                                    <div className="flex-1">
                                                                        <h4 className="text-2xl font-bold text-gray-900 mb-3">
                                                                            {purchase.name}
                                                                        </h4>
                                                                        {childName && (
                                                                            <p className="text-blue-600 font-medium text-lg mb-2">
                                                                                👶{" "}
                                                                                {childName}
                                                                            </p>
                                                                        )}
                                                                        <div className="p-3 bg-green-100 border border-green-300 rounded-lg mb-4">
                                                                            <p className="text-lg text-green-800 font-bold">
                                                                                ✅
                                                                                Checked
                                                                                In
                                                                            </p>
                                                                            <p className="text-sm text-green-700 mt-1">
                                                                                Since{" "}
                                                                                {new Date(
                                                                                    session.startTime
                                                                                ).toLocaleTimeString()}
                                                                            </p>
                                                                            <p className="text-sm text-green-700">
                                                                                Duration:{" "}
                                                                                {getSessionDuration(
                                                                                    session.startTime
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        {/* Expiration & Auto-Renew Info */}
                                                                        {purchase.actualExpiryDate && (
                                                                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                                                                                <p className="text-sm text-gray-600">
                                                                                    Expires:{" "}
                                                                                    {formatDate(
                                                                                        purchase.actualExpiryDate
                                                                                    )}
                                                                                    {purchase.autoRenew && (
                                                                                        <span className="ml-2 text-blue-600 font-bold">
                                                                                            🔄
                                                                                            Auto-Renew
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        onClick={() =>
                                                                            void handleCheckOut(
                                                                                displayCustomer,
                                                                                session.id
                                                                            )
                                                                        }
                                                                        size="lg"
                                                                        variant="outline"
                                                                        className="bg-white hover:bg-gray-50 text-xl px-10 py-5 min-w-[200px] font-bold border-2 border-gray-300"
                                                                    >
                                                                        Check Out
                                                                    </Button>
                                                                </div>
                                                            </Card>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Available Passes (Not Checked In) - GROUPED */}
                            {(() => {
                                const now = new Date();
                                const availablePasses =
                                    displayCustomer.purchases.filter(
                                        (p) =>
                                            p.status === "active" &&
                                            p.type !== "party_package" &&
                                            !(p.actualExpiryDate && new Date(p.actualExpiryDate) < now) &&
                                            // A pass for one child is hidden while that child is
                                            // inside. An account punch card stays available — the
                                            // second and third child still have to get in — and
                                            // double check-ins are stopped per child in the picker.
                                            (p.passScope === 'account' ||
                                                !(displayCustomer.activeSessions || []).some(
                                                    (session) => session.purchaseId === p.id
                                                ))
                                    );

                                // Group passes by type + childId
                                const inferPassType = (name: string, type?: string): string => {
                                    const lowerName = name.toLowerCase();
                                    // Event passes get their own group based on name
                                    if (lowerName.includes('easter egg') || lowerName.includes('egg hunt')) return 'event_easter';
                                    if (type && type !== 'undefined') return type;
                                    if (lowerName.includes('day pass') || lowerName.includes('day_pass')) return 'day_pass';
                                    if (lowerName.includes('punch') || lowerName.includes('weekly')) return 'weekly_pass';
                                    if (lowerName.includes('monthly') || lowerName.includes('membership')) return 'monthly_pass';
                                    if (lowerName.includes('party')) return 'party_package';
                                    return 'day_pass';
                                };

                                const getPassTypeName = (type: string, passName?: string) => {
                                    if (type.startsWith('event_')) {
                                        return passName || 'Event Pass';
                                    }
                                    switch (type) {
                                        case 'day_pass': return 'Day Pass';
                                        case 'weekly_pass': return 'Punch Card';
                                        case 'monthly_pass': return 'Monthly Pass';
                                        case 'party_package': return 'Party Package';
                                        default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    }
                                };

                                const groupedPasses = availablePasses.reduce((acc, purchase) => {
                                    const normalizedType = inferPassType(purchase.name, purchase.type);
                                    const isFamilyPurchase = (purchase.childIds?.length || 0) > 0;

                                    if (purchase.passScope === 'account') {
                                        // One tile for the card, not one per child — who is playing
                                        // is asked after it is tapped.
                                        const key = `${normalizedType}-account-${purchase.id}`;
                                        acc[key] = {
                                            type: normalizedType,
                                            typeName: getPassTypeName(normalizedType, purchase.name),
                                            childId: null,
                                            childName: null,
                                            totalVisits:
                                                (purchase.totalSessions || 0) - (purchase.usedSessions || 0),
                                            isUnlimited: purchase.totalSessions === 999,
                                            purchases: [purchase],
                                            firstPurchase: purchase,
                                        };
                                        return acc;
                                    } else if (isFamilyPurchase) {
                                        // Family pass: create a group entry for each child on the pass
                                        for (const cId of purchase.childIds!) {
                                            const key = `${normalizedType}-${cId}-family-${purchase.id}`;
                                            if (!acc[key]) {
                                                acc[key] = {
                                                    type: normalizedType,
                                                    typeName: getPassTypeName(normalizedType, purchase.name) + ' (Family)',
                                                    childId: cId,
                                                    childName: getChildName(cId, displayCustomer),
                                                    totalVisits: 0,
                                                    isUnlimited: false,
                                                    purchases: [] as typeof availablePasses,
                                                    firstPurchase: purchase,
                                                };
                                            }
                                            const remaining = (purchase.totalSessions || 1) - (purchase.usedSessions || 0);
                                            if (purchase.totalSessions === 999) {
                                                acc[key].isUnlimited = true;
                                            }
                                            acc[key].totalVisits += remaining;
                                            acc[key].purchases.push(purchase);
                                        }
                                    } else {
                                        // Single-child pass: group by type + childId
                                        const key = `${normalizedType}-${purchase.childId || 'no-child'}`;
                                        if (!acc[key]) {
                                            acc[key] = {
                                                type: normalizedType,
                                                typeName: getPassTypeName(normalizedType, purchase.name),
                                                childId: purchase.childId,
                                                childName: purchase.childId ? getChildName(purchase.childId, displayCustomer) : null,
                                                totalVisits: 0,
                                                isUnlimited: false,
                                                purchases: [] as typeof availablePasses,
                                                firstPurchase: purchase,
                                            };
                                        }
                                        const remaining = (purchase.totalSessions || 1) - (purchase.usedSessions || 0);
                                        if (purchase.totalSessions === 999) {
                                            acc[key].isUnlimited = true;
                                        }
                                        acc[key].totalVisits += remaining;
                                        acc[key].purchases.push(purchase);
                                    }
                                    return acc;
                                }, {} as Record<string, { type: string; typeName: string; childId: string | null; childName: string | null; totalVisits: number; isUnlimited: boolean; purchases: typeof availablePasses; firstPurchase: typeof availablePasses[0] }>);

                                const groupedPassesList = Object.values(groupedPasses);

                                return (
                                    <div>
                                        <h3 className="text-2xl font-bold mb-6">
                                            🎫 Available Passes
                                        </h3>
                                        {groupedPassesList.length > 0 ? (
                                            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                                                {groupedPassesList.map((group) => {
                                                    // Use first purchase for check-in logic
                                                    const purchase = group.firstPurchase;
                                                    return (
                                                    <Card
                                                        // Two account cards of the same inferred
                                                        // type (e.g. a 5-punch and a 10-punch both
                                                        // read as "weekly_pass") both set childId
                                                        // to null, so the key needs the purchase
                                                        // id too or they'd collide.
                                                        key={`${group.type}-${group.childId ?? "none"}-${group.firstPurchase.id}`}
                                                        className="p-8 border-l-8 border-l-blue-400 hover:bg-blue-50 transition-colors cursor-pointer min-w-[300px]"
                                                    >
                                                        <div className="flex flex-col items-center text-center space-y-4">
                                                            <div className="flex-1">
                                                                <h4 className="text-2xl font-bold text-gray-900 mb-3">
                                                                    {!group.isUnlimited && group.totalVisits > 1 && (
                                                                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-lg mr-2">
                                                                            {group.totalVisits}x
                                                                        </span>
                                                                    )}
                                                                    {group.typeName}
                                                                </h4>
                                                                {group.childName ? (
                                                                    <p className="text-green-600 font-medium text-lg mb-3">
                                                                        👶 {group.childName}
                                                                    </p>
                                                                ) : group.firstPurchase.passScope === 'account' ? (
                                                                    <p className="text-green-600 font-medium text-lg mb-3">
                                                                        👨‍👩‍👧‍👦 Any child on the account
                                                                    </p>
                                                                ) : null}
                                                                {purchase.type ===
                                                                    "party_package" &&
                                                                purchase.partyDate ? (
                                                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                                        <p className="text-lg text-purple-700 font-bold mb-2">
                                                                            🎉 Party
                                                                            Scheduled
                                                                        </p>
                                                                        <p className="text-sm text-purple-600 mb-1">
                                                                            📅{" "}
                                                                            {formatDate(
                                                                                purchase.partyDate
                                                                            )}
                                                                        </p>
                                                                        {purchase.partyStartTime && (
                                                                            <p className="text-sm text-purple-600 mb-1">
                                                                                ⏰{" "}
                                                                                {(() => {
                                                                                    const [
                                                                                        hours,
                                                                                        minutes,
                                                                                    ] =
                                                                                        purchase.partyStartTime.split(
                                                                                            ":"
                                                                                        );
                                                                                    const hour =
                                                                                        parseInt(
                                                                                            hours
                                                                                        );
                                                                                    const ampm =
                                                                                        hour >=
                                                                                        12
                                                                                            ? "PM"
                                                                                            : "AM";
                                                                                    const displayHour =
                                                                                        hour >
                                                                                        12
                                                                                            ? hour -
                                                                                              12
                                                                                            : hour ===
                                                                                              0
                                                                                            ? 12
                                                                                            : hour;
                                                                                    return `${displayHour}:${minutes} ${ampm}`;
                                                                                })()}
                                                                                {purchase.partyEndTime &&
                                                                                    ` - ${(() => {
                                                                                        const [
                                                                                            hours,
                                                                                            minutes,
                                                                                        ] =
                                                                                            purchase.partyEndTime.split(
                                                                                                ":"
                                                                                            );
                                                                                        const hour =
                                                                                            parseInt(
                                                                                                hours
                                                                                            );
                                                                                        const ampm =
                                                                                            hour >=
                                                                                            12
                                                                                                ? "PM"
                                                                                                : "AM";
                                                                                        const displayHour =
                                                                                            hour >
                                                                                            12
                                                                                                ? hour -
                                                                                                  12
                                                                                                : hour ===
                                                                                                  0
                                                                                                ? 12
                                                                                                : hour;
                                                                                        return `${displayHour}:${minutes} ${ampm}`;
                                                                                    })()}`}
                                                                            </p>
                                                                        )}
                                                                        {purchase.partyGuests && (
                                                                            <p className="text-sm text-purple-600">
                                                                                👥{" "}
                                                                                {
                                                                                    purchase.partyGuests
                                                                                }{" "}
                                                                                guests
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : !purchase.firstUseDate ? (
                                                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                        <p className="text-lg text-blue-600 font-bold">
                                                                            ✨ Ready to
                                                                            Use!
                                                                        </p>
                                                                        {purchase.autoRenew && (
                                                                            <p className="text-sm text-blue-600 mt-1">
                                                                                🔄
                                                                                Auto-Renew
                                                                                enabled
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                                        <p className="text-lg text-green-600 font-bold">
                                                                            ✅ Active
                                                                            Pass
                                                                        </p>
                                                                        {purchase.actualExpiryDate && (
                                                                            <p className="text-sm text-green-600 mt-1">
                                                                                Expires:{" "}
                                                                                {formatDate(
                                                                                    purchase.actualExpiryDate
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                        {purchase.autoRenew && (
                                                                            <p className="text-sm text-green-600 mt-1">
                                                                                🔄
                                                                                Auto-Renew
                                                                                enabled
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(() => {
                                                                if (
                                                                    purchase.type ===
                                                                    "party_package"
                                                                ) {
                                                                    const partyStatus =
                                                                        getPartyCheckInStatus(
                                                                            purchase
                                                                        );

                                                                    if (
                                                                        partyStatus ===
                                                                        "needs_scheduling"
                                                                    ) {
                                                                        return (
                                                                            <Button
                                                                                onClick={() =>
                                                                                    handleUsePassClick(
                                                                                        displayCustomer,
                                                                                        purchase.id
                                                                                    )
                                                                                }
                                                                                size="lg"
                                                                                className="text-xl px-10 py-5 min-w-[200px] bg-purple-600 hover:bg-purple-700 font-bold"
                                                                            >
                                                                                🗓️ Need
                                                                                Scheduling
                                                                            </Button>
                                                                        );
                                                                    } else if (
                                                                        partyStatus ===
                                                                        "available"
                                                                    ) {
                                                                        return (
                                                                            <Button
                                                                                onClick={() => {
                                                                                    if (
                                                                                        confirmingCheckIn ===
                                                                                        purchase.id
                                                                                    ) {
                                                                                        handleConfirmCheckIn(
                                                                                            purchase.id
                                                                                        );
                                                                                    } else {
                                                                                        handleCheckInClick(
                                                                                            purchase.id
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                size="lg"
                                                                                className={`text-xl px-10 py-5 min-w-[200px] font-bold transition-colors ${
                                                                                    confirmingCheckIn ===
                                                                                    purchase.id
                                                                                        ? "bg-green-600 hover:bg-green-700 animate-pulse"
                                                                                        : "bg-green-600 hover:bg-green-700"
                                                                                }`}
                                                                            >
                                                                                {confirmingCheckIn ===
                                                                                purchase.id
                                                                                    ? "✓ Confirm Check In"
                                                                                    : "🎉 Check In Party"}
                                                                            </Button>
                                                                        );
                                                                    } else if (
                                                                        partyStatus?.startsWith(
                                                                            "too_early"
                                                                        )
                                                                    ) {
                                                                        const [
                                                                            type,
                                                                            value,
                                                                        ] =
                                                                            partyStatus.split(
                                                                                ":"
                                                                            );
                                                                        const timeText =
                                                                            type ===
                                                                            "too_early_days"
                                                                                ? `${value} day${
                                                                                      value !==
                                                                                      "1"
                                                                                          ? "s"
                                                                                          : ""
                                                                                  }`
                                                                                : type ===
                                                                                  "too_early_hours"
                                                                                ? `${value} hour${
                                                                                      value !==
                                                                                      "1"
                                                                                          ? "s"
                                                                                          : ""
                                                                                  }`
                                                                                : `${value} minute${
                                                                                      value !==
                                                                                      "1"
                                                                                          ? "s"
                                                                                          : ""
                                                                                  }`;

                                                                        return (
                                                                            <Button
                                                                                onClick={() =>
                                                                                    handleUsePassClick(
                                                                                        displayCustomer,
                                                                                        purchase.id
                                                                                    )
                                                                                }
                                                                                size="lg"
                                                                                className="text-xl px-8 py-5 min-w-[200px] bg-orange-500 hover:bg-orange-600 font-bold"
                                                                                disabled={
                                                                                    false
                                                                                }
                                                                            >
                                                                                ⏰ In{" "}
                                                                                {
                                                                                    timeText
                                                                                }
                                                                            </Button>
                                                                        );
                                                                    } else if (
                                                                        partyStatus ===
                                                                        "expired"
                                                                    ) {
                                                                        return (
                                                                            <Button
                                                                                disabled
                                                                                size="lg"
                                                                                className="text-xl px-10 py-5 min-w-[200px] bg-gray-400 cursor-not-allowed font-bold"
                                                                            >
                                                                                ❌
                                                                                Window
                                                                                Closed
                                                                            </Button>
                                                                        );
                                                                    }
                                                                }

                                                                return (
                                                                    <div className="flex items-center space-x-4">
                                                                        <Button
                                                                            onClick={() => {
                                                                                if (
                                                                                    purchase.passScope ===
                                                                                    'account'
                                                                                ) {
                                                                                    // Account cards ask who's playing
                                                                                    // instead of checking in directly.
                                                                                    setPunchCardCheckIn(
                                                                                        purchase.id
                                                                                    );
                                                                                } else if (
                                                                                    confirmingCheckIn ===
                                                                                    purchase.id
                                                                                ) {
                                                                                    handleConfirmCheckIn(
                                                                                        purchase.id
                                                                                    );
                                                                                } else {
                                                                                    handleCheckInClick(
                                                                                        purchase.id
                                                                                    );
                                                                                }
                                                                            }}
                                                                            size="lg"
                                                                            className={`text-xl px-10 py-5 min-w-[200px] font-bold transition-colors ${
                                                                                confirmingCheckIn ===
                                                                                purchase.id
                                                                                    ? "bg-green-600 hover:bg-green-700 animate-pulse"
                                                                                    : "bg-blue-600 hover:bg-blue-700"
                                                                            }`}
                                                                        >
                                                                            {confirmingCheckIn ===
                                                                            purchase.id
                                                                                ? "✓ Confirm Check In"
                                                                                : "Check In"}
                                                                        </Button>

                                                                        {/* Auto-Renew Toggle for Weekly/Monthly Passes */}
                                                                        {(purchase.type ===
                                                                            "weekly_pass" ||
                                                                            purchase.type ===
                                                                                "monthly_pass") && (
                                                                            <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={
                                                                                            purchase.autoRenew ||
                                                                                            false
                                                                                        }
                                                                                        onChange={() =>
                                                                                            handleAutoRenewToggle(
                                                                                                purchase.id,
                                                                                                purchase.autoRenew ||
                                                                                                    false
                                                                                            )
                                                                                        }
                                                                                        className="sr-only"
                                                                                    />
                                                                                    <div
                                                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 border-2 ${
                                                                                            purchase.autoRenew
                                                                                                ? "bg-yellow-500 border-yellow-400 shadow-sm"
                                                                                                : "bg-gray-200 border-gray-300 hover:border-gray-400"
                                                                                        }`}
                                                                                    >
                                                                                        <span
                                                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                                                                                                purchase.autoRenew
                                                                                                    ? "translate-x-6"
                                                                                                    : "translate-x-1"
                                                                                            }`}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-sm font-medium text-gray-700 select-none">
                                                                                        Auto-Renew
                                                                                    </span>
                                                                                </label>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </Card>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-3xl">🎫</span>
                                                </div>
                                                <h4 className="text-xl font-bold mb-2">
                                                    No Available Passes
                                                </h4>
                                                <p className="text-gray-600 mb-4">
                                                    Purchase passes below to get
                                                    started!
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Quick Purchase Passes - Always Visible */}
                            <div>
                                <h3 className="text-2xl font-bold mb-6">
                                    🛒 Purchase New Passes
                                </h3>

                                {/* Pass Filter Tabs */}
                                <div className="flex space-x-2 mb-4">
                                    <button
                                        onClick={() => setPassFilter("all")}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            passFilter === "all"
                                                ? "bg-green-600 text-white"
                                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        All ({availablePasses.length})
                                    </button>
                                    <button
                                        onClick={() => setPassFilter("infant")}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            passFilter === "infant"
                                                ? "bg-green-600 text-white"
                                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        Infant (
                                        {
                                            availablePasses.filter((p) =>
                                                p.name.toLowerCase().includes("infant")
                                            ).length
                                        }
                                        )
                                    </button>
                                    <button
                                        onClick={() => setPassFilter("toddler")}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            passFilter === "toddler"
                                                ? "bg-green-600 text-white"
                                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        Toddler (
                                        {
                                            availablePasses.filter((p) =>
                                                p.name.toLowerCase().includes("toddler")
                                            ).length
                                        }
                                        )
                                    </button>
                                </div>

                                {/* Child Selection Required */}
                                {displayCustomer.children.length === 0 && (
                                    <Card className="p-6 mb-4 border-blue-200 bg-blue-50">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-white">👶</span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-blue-800">
                                                    Children Required
                                                </h4>
                                                <p className="text-blue-600 text-sm">
                                                    This customer needs to add children
                                                    with signed waivers before
                                                    purchasing passes.
                                                    <br />
                                                    <strong>💡 Tip:</strong> Have them
                                                    use their own device to add children
                                                    in the customer dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <Card className="p-6 border-l-8 border-l-green-300 bg-green-50">
                                    <div className="grid gap-4 text-left">
                                        {AVAILABLE_PASS_PRODUCTS.map((product) => (
                                            <div
                                                key={product.id}
                                                className="flex justify-between items-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900 text-lg">
                                                        {product.id === "day_pass"
                                                            ? "🎫"
                                                            : product.id ===
                                                              "weekly_pass"
                                                            ? "📅"
                                                            : "🗓️"}{" "}
                                                        {product.name}
                                                    </span>
                                                    <p className="text-sm text-gray-600">
                                                        {product.description}
                                                    </p>
                                                    <div className="text-lg font-bold text-gray-900 mt-1">
                                                        ${product.price.toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* Apply Coupon — single day passes only (Infant / Toddler / Combo).
                                                    Excludes punch cards even if they share category='day'. */}
                                                {product.name.toLowerCase().startsWith('day pass') && (
                                                    <div className="mr-4 min-w-[200px]">
                                                        {appliedCoupons[product.id] ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-sm font-medium text-green-700">
                                                                    ✓ {appliedCoupons[product.id].name || appliedCoupons[product.id].code}
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    {appliedCoupons[product.id].discountType === 'percent'
                                                                        ? `−$${appliedCoupons[product.id].applied.toFixed(2)} off`
                                                                        : `−$${appliedCoupons[product.id].applied.toFixed(2)}`}
                                                                    {appliedCoupons[product.id].forfeited > 0 && (
                                                                        <span className="text-amber-600 ml-1">
                                                                            (${appliedCoupons[product.id].forfeited.toFixed(2)} forfeited)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCoupon(product.id)}
                                                                    className="text-xs text-red-600 hover:underline self-start"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={couponInputs[product.id] || ''}
                                                                        onChange={e =>
                                                                            setCouponInputs(prev => ({ ...prev, [product.id]: e.target.value }))
                                                                        }
                                                                        placeholder="Coupon"
                                                                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded font-mono uppercase"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApplyCoupon(product.id, product.price)}
                                                                        disabled={couponLoading[product.id]}
                                                                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                                                    >
                                                                        {couponLoading[product.id] ? '...' : 'Apply'}
                                                                    </button>
                                                                </div>
                                                                {couponErrors[product.id] && (
                                                                    <div className="text-xs text-red-600">
                                                                        {couponErrors[product.id]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (!customer) return;

                                                        // Step 1: Add Child (highest priority)
                                                        if (
                                                            customer.children.length ===
                                                            0
                                                        ) {
                                                            setActiveTab("children");
                                                            return;
                                                        }

                                                        // Step 2: Add Payment Method
                                                        if (
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            // Show payment modal instead of alert
                                                            setShowPaymentModal(true);
                                                            return;
                                                        }

                                                        // Step 3: Show Child Selection Modal
                                                        if (
                                                            confirmingProduct ===
                                                            product.id
                                                        ) {
                                                            handleConfirmPurchase(
                                                                product.id
                                                            );
                                                        } else {
                                                            // Show child selection modal
                                                            setSelectedProductForPurchase(
                                                                product.id
                                                            );
                                                            setSelectedChildrenForFamilyPass([]);
                                                            setComboChildId(null);
                                                            setComboInfantId(null);
                                                            setShowChildSelectionModal(
                                                                true
                                                            );
                                                        }
                                                    }}
                                                    size="lg"
                                                    disabled={
                                                        purchasingProduct ===
                                                        product.id
                                                    }
                                                    className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${(() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (!customer)
                                                            return "bg-gray-400";

                                                        if (
                                                            customer.children.length ===
                                                            0
                                                        ) {
                                                            return "bg-blue-500 hover:bg-blue-600";
                                                        }
                                                        if (
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            return "bg-yellow-500 hover:bg-yellow-600";
                                                        }
                                                        return confirmingProduct ===
                                                            product.id
                                                            ? "bg-green-600 hover:bg-green-700 animate-pulse"
                                                            : purchasingProduct ===
                                                              product.id
                                                            ? "bg-blue-600"
                                                            : "bg-green-600 hover:bg-green-700";
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (!customer)
                                                            return "No Customer";

                                                        if (
                                                            customer.children.length ===
                                                            0
                                                        ) {
                                                            return "👶 Add Child First";
                                                        }
                                                        if (
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            return "💳 Add Payment First";
                                                        }
                                                        return purchasingProduct ===
                                                            product.id
                                                            ? "Processing..."
                                                            : confirmingProduct ===
                                                              product.id
                                                            ? "✓ Confirm Purchase"
                                                            : "Buy Now";
                                                    })()}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Party Management */}
                    {activeTab === "parties" && (
                        <div className="space-y-10">
                            {/* Party Packages */}
                            {(() => {
                                const partyPackages = displayCustomer.purchases.filter(
                                    (p) =>
                                        p.status === "active" &&
                                        p.type === "party_package"
                                );

                                return (
                                    <div>
                                        <h3 className="text-2xl font-bold mb-6">
                                            🎉 Your Party Packages
                                        </h3>
                                        {partyPackages.length > 0 ? (
                                            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                                                {partyPackages.map((purchase) => (
                                                    <Card
                                                        key={purchase.id}
                                                        className="p-8 border-l-8 border-l-purple-400 hover:bg-purple-50 transition-colors cursor-pointer min-w-[300px]"
                                                    >
                                                        <div className="flex flex-col items-center text-center space-y-4">
                                                            <div className="flex-1">
                                                                <h4 className="text-2xl font-bold text-gray-900 mb-3">
                                                                    {purchase.name}
                                                                </h4>
                                                                {purchase.partyDate ? (
                                                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                                        <p className="text-lg text-purple-700 font-bold mb-2">
                                                                            🎉 Party
                                                                            Scheduled
                                                                        </p>
                                                                        <p className="text-sm text-purple-600 mb-1">
                                                                            📅{" "}
                                                                            {formatDate(
                                                                                purchase.partyDate
                                                                            )}
                                                                        </p>
                                                                        {purchase.partyStartTime && (
                                                                            <p className="text-sm text-purple-600 mb-1">
                                                                                ⏰{" "}
                                                                                {(() => {
                                                                                    const [
                                                                                        hours,
                                                                                        minutes,
                                                                                    ] =
                                                                                        purchase.partyStartTime.split(
                                                                                            ":"
                                                                                        );
                                                                                    const hour =
                                                                                        parseInt(
                                                                                            hours
                                                                                        );
                                                                                    const ampm =
                                                                                        hour >=
                                                                                        12
                                                                                            ? "PM"
                                                                                            : "AM";
                                                                                    const displayHour =
                                                                                        hour >
                                                                                        12
                                                                                            ? hour -
                                                                                              12
                                                                                            : hour ===
                                                                                              0
                                                                                            ? 12
                                                                                            : hour;
                                                                                    return `${displayHour}:${minutes} ${ampm}`;
                                                                                })()}
                                                                                {purchase.partyEndTime &&
                                                                                    ` - ${(() => {
                                                                                        const [
                                                                                            hours,
                                                                                            minutes,
                                                                                        ] =
                                                                                            purchase.partyEndTime.split(
                                                                                                ":"
                                                                                            );
                                                                                        const hour =
                                                                                            parseInt(
                                                                                                hours
                                                                                            );
                                                                                        const ampm =
                                                                                            hour >=
                                                                                            12
                                                                                                ? "PM"
                                                                                                : "AM";
                                                                                        const displayHour =
                                                                                            hour >
                                                                                            12
                                                                                                ? hour -
                                                                                                  12
                                                                                                : hour ===
                                                                                                  0
                                                                                                ? 12
                                                                                                : hour;
                                                                                        return `${displayHour}:${minutes} ${ampm}`;
                                                                                    })()}`}
                                                                            </p>
                                                                        )}
                                                                        {purchase.partyGuests && (
                                                                            <p className="text-sm text-purple-600">
                                                                                👥{" "}
                                                                                {
                                                                                    purchase.partyGuests
                                                                                }{" "}
                                                                                guests
                                                                            </p>
                                                                        )}
                                                                        <p className="text-sm text-purple-600 mt-2">
                                                                            💰 $
                                                                            {purchase.price.toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                                                        <p className="text-lg text-orange-700 font-bold">
                                                                            🗓️ Ready to
                                                                            Schedule!
                                                                        </p>
                                                                        <p className="text-sm text-orange-600 mt-1">
                                                                            Click to
                                                                            schedule
                                                                            your party
                                                                        </p>
                                                                        <p className="text-sm text-orange-600 mt-2">
                                                                            💰 $
                                                                            {purchase.price.toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(() => {
                                                                const partyStatus =
                                                                    getPartyCheckInStatus(
                                                                        purchase
                                                                    );

                                                                if (
                                                                    partyStatus ===
                                                                    "needs_scheduling"
                                                                ) {
                                                                    return (
                                                                        <Button
                                                                            onClick={() =>
                                                                                handleUsePassClick(
                                                                                    displayCustomer,
                                                                                    purchase.id
                                                                                )
                                                                            }
                                                                            size="lg"
                                                                            className="text-xl px-10 py-5 min-w-[200px] bg-purple-600 hover:bg-purple-700 font-bold"
                                                                        >
                                                                            🗓️ Schedule
                                                                            Party
                                                                        </Button>
                                                                    );
                                                                } else if (
                                                                    partyStatus ===
                                                                    "available"
                                                                ) {
                                                                    return (
                                                                        <Button
                                                                            onClick={() =>
                                                                                handleUsePassClick(
                                                                                    displayCustomer,
                                                                                    purchase.id
                                                                                )
                                                                            }
                                                                            size="lg"
                                                                            className="text-xl px-10 py-5 min-w-[200px] bg-green-600 hover:bg-green-700 font-bold"
                                                                        >
                                                                            🎉 Check In
                                                                            Party
                                                                        </Button>
                                                                    );
                                                                } else if (
                                                                    partyStatus?.startsWith(
                                                                        "too_early"
                                                                    )
                                                                ) {
                                                                    const [
                                                                        type,
                                                                        value,
                                                                    ] =
                                                                        partyStatus.split(
                                                                            ":"
                                                                        );
                                                                    const timeText =
                                                                        type ===
                                                                        "too_early_days"
                                                                            ? `${value} day${
                                                                                  value !==
                                                                                  "1"
                                                                                      ? "s"
                                                                                      : ""
                                                                              }`
                                                                            : type ===
                                                                              "too_early_hours"
                                                                            ? `${value} hour${
                                                                                  value !==
                                                                                  "1"
                                                                                      ? "s"
                                                                                      : ""
                                                                              }`
                                                                            : `${value} minute${
                                                                                  value !==
                                                                                  "1"
                                                                                      ? "s"
                                                                                      : ""
                                                                              }`;

                                                                    return (
                                                                        <Button
                                                                            onClick={() =>
                                                                                handleUsePassClick(
                                                                                    displayCustomer,
                                                                                    purchase.id
                                                                                )
                                                                            }
                                                                            size="lg"
                                                                            className="text-xl px-8 py-5 min-w-[200px] bg-orange-500 hover:bg-orange-600 font-bold"
                                                                            disabled={
                                                                                false
                                                                            }
                                                                        >
                                                                            ⏰ In{" "}
                                                                            {timeText}
                                                                        </Button>
                                                                    );
                                                                } else if (
                                                                    partyStatus ===
                                                                    "expired"
                                                                ) {
                                                                    return (
                                                                        <Button
                                                                            disabled
                                                                            size="lg"
                                                                            className="text-xl px-10 py-5 min-w-[200px] bg-gray-400 cursor-not-allowed font-bold"
                                                                        >
                                                                            ❌ Window
                                                                            Closed
                                                                        </Button>
                                                                    );
                                                                }

                                                                return (
                                                                    <Button
                                                                        onClick={() =>
                                                                            handleUsePassClick(
                                                                                displayCustomer,
                                                                                purchase.id
                                                                            )
                                                                        }
                                                                        size="lg"
                                                                        className="text-xl px-10 py-5 min-w-[200px] bg-purple-600 hover:bg-purple-700 font-bold"
                                                                    >
                                                                        View Details
                                                                    </Button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-3xl">🎉</span>
                                                </div>
                                                <h4 className="text-xl font-bold mb-2">
                                                    No Party Packages
                                                </h4>
                                                <p className="text-gray-600 mb-4">
                                                    Parties are booked on the website. Once
                                                    a package is purchased it appears here
                                                    to schedule.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </div>
                    )}

                    {/* Snacks & Drinks Management */}
                    {activeTab === "snacks" && (
                        <div className="space-y-10">
                            {/* Recent Snack Purchases */}
                            {(() => {
                                const snackPurchases = displayCustomer.purchases.filter(
                                    (p) => p.type === "food_beverage"
                                );

                                return snackPurchases.length > 0 ? (
                                    <div>
                                        <h3 className="text-2xl font-bold mb-6">
                                            🍿 Recent Snack Purchases
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {snackPurchases
                                                .slice(0, 6)
                                                .map((purchase) => (
                                                    <Card
                                                        key={purchase.id}
                                                        className="p-6 border-l-8 border-l-orange-400"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-lg font-bold text-gray-900">
                                                                    {purchase.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {formatDate(
                                                                        purchase.purchaseDate
                                                                    )}
                                                                </p>
                                                                <p className="text-lg font-bold text-orange-600 mt-2">
                                                                    $
                                                                    {purchase.price.toFixed(
                                                                        2
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Purchase Snacks & Drinks */}
                            <div>
                                <h3 className="text-2xl font-bold mb-6">
                                    🛒 Purchase Snacks & Drinks
                                </h3>
                                <Card className="p-6 border-l-8 border-l-orange-300 bg-orange-50">
                                    <div className="grid gap-4 text-left">
                                        {AVAILABLE_SNACKS.map((snack) => {
                                            const isSoldOut = snack.quantityOnHand !== null && snack.quantityOnHand !== undefined && snack.quantityOnHand <= 0;
                                            const isLowStock = snack.quantityOnHand !== null && snack.quantityOnHand !== undefined && snack.quantityOnHand > 0 && snack.quantityOnHand <= (snack.lowStockThreshold ?? 5);
                                            return (
                                            <div
                                                key={snack.id}
                                                className={`flex justify-between items-center p-4 bg-white rounded-lg border transition-shadow ${isSoldOut ? 'opacity-60' : 'hover:shadow-md'}`}
                                            >
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900 text-lg">
                                                        {snack.emoji} {snack.name}
                                                    </span>
                                                    {isSoldOut && (
                                                        <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold">SOLD OUT</span>
                                                    )}
                                                    {isLowStock && (
                                                        <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">Only {snack.quantityOnHand} left</span>
                                                    )}
                                                    <p className="text-sm text-gray-600">
                                                        {snack.description}
                                                    </p>
                                                    {isActiveMember ? (
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            <span className="line-through text-gray-400 font-normal text-base mr-2">
                                                                ${snack.price.toFixed(2)}
                                                            </span>
                                                            ${applyMemberDiscount(snack.price, true).toFixed(2)}
                                                            <span className="ml-2 text-xs font-semibold text-amber-700">
                                                                member
                                                            </span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            ${snack.price.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center space-x-3 mr-4">
                                                    <button
                                                        onClick={() =>
                                                            decreaseQuantity(snack.id)
                                                        }
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={
                                                            isSoldOut ||
                                                            (quantities[snack.id] ||
                                                                0) <= 0
                                                        }
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-8 text-center font-semibold text-lg">
                                                        {quantities[snack.id] || 0}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            increaseQuantity(snack.id)
                                                        }
                                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={
                                                            isSoldOut ||
                                                            (quantities[snack.id] ||
                                                                0) >= 10
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <Button
                                                    onClick={() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (
                                                            customer &&
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            // Show payment modal instead of alert
                                                            setShowPaymentModal(true);
                                                            return;
                                                        }

                                                        if (
                                                            confirmingProduct ===
                                                            snack.id
                                                        ) {
                                                            handleConfirmPurchase(
                                                                snack.id
                                                            );
                                                        } else {
                                                            handleQuickPurchase(
                                                                snack.id
                                                            );
                                                        }
                                                    }}
                                                    size="lg"
                                                    disabled={
                                                        isSoldOut ||
                                                        purchasingProduct ===
                                                            snack.id ||
                                                        (quantities[snack.id] || 0) <= 0
                                                    }
                                                    className={`px-6 py-3 text-white disabled:opacity-50 transition-colors ${(() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (
                                                            customer &&
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            return "bg-yellow-500 hover:bg-yellow-600";
                                                        }
                                                        return confirmingProduct ===
                                                            snack.id
                                                            ? "bg-orange-600 hover:bg-orange-700 animate-pulse"
                                                            : purchasingProduct ===
                                                              snack.id
                                                            ? "bg-orange-500"
                                                            : "bg-orange-600 hover:bg-orange-700";
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const customer =
                                                            selectedCustomer ||
                                                            currentCustomer;
                                                        if (
                                                            customer &&
                                                            customer.savedCards
                                                                .length === 0
                                                        ) {
                                                            return "💳 Add Payment First";
                                                        }
                                                        return purchasingProduct ===
                                                            snack.id
                                                            ? "Processing..."
                                                            : confirmingProduct ===
                                                              snack.id
                                                            ? "✓ Confirm Purchase"
                                                            : "Buy Now";
                                                    })()}
                                                </Button>
                                            </div>
                                        );
                                        })}
                                    </div>

                                    <div className="mt-6 p-4 bg-white border border-orange-200 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">
                                                💡 Quick Purchase:
                                            </span>{" "}
                                            No child association required! Snacks can be
                                            purchased independently at any time.
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Customer Details (Staff Mode) */}
                    {isStaffMode && showCustomerDetails && (
                        <Card className="p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                Customer Details
                            </h3>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Purchase History */}
                                <div>
                                    <h4 className="font-semibold mb-3">
                                        Purchase History
                                    </h4>
                                    {displayCustomer.purchases.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {displayCustomer.purchases.map(
                                                (purchase) => (
                                                    <div
                                                        key={purchase.id}
                                                        className="p-3 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-sm">
                                                                    {purchase.name}
                                                                </p>
                                                                {purchase.childId && (
                                                                    <p className="text-xs text-green-600 font-medium">
                                                                        👶{" "}
                                                                        {getChildName(
                                                                            purchase.childId,
                                                                            displayCustomer
                                                                        )}
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-gray-600">
                                                                    {formatDate(
                                                                        purchase.purchaseDate
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium">
                                                                    ${purchase.price}
                                                                </p>
                                                                <span
                                                                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                                                        purchase.status ===
                                                                        "active"
                                                                            ? "bg-green-100 text-green-800"
                                                                            : purchase.status ===
                                                                              "used"
                                                                            ? "bg-gray-100 text-gray-800"
                                                                            : "bg-red-100 text-red-800"
                                                                    }`}
                                                                >
                                                                    {purchase.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {purchase.status ===
                                                            "active" && (
                                                            <div className="mt-2 text-xs text-gray-600">
                                                                {purchase.totalSessions ===
                                                                999
                                                                    ? `${purchase.usedSessions} visits used`
                                                                    : `${purchase.usedSessions}/${purchase.totalSessions} visits used`}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">
                                            No purchases yet
                                        </p>
                                    )}
                                </div>

                                {/* Payment Methods */}
                                <div>
                                    <h4 className="font-semibold mb-3">
                                        Payment Methods
                                    </h4>
                                    {displayCustomer.savedCards.length > 0 ? (
                                        <div className="space-y-2">
                                            {displayCustomer.savedCards.map((card) => (
                                                <div
                                                    key={card.id}
                                                    className="p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-8 h-5 bg-gray-300 rounded flex items-center justify-center">
                                                                <span className="text-xs font-medium">
                                                                    {card.brand
                                                                        .slice(0, 2)
                                                                        .toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm">
                                                                •••• {card.last4}
                                                            </span>
                                                        </div>
                                                        {card.isDefault && (
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                                Default
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">
                                            No saved payment methods
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Complimentary Pass Section (Staff Only) */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-semibold mb-3 flex items-center">
                                    <span className="text-xl mr-2">🎁</span>
                                    Issue Complimentary Pass
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Issue a free pass for raffle winners, promotions, or customer service.
                                </p>
                                <Button
                                    onClick={() => setShowComplimentaryModal(true)}
                                    disabled={displayCustomer.children.filter(c => c.waiverSigned).length === 0}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 disabled:opacity-50"
                                >
                                    {displayCustomer.children.filter(c => c.waiverSigned).length === 0
                                        ? "Add Child with Waiver First"
                                        : "Issue Complimentary Pass"}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* After Dark Tab — staff books on behalf of customer */}
                    {activeTab === "afterdark" && (() => {
                        const defaultCard =
                            displayCustomer.savedCards.find((c) => c.isDefault) ||
                            displayCustomer.savedCards[0];
                        const eligibleChildren = displayCustomer.children.filter(
                            (c) => c.age >= 3 && c.age <= 18
                        );
                        const selectedEvt = afterDarkBookingDate
                            ? afterDarkEvents.find((e) => e.date === afterDarkBookingDate)
                            : null;
                        const numKids = afterDarkSelectedChildren.length;
                        const totalPrice = numKids * 50;
                        const kidDetailsPreview = afterDarkSelectedChildren
                            .map((id) => {
                                const ch = displayCustomer.children.find((c) => c.id === id);
                                return ch ? `${ch.name} (${ch.age})` : "";
                            })
                            .filter(Boolean)
                            .join(", ");

                        const toggleAfterDarkChild = (childId: string) => {
                            setAfterDarkSelectedChildren((prev) => {
                                const next = prev.includes(childId)
                                    ? prev.filter((id) => id !== childId)
                                    : [...prev, childId];
                                if (selectedEvt && next.length > selectedEvt.remaining) {
                                    return prev;
                                }
                                return next;
                            });
                        };

                        return (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold">🌙 Book After Dark</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            $50/kid · ages 3+ · Friday 5–7:30pm
                                        </p>
                                    </div>
                                    {afterDarkStep === "select" && (
                                        <Button
                                            onClick={fetchAfterDarkAvailability}
                                            variant="outline"
                                            disabled={afterDarkLoading}
                                        >
                                            {afterDarkLoading ? "⏳" : "🔄"} Refresh
                                        </Button>
                                    )}
                                </div>

                                {!defaultCard ? (
                                    <Card className="p-6 bg-yellow-50 border-yellow-200">
                                        <p className="text-yellow-900 font-medium">
                                            ⚠️ No saved card on file for {displayCustomer.name}.
                                        </p>
                                        <p className="text-sm text-yellow-800 mt-1">
                                            Add a payment method before booking — the customer's
                                            saved card is required for the off-session charge.
                                        </p>
                                    </Card>
                                ) : (
                                    <Card className="p-4 bg-indigo-50 border-indigo-200">
                                        <p className="text-sm text-indigo-900">
                                            Will charge{" "}
                                            <span className="font-semibold">
                                                {defaultCard.brand} •••• {defaultCard.last4}
                                            </span>{" "}
                                            (default card). Change it from the card dropdown in the
                                            header to use a different one.
                                        </p>
                                    </Card>
                                )}

                                {afterDarkError && (
                                    <Card className="p-4 bg-red-50 border-red-200">
                                        <p className="text-red-800 text-sm">{afterDarkError}</p>
                                    </Card>
                                )}

                                {/* Step 2: Waiver */}
                                {afterDarkStep === "waiver" && selectedEvt && (
                                    <>
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                            <span className="text-green-600">1. Select</span>
                                            <span>→</span>
                                            <span className="text-indigo-700 font-bold">2. Waiver</span>
                                            <span>→</span>
                                            <span>3. Charge</span>
                                        </div>
                                        <Card className="p-4 bg-indigo-50 border-indigo-200">
                                            <p className="text-sm text-indigo-900">
                                                <strong>Date:</strong>{" "}
                                                {parseDateString(selectedEvt.date).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        weekday: "long",
                                                        month: "short",
                                                        day: "numeric",
                                                    }
                                                )}
                                            </p>
                                            <p className="text-sm text-indigo-900 mt-1">
                                                <strong>Children:</strong> {kidDetailsPreview}
                                            </p>
                                            <p className="text-sm text-indigo-900 mt-1">
                                                <strong>Total:</strong> {formatCurrency(totalPrice)}
                                            </p>
                                        </Card>
                                        <AfterDarkWaiver
                                            parentName={displayCustomer.name}
                                            parentEmail={displayCustomer.email || ""}
                                            parentPhone={displayCustomer.phone}
                                            childNames={kidDetailsPreview}
                                            onComplete={handleAfterDarkWaiverComplete}
                                            onCancel={() => {
                                                setAfterDarkStep("select");
                                                setAfterDarkError(null);
                                            }}
                                        />
                                        {afterDarkSubmitting && (
                                            <Card className="p-4 bg-blue-50 border-blue-200 text-center">
                                                <p className="text-blue-800 text-sm font-medium">
                                                    ⏳ Processing payment…
                                                </p>
                                            </Card>
                                        )}
                                    </>
                                )}

                                {/* Step 1: Select date + children */}
                                {afterDarkStep === "select" && (
                                    <>
                                        {afterDarkLoading && afterDarkEvents.length === 0 ? (
                                            <Card className="p-8 text-center">
                                                <p className="text-gray-500">Loading upcoming dates…</p>
                                            </Card>
                                        ) : afterDarkEvents.length === 0 ? (
                                            <Card className="p-8 text-center">
                                                <p className="text-gray-500">
                                                    No upcoming After Dark dates.
                                                </p>
                                            </Card>
                                        ) : (
                                            <div className="space-y-3">
                                                {afterDarkEvents.map((evt) => {
                                                    const isBooking =
                                                        afterDarkBookingDate === evt.date;
                                                    const dateLabel = parseDateString(
                                                        evt.date
                                                    ).toLocaleDateString("en-US", {
                                                        weekday: "long",
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    });
                                                    return (
                                                        <Card
                                                            key={evt.date}
                                                            className={`p-4 border-l-8 ${
                                                                evt.isFull
                                                                    ? "border-l-gray-400 opacity-70"
                                                                    : "border-l-indigo-500"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <h4 className="text-lg font-bold">
                                                                            {dateLabel}
                                                                        </h4>
                                                                        {evt.movieTitle && (
                                                                            <span className="text-sm text-gray-700">
                                                                                🎬 {evt.movieTitle}
                                                                                {evt.movieRating
                                                                                    ? ` (${evt.movieRating})`
                                                                                    : ""}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p
                                                                        className={`text-sm mt-1 ${
                                                                            evt.isFull
                                                                                ? "text-red-600"
                                                                                : evt.remaining <= 5
                                                                                ? "text-orange-600"
                                                                                : "text-green-700"
                                                                        }`}
                                                                    >
                                                                        {evt.isFull
                                                                            ? "Fully booked"
                                                                            : `${evt.remaining} spot${
                                                                                  evt.remaining === 1
                                                                                      ? ""
                                                                                      : "s"
                                                                              } remaining (${evt.booked}/${evt.maxKids})`}
                                                                    </p>
                                                                </div>
                                                                {!evt.isFull && !isBooking && (
                                                                    <Button
                                                                        onClick={() => {
                                                                            setAfterDarkBookingDate(
                                                                                evt.date
                                                                            );
                                                                            setAfterDarkSelectedChildren(
                                                                                []
                                                                            );
                                                                            setAfterDarkNotes("");
                                                                            setAfterDarkError(null);
                                                                        }}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                        disabled={!defaultCard}
                                                                    >
                                                                        Book
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            {isBooking && (
                                                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                            Select Children Attending
                                                                        </label>
                                                                        {eligibleChildren.length ===
                                                                        0 ? (
                                                                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                                                                <p className="text-sm text-amber-800">
                                                                                    No eligible children
                                                                                    on this account
                                                                                    (ages 3+). Add a
                                                                                    child in the
                                                                                    Children tab first.
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {eligibleChildren.map(
                                                                                    (child) => {
                                                                                        const isSelected = afterDarkSelectedChildren.includes(
                                                                                            child.id
                                                                                        );
                                                                                        return (
                                                                                            <button
                                                                                                key={
                                                                                                    child.id
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    toggleAfterDarkChild(
                                                                                                        child.id
                                                                                                    )
                                                                                                }
                                                                                                className={`p-3 rounded-lg text-left border-2 transition-colors ${
                                                                                                    isSelected
                                                                                                        ? "border-indigo-500 bg-indigo-50"
                                                                                                        : "border-gray-200 hover:border-indigo-300 bg-white"
                                                                                                }`}
                                                                                            >
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <div
                                                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                                                            isSelected
                                                                                                                ? "bg-indigo-500 text-white"
                                                                                                                : "bg-gray-100 text-gray-500"
                                                                                                        }`}
                                                                                                    >
                                                                                                        {isSelected
                                                                                                            ? "✓"
                                                                                                            : child.name.charAt(
                                                                                                                  0
                                                                                                              )}
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="font-medium text-gray-900">
                                                                                                            {
                                                                                                                child.name
                                                                                                            }
                                                                                                        </p>
                                                                                                        <p className="text-xs text-gray-500">
                                                                                                            Age{" "}
                                                                                                            {
                                                                                                                child.age
                                                                                                            }
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </button>
                                                                                        );
                                                                                    }
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Notes (optional)
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={afterDarkNotes}
                                                                            onChange={(e) =>
                                                                                setAfterDarkNotes(
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder="Allergies, pickup notes, etc."
                                                                            maxLength={500}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                                        />
                                                                    </div>

                                                                    {numKids > 0 && (
                                                                        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                                                                            <span className="text-sm text-indigo-900">
                                                                                {numKids} kid
                                                                                {numKids > 1 ? "s" : ""}{" "}
                                                                                × $50
                                                                            </span>
                                                                            <span className="font-bold text-indigo-900">
                                                                                {formatCurrency(
                                                                                    totalPrice
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex gap-2 justify-end">
                                                                        <Button
                                                                            onClick={
                                                                                resetAfterDarkBooking
                                                                            }
                                                                            variant="outline"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            onClick={() => {
                                                                                setAfterDarkError(
                                                                                    null
                                                                                );
                                                                                setAfterDarkStep(
                                                                                    "waiver"
                                                                                );
                                                                            }}
                                                                            disabled={
                                                                                numKids === 0 ||
                                                                                !defaultCard
                                                                            }
                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                        >
                                                                            Continue to Waiver →
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* No Customer Selected */}
            {!displayCustomer && !isStaffMode && (
                <Card className="p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🐝</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Check In?</h3>
                    <p className="text-gray-600">
                        Please log in to your account first to access your passes and
                        check in.
                    </p>
                </Card>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && confirmingPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="p-6 max-w-md mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {confirmingPurchase.totalSessions === 1
                                    ? "Use Single-Use Pass?"
                                    : "Activate Pass?"}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {confirmingPurchase.totalSessions === 1
                                    ? `This ${
                                          confirmingPurchase.name
                                      } can only be used once. Once activated, it will expire in ${
                                          confirmingPurchase.type === "day_pass"
                                              ? "12 hours"
                                              : confirmingPurchase.type ===
                                                "weekly_pass"
                                              ? "7 days"
                                              : confirmingPurchase.type ===
                                                "monthly_pass"
                                              ? "30 days"
                                              : "the specified time"
                                      }.`
                                    : `Are you ready to start using your ${confirmingPurchase.name}?`}
                            </p>

                            <div className="flex space-x-4">
                                <Button
                                    onClick={handleCancelUse}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmUse}
                                    className={`flex-1 ${
                                        confirmingPurchase?.totalSessions === 1
                                            ? "bg-red-500 hover:bg-red-600"
                                            : "bg-green-500 hover:bg-green-600"
                                    }`}
                                >
                                    {confirmingPurchase?.totalSessions === 1
                                        ? "Yes, Use Pass"
                                        : "Yes, Activate Pass"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Punch Card Check-In Picker ("who's playing?") */}
            {punchCardCheckIn && displayCustomer && (() => {
                const punchCardPurchase = displayCustomer.purchases.find(
                    (p) => p.id === punchCardCheckIn
                );
                if (!punchCardPurchase) return null;

                const retry =
                    pendingPunchCardRetry?.purchaseId === punchCardPurchase.id
                        ? pendingPunchCardRetry
                        : null;

                // A child reads as "inside" either because an account punch
                // card session names them directly, or because an active
                // session's purchase belongs to them alone (the older
                // single-child pass path never sets session.childId).
                const childrenInsideIds = (displayCustomer.activeSessions || []).flatMap(
                    (session) => {
                        const ids: string[] = [];
                        if (session.childId) ids.push(session.childId);
                        const sessionPurchase = displayCustomer.purchases.find(
                            (p) => p.id === session.purchaseId
                        );
                        if (sessionPurchase?.childId) ids.push(sessionPurchase.childId);
                        return ids;
                    }
                );

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-xl">
                            <Card className="max-h-[90vh] overflow-y-auto">
                                <PunchCardCheckIn
                                    purchase={punchCardPurchase}
                                    // eslint-disable-next-line react/no-children-prop -- `children` here is the account's list of kids, not JSX content.
                                    children={displayCustomer.children}
                                    childrenInsideIds={childrenInsideIds}
                                    passes={availablePasses}
                                    siblingRules={siblingDiscounts}
                                    qualifiesForMemberPricing={qualifiesForMemberPricing(
                                        "day_pass",
                                        true
                                    )}
                                    onConfirm={(allocation) =>
                                        handlePunchCardConfirm(
                                            displayCustomer,
                                            punchCardPurchase.id,
                                            allocation
                                        )
                                    }
                                    onCancel={() => setPunchCardCheckIn(null)}
                                    notice={retry?.boughtSummary ?? null}
                                    locked={retry !== null}
                                />
                            </Card>
                        </div>
                    </div>
                );
            })()}

            {/* Party Details Modal */}
            {showPartyModal && selectedParty && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
                    style={{ zIndex: 9999 }}
                >
                    <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <Card className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-8 flex-1 overflow-y-auto">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900">
                                            🎉 {selectedParty.name}
                                        </h2>
                                        <p className="text-lg text-gray-600 mt-1">
                                            Party Details & Check-In Status
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowPartyModal(false);
                                            setSelectedParty(null);
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        ✕
                                    </Button>
                                </div>

                                {/* Party Information */}
                                {selectedParty.partyDate && (
                                    <Card className="p-6 mb-6 bg-purple-50 border-purple-200">
                                        <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                                            📅 Scheduled Party Details
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4 text-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="text-purple-600">
                                                    📅
                                                </span>
                                                <div>
                                                    <p className="font-medium text-purple-800">
                                                        Date
                                                    </p>
                                                    <p className="text-purple-700">
                                                        {formatDate(
                                                            selectedParty.partyDate
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedParty.partyStartTime &&
                                                selectedParty.partyEndTime && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-purple-600">
                                                            ⏰
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-purple-800">
                                                                Time
                                                            </p>
                                                            <p className="text-purple-700">
                                                                {(() => {
                                                                    const formatTime = (
                                                                        time: string
                                                                    ) => {
                                                                        const [
                                                                            hours,
                                                                            minutes,
                                                                        ] =
                                                                            time.split(
                                                                                ":"
                                                                            );
                                                                        const hour =
                                                                            parseInt(
                                                                                hours
                                                                            );
                                                                        const ampm =
                                                                            hour >= 12
                                                                                ? "PM"
                                                                                : "AM";
                                                                        const displayHour =
                                                                            hour > 12
                                                                                ? hour -
                                                                                  12
                                                                                : hour ===
                                                                                  0
                                                                                ? 12
                                                                                : hour;
                                                                        return `${displayHour}:${minutes} ${ampm}`;
                                                                    };
                                                                    return `${formatTime(
                                                                        selectedParty.partyStartTime
                                                                    )} - ${formatTime(
                                                                        selectedParty.partyEndTime
                                                                    )}`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            {selectedParty.partyGuests && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-purple-600">
                                                        👥
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-purple-800">
                                                            Guests
                                                        </p>
                                                        <p className="text-purple-700">
                                                            {selectedParty.partyGuests}{" "}
                                                            people
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <span className="text-purple-600">
                                                    💰
                                                </span>
                                                <div>
                                                    <p className="font-medium text-purple-800">
                                                        Total Price
                                                    </p>
                                                    <p className="text-purple-700">
                                                        $
                                                        {selectedParty.price.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedParty.partyNotes && (
                                                <div className="md:col-span-2 flex items-start gap-3">
                                                    <span className="text-purple-600">
                                                        🎨
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-purple-800">
                                                            Theme/Notes
                                                        </p>
                                                        <p className="text-purple-700">
                                                            {selectedParty.partyNotes}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}

                                {/* Check-In Status */}
                                {(() => {
                                    const partyStatus =
                                        getPartyCheckInStatus(selectedParty);
                                    const now = new Date();
                                    const partyDateTime =
                                        selectedParty.partyStartTime &&
                                        selectedParty.partyDate
                                            ? new Date(
                                                  `${selectedParty.partyDate}T${selectedParty.partyStartTime}`
                                              )
                                            : null;
                                    const timeDifference = partyDateTime
                                        ? partyDateTime.getTime() - now.getTime()
                                        : 0;

                                    if (partyStatus === "needs_scheduling") {
                                        return (
                                            <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
                                                <h3 className="text-xl font-bold text-orange-900 mb-3">
                                                    🗓️ Party Not Scheduled
                                                </h3>
                                                <p className="text-orange-800 mb-4">
                                                    This party package needs to be
                                                    scheduled before it can be used for
                                                    check-in.
                                                </p>
                                            </Card>
                                        );
                                    } else if (partyStatus?.startsWith("too_early")) {
                                        const [type, value] = partyStatus.split(":");
                                        const timeText =
                                            type === "too_early_days"
                                                ? `${value} day${
                                                      value !== "1" ? "s" : ""
                                                  }`
                                                : type === "too_early_hours"
                                                ? `${value} hour${
                                                      value !== "1" ? "s" : ""
                                                  }`
                                                : `${value} minute${
                                                      value !== "1" ? "s" : ""
                                                  }`;

                                        return (
                                            <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
                                                <h3 className="text-xl font-bold text-orange-900 mb-3">
                                                    ⏰ Too Early to Check In
                                                </h3>
                                                <p className="text-orange-800 mb-2">
                                                    Check-in opens 30 minutes before
                                                    your party time.
                                                </p>
                                                <p className="text-orange-700 text-lg font-medium">
                                                    Check-in available in:{" "}
                                                    <span className="text-orange-900">
                                                        {timeText}
                                                    </span>
                                                </p>
                                            </Card>
                                        );
                                    } else if (partyStatus === "expired") {
                                        return (
                                            <Card className="p-6 mb-6 bg-red-50 border-red-200">
                                                <h3 className="text-xl font-bold text-red-900 mb-3">
                                                    ❌ Check-In Window Closed
                                                </h3>
                                                <p className="text-red-800">
                                                    The check-in window has closed (30
                                                    minutes after party time). Please
                                                    contact staff for assistance.
                                                </p>
                                            </Card>
                                        );
                                    } else if (partyStatus === "available") {
                                        return (
                                            <Card className="p-6 mb-6 bg-green-50 border-green-200">
                                                <h3 className="text-xl font-bold text-green-900 mb-3">
                                                    🎉 Ready to Check In!
                                                </h3>
                                                <p className="text-green-800">
                                                    Your party check-in window is now
                                                    open. You can check in anytime
                                                    within 30 minutes of your party
                                                    time.
                                                </p>
                                            </Card>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <Button
                                        onClick={() => {
                                            setShowPartyModal(false);
                                            setSelectedParty(null);
                                        }}
                                        variant="outline"
                                        className="flex-1 text-lg py-3"
                                    >
                                        Close
                                    </Button>

                                    {selectedParty.partyDate && (
                                        <Button
                                            onClick={() => {
                                                setShowPartyModal(false);
                                                setIsRescheduling(true);
                                                setShowPartyScheduling(true);
                                            }}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-lg py-3"
                                        >
                                            📅 Reschedule Party
                                        </Button>
                                    )}

                                    {!selectedParty.partyDate && (
                                        <Button
                                            onClick={() => {
                                                setShowPartyModal(false);
                                                setIsRescheduling(false);
                                                setShowPartyScheduling(true);
                                            }}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-lg py-3"
                                        >
                                            🗓️ Schedule Party
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Party Scheduling Modal */}
            {showPartyScheduling && selectedParty && (
                <PartySchedulingModal
                    isOpen={showPartyScheduling}
                    onClose={() => {
                        setShowPartyScheduling(false);
                        setSelectedParty(null);
                        setIsRescheduling(false);
                    }}
                    onSchedule={handlePartySchedule}
                    partyPackageName={selectedParty.name}
                    customerName={
                        (selectedCustomer || currentCustomer)?.name || "Customer"
                    }
                    purchasePrice={selectedParty.price}
                    existingPartyData={isRescheduling ? {
                        partyDate: selectedParty.partyDate,
                        partyStartTime: selectedParty.partyStartTime,
                        partyEndTime: selectedParty.partyEndTime,
                        partyGuests: selectedParty.partyGuests,
                        partyNotes: selectedParty.partyNotes,
                    } : undefined}
                    forceCalendarStep={isRescheduling}
                />
            )}

            {/* Payment Modal */}
            <AddPaymentMethodModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={handleAddPaymentMethodSuccess}
            />

            {/* View Waiver Modal */}
            <WaiverModal
                isOpen={showViewWaiverModal}
                onClose={() => {
                    setShowViewWaiverModal(false);
                    setViewWaiverChildName(undefined);
                }}
                childName={viewWaiverChildName}
            />

            {/* Payment Success Modal */}
            {showPaymentSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">✅</span>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                {paymentSuccessDetails.saved
                                    ? "Payment Method Added!"
                                    : "Payment Processed!"}
                            </h2>

                            <div className="mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-center justify-center space-x-2 text-blue-800">
                                        <span className="text-xl">💳</span>
                                        <span className="font-medium">
                                            {paymentSuccessDetails.cardBrand} ••••{" "}
                                            {paymentSuccessDetails.last4}
                                        </span>
                                    </div>
                                    {paymentSuccessDetails.saved && (
                                        <p className="text-sm text-blue-600 mt-2">
                                            Saved as{" "}
                                            {(() => {
                                                const customer =
                                                    selectedCustomer || currentCustomer;
                                                return customer?.savedCards.length === 1
                                                    ? "your default"
                                                    : "a new";
                                            })()}{" "}
                                            payment method
                                        </p>
                                    )}
                                </div>

                                <p className="text-gray-600 mb-2">
                                    {paymentSuccessDetails.saved
                                        ? "Thank you for adding your payment method! You can now make purchases quickly and easily."
                                        : "Thank you for your payment! Your transaction has been processed successfully."}
                                </p>

                                <p className="text-sm text-gray-500">
                                    🐝 We appreciate your business at Busy Bees!
                                </p>
                            </div>

                            <button
                                onClick={() => setShowPaymentSuccessModal(false)}
                                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                            >
                                Welcome to the Busy Bees Family!
                            </button>

                            <div className="mt-4 text-xs text-gray-400 text-center">
                                🔒 Your payment information is secure and encrypted
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Renew Confirmation Modal */}
            {showAutoRenewConfirm && confirmingAutoRenewFor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-3xl">🔄</span>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                Enable Auto-Renew?
                            </h2>

                            <div className="mb-6">
                                {(() => {
                                    const purchase = (
                                        selectedCustomer || currentCustomer
                                    )?.purchases.find(
                                        (p) => p.id === confirmingAutoRenewFor
                                    );
                                    const passType =
                                        purchase?.type === "weekly_pass"
                                            ? "weekly"
                                            : "monthly";
                                    const price = purchase?.price || 0;

                                    return (
                                        <>
                                            <p className="text-gray-600 mb-4">
                                                Your {passType} pass will automatically
                                                renew when it expires.
                                            </p>

                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                                <p className="text-yellow-800 font-medium">
                                                    💰 ${price.toFixed(2)} will be
                                                    charged automatically
                                                </p>
                                                <p className="text-sm text-yellow-600 mt-1">
                                                    You can disable this anytime in your
                                                    account
                                                </p>
                                            </div>

                                            <p className="text-sm text-gray-500">
                                                🐝 Never worry about your pass expiring
                                                again!
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowAutoRenewConfirm(false);
                                        setConfirmingAutoRenewFor(null);
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAutoRenew}
                                    className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                                >
                                    ✅ Enable Auto-Renew
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Child Selection Modal */}
            {showChildSelectionModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowChildSelectionModal(false);
                            setSelectedProductForPurchase("");
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setShowChildSelectionModal(false);
                            setSelectedProductForPurchase("");
                        }
                    }}
                >
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative">
                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowChildSelectionModal(false);
                                setSelectedProductForPurchase("");
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ✕
                        </button>

                        {(() => {
                            const selectedProduct = [
                                ...AVAILABLE_PASS_PRODUCTS,
                                ...AVAILABLE_PARTY_PRODUCTS,
                            ].find((p) => p.id === selectedProductForPurchase);
                            const isFamilyProduct = selectedProduct ? isFamilyPass(selectedProduct.name) : false;
                            const isComboProduct = selectedProduct ? isChildInfantComboPass(selectedProduct.name) : false;

                            return (
                                <>
                                    <h3 className="text-lg font-semibold mb-4">
                                        {isComboProduct ? 'Select Child & Infant for Combo Pass' : isFamilyProduct ? 'Select Children for Family Pass' : 'Select Child for Pass'}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {isComboProduct
                                            ? 'Select one child (age 2+) and one infant (under 2):'
                                            : isFamilyProduct
                                            ? `Select all children this ${selectedProduct?.name} will cover:`
                                            : `Which child is this ${selectedProduct?.name} for?`}
                                    </p>

                                    {isComboProduct ? (
                                        /* Child + Infant Combo Pass Selection */
                                        <div className="space-y-4">
                                            {(() => {
                                                const customer = selectedCustomer || currentCustomer;
                                                if (!customer) return null;
                                                const signedChildren = customer.children.filter((c) => c.waiverSigned);
                                                const eligibleChildren = signedChildren.filter((c) => c.age >= 2);
                                                const eligibleInfants = signedChildren.filter((c) => c.age < 2);

                                                const comboChildHasActivePass = (childId: string) => {
                                                    return customer.purchases.some(
                                                        (p) => {
                                                            return (p.childId === childId || p.childIds?.includes(childId)) &&
                                                                p.status === 'active' &&
                                                                ['day_pass', 'monthly_pass', 'weekly_pass'].includes(p.type) &&
                                                                (p.totalSessions === 999 || p.usedSessions < p.totalSessions);
                                                        }
                                                    );
                                                };

                                                return (
                                                    <>
                                                        {/* Child (2+) selection */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                👧 Child (age 2+)
                                                            </label>
                                                            {eligibleChildren.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {eligibleChildren.map((child) => {
                                                                        const hasPass = comboChildHasActivePass(child.id);
                                                                        return (
                                                                        <button
                                                                            key={child.id}
                                                                            onClick={() => !hasPass && setComboChildId(comboChildId === child.id ? null : child.id)}
                                                                            disabled={hasPass}
                                                                            className={`w-full p-3 text-left border rounded-lg transition-colors ${
                                                                                hasPass
                                                                                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                                                    : comboChildId === child.id
                                                                                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                                                                    : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <p className="font-medium text-gray-900">{child.name}</p>
                                                                                    <p className="text-sm text-gray-600">Age: {child.age}</p>
                                                                                    {hasPass && (
                                                                                        <p className="text-xs text-amber-600 mt-1">Already has an active pass</p>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`text-xl ${hasPass ? 'text-gray-300' : comboChildId === child.id ? 'text-green-600' : 'text-gray-300'}`}>
                                                                                    {comboChildId === child.id ? '✅' : '⬜'}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                                                                    No children age 2 or older with signed waivers found on this account.
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Infant (under 2) selection */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                👶 Infant (under 2)
                                                            </label>
                                                            {eligibleInfants.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {eligibleInfants.map((child) => {
                                                                        const hasPass = comboChildHasActivePass(child.id);
                                                                        return (
                                                                        <button
                                                                            key={child.id}
                                                                            onClick={() => !hasPass && setComboInfantId(comboInfantId === child.id ? null : child.id)}
                                                                            disabled={hasPass}
                                                                            className={`w-full p-3 text-left border rounded-lg transition-colors ${
                                                                                hasPass
                                                                                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                                                    : comboInfantId === child.id
                                                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                                                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <p className="font-medium text-gray-900">{child.name}</p>
                                                                                    <p className="text-sm text-gray-600">Age: {child.age}</p>
                                                                                    {hasPass && (
                                                                                        <p className="text-xs text-amber-600 mt-1">Already has an active pass</p>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`text-xl ${hasPass ? 'text-gray-300' : comboInfantId === child.id ? 'text-blue-600' : 'text-gray-300'}`}>
                                                                                    {comboInfantId === child.id ? '✅' : '⬜'}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                                                                    No infants under 2 with signed waivers found on this account.
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Confirm button */}
                                                        <Button
                                                            onClick={() => {
                                                                if (comboChildId && comboInfantId) {
                                                                    setSelectedChildForPurchase(comboChildId);
                                                                    setSelectedChildrenForFamilyPass([comboChildId, comboInfantId]);
                                                                    setShowChildSelectionModal(false);
                                                                    if (selectedProductForPurchase) {
                                                                        handleQuickPurchase(selectedProductForPurchase);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!comboChildId || !comboInfantId}
                                                            className="w-full"
                                                        >
                                                            {!comboChildId && !comboInfantId
                                                                ? 'Select a child and an infant'
                                                                : !comboChildId
                                                                ? 'Select a child (age 2+)'
                                                                : !comboInfantId
                                                                ? 'Select an infant (under 2)'
                                                                : 'Confirm Selection'}
                                                        </Button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {(() => {
                                            const customer = selectedCustomer || currentCustomer;
                                            if (!customer) return null;

                                            const childHasActivePass = (childId: string) => {
                                                return customer.purchases.some(
                                                    (p) => {
                                                        return (p.childId === childId || p.childIds?.includes(childId)) &&
                                                            p.status === 'active' &&
                                                            ['day_pass', 'monthly_pass', 'weekly_pass'].includes(p.type) &&
                                                            (p.totalSessions === 999 || p.usedSessions < p.totalSessions);
                                                    }
                                                );
                                            };

                                            // Age-restriction context for this product
                                            const productHasAgeGate =
                                                selectedProduct && hasAgeRestriction(selectedProduct.name);
                                            const ineligibleReason = (child: { age: number }): string | null => {
                                                if (!productHasAgeGate || !selectedProduct) return null;
                                                const v = validateAgeForProduct(child.age, selectedProduct.name);
                                                return v.valid ? null : (v.error || 'Age not eligible for this pass');
                                            };

                                            return customer.children
                                                .filter((child) => child.waiverSigned)
                                                .map((child) => {
                                                    const hasPass = childHasActivePass(child.id);
                                                    const ageBlock = ineligibleReason(child);
                                                    const isBlocked = hasPass || ageBlock !== null;

                                                    if (isFamilyProduct) {
                                                        const isSelected = selectedChildrenForFamilyPass.includes(child.id);
                                                        return (
                                                            <button
                                                                key={child.id}
                                                                onClick={() => !isBlocked && toggleChildForFamilyPass(child.id)}
                                                                disabled={isBlocked}
                                                                className={`w-full p-4 text-left border rounded-lg transition-colors ${
                                                                    isBlocked
                                                                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                                        : isSelected
                                                                        ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                                                        : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="font-medium text-gray-900">
                                                                            {child.name}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600">
                                                                            Age: {child.age}
                                                                        </p>
                                                                        {hasPass && (
                                                                            <p className="text-xs text-amber-600 mt-1">Already has an active pass</p>
                                                                        )}
                                                                        {!hasPass && ageBlock && (
                                                                            <p className="text-xs text-red-600 mt-1">🚫 {ageBlock}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className={`text-xl ${isBlocked ? 'text-gray-300' : isSelected ? 'text-green-600' : 'text-gray-300'}`}>
                                                                        {isSelected ? '✅' : '⬜'}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => !isBlocked && handleChildSelectionForPurchase(child.id)}
                                                            disabled={isBlocked}
                                                            className={`w-full p-4 text-left border rounded-lg transition-colors ${
                                                                isBlocked
                                                                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                                    : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium text-gray-900">
                                                                        {child.name}
                                                                    </p>
                                                                    <p className="text-sm text-gray-600">
                                                                        Age: {child.age}
                                                                    </p>
                                                                    {hasPass && (
                                                                        <p className="text-xs text-amber-600 mt-1">Already has an active pass</p>
                                                                    )}
                                                                    {!hasPass && ageBlock && (
                                                                        <p className="text-xs text-red-600 mt-1">🚫 {ageBlock}</p>
                                                                    )}
                                                                </div>
                                                                <div className={isBlocked ? 'text-gray-300' : 'text-green-600'}>
                                                                    {hasPass ? '⚠️ Active Pass' : ageBlock ? '🚫 Age' : '✅ Waiver Signed'}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                });
                                        })()}
                                    </div>
                                    )}

                                    {isFamilyProduct && selectedChildrenForFamilyPass.length > 0 && (
                                        <div className="mt-4">
                                            <Button
                                                onClick={handleFamilyPassChildrenConfirm}
                                                className="w-full"
                                            >
                                                Confirm {selectedChildrenForFamilyPass.length} Child{selectedChildrenForFamilyPass.length > 1 ? 'ren' : ''} Selected
                                            </Button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {(() => {
                            const customer = selectedCustomer || currentCustomer;
                            return (
                                customer &&
                                customer.children.some(
                                    (child) => !child.waiverSigned
                                ) && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ Some children don't have signed waivers
                                            and can't be selected.
                                            <button
                                                onClick={() => {
                                                    setShowChildSelectionModal(false);
                                                    setActiveTab("children");
                                                }}
                                                className="text-yellow-700 underline ml-1"
                                            >
                                                Sign waivers in Children tab
                                            </button>
                                        </p>
                                    </div>
                                )
                            );
                        })()}

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowChildSelectionModal(false);
                                    setSelectedProductForPurchase("");
                                }}
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complimentary Pass Modal (Staff Only) */}
            {showComplimentaryModal && displayCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="p-6 max-w-md mx-4 w-full">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🎁</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Issue Complimentary Pass
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">
                                This pass will be issued at no charge.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Child Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Child
                                </label>
                                <select
                                    value={complimentaryChildId}
                                    onChange={(e) => setComplimentaryChildId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">Choose a child...</option>
                                    {displayCustomer.children
                                        .filter((c) => c.waiverSigned)
                                        .map((child) => (
                                            <option key={child.id} value={child.id}>
                                                {child.name} ({child.age} years old)
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Pass Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pass Type
                                </label>
                                <select
                                    value={complimentaryPassId}
                                    onChange={(e) => setComplimentaryPassId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">Choose a pass type...</option>
                                    {availablePasses
                                        .filter((p) => p.category === "day")
                                        .map((pass) => (
                                            <option key={pass.id} value={pass.id}>
                                                {pass.name} (normally {formatCurrency(pass.price)})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Optional Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason (optional)
                                </label>
                                <input
                                    type="text"
                                    value={complimentaryReason}
                                    onChange={(e) => setComplimentaryReason(e.target.value)}
                                    placeholder="e.g., Raffle winner, Customer service"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowComplimentaryModal(false);
                                    setComplimentaryChildId("");
                                    setComplimentaryPassId("");
                                    setComplimentaryReason("");
                                }}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleIssueComplimentaryPass}
                                disabled={!complimentaryChildId || !complimentaryPassId || isIssuingComplimentary}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                            >
                                {isIssuingComplimentary ? "Issuing..." : "Issue Free Pass"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Group Children Manager Modal */}
            <GroupChildrenManager
                isOpen={showGroupChildrenManager}
                onClose={() => {
                    setShowGroupChildrenManager(false);
                    setGroupRateProductId(null);
                }}
                guestCount={groupRateGuestCount}
                onComplete={handleGroupChildrenComplete}
            />

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title={successDetails.title}
                message={successDetails.message}
                details={successDetails.details}
            />
        </div>
    );
}
