"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/client-logger";
import { PhoneLogin } from "@/components/pos/PhoneLogin";
import { CustomerDashboard } from "@/components/pos/CustomerDashboard";
import { CheckIn } from "@/components/pos/CheckIn";
import { AdminPanel } from "../../components/pos/AdminPanel";
import { AddPaymentMethodModal } from "@/components/pos/AddPaymentMethodModal";
import {
    PromoSpecial,
    getPromosFromStorage,
    savePromosToStorage,
} from "@/lib/utils/promoHelpers";
import { INITIAL_PROMOS, PROMO_VERSION } from "@/lib/utils/promoConstants";
import {
    PassProduct,
    PartyProduct,
    FoodProduct,
    VolumeDiscount,
    getPassesFromStorage,
    savePassesToStorage,
    getPartiesFromStorage,
    savePartiesToStorage,
    getProductsFromStorage,
    saveProductsToStorage,
    getVolumeDiscountsFromStorage,
    saveVolumeDiscountsToStorage,
} from "@/lib/utils/productHelpers";

interface Child {
    id: string;
    name: string;
    birthdate: string;
    age: number;
    waiverSigned: boolean;
    waiverSignedDate?: string;
    createdAt: string;
}

interface Customer {
    id: string;
    phone: string;
    name: string;
    email?: string;
    children: Child[];
    purchases: Purchase[];
    activeSessions: Session[];
    savedCards: SavedCard[];
    createdAt: string;
    lastVisit?: string;
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
}

interface Session {
    id: string;
    customerId: string;
    purchaseId: string;
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

type ViewMode = "login" | "customer" | "checkin" | "admin";

export default function POSPage() {
    const [currentView, setCurrentView] = useState<ViewMode>("login");
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [isStaffMode, setIsStaffMode] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
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

    // Inactivity timeout states
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const [countdownSeconds, setCountdownSeconds] = useState(30);
    const [inactivityCountdown, setInactivityCountdown] = useState(30); // Tracks time until warning appears
    const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
    const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);
    const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);

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

    // Initialize passes from localStorage or seed initial data
    useEffect(() => {
        const storedPasses = getPassesFromStorage();
        if (storedPasses.length > 0) {
            setPasses(storedPasses);
        } else {
            // Seed initial passes with real pricing
            const initialPasses: PassProduct[] = [
                {
                    id: "pass-1",
                    name: "Day Pass - Toddler (2+)",
                    category: "day",
                    price: 17.0,
                    duration: 8, // 8 hours
                    sessionsIncluded: 1,
                    description:
                        "Full day of play for toddlers (ages 2+)! Valid for one entry, expires at closing time.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/9B6bJ023x3Nr1HDeUQffy0b",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-2",
                    name: "Day Pass - Infant",
                    category: "day",
                    price: 7.0,
                    duration: 8, // 8 hours
                    sessionsIncluded: 1,
                    description:
                        "Full day of play for infants! Valid for one entry, expires at closing time.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/dRm00ibE75Vzfyt5kgffy0a",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-7",
                    name: "Day Pass - Toddler + Infant Discount",
                    category: "day",
                    price: 17.0,
                    duration: 8, // 8 hours
                    sessionsIncluded: 2, // covers both toddler and infant
                    description:
                        "Day pass for toddler and infant together - infant plays free! Best value for siblings.",
                    stripePurchaseLink: "",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-3",
                    name: "Monthly Membership - Toddler",
                    category: "monthly",
                    price: 100.0,
                    duration: 30, // 30 days
                    sessionsIncluded: 999, // unlimited
                    description:
                        "One month of unlimited play for toddlers! Best value for regular visitors.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/6oU3cu8rV6ZDae93c8ffy07",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-4",
                    name: "Monthly Membership - Infant",
                    category: "monthly",
                    price: 70.0,
                    duration: 30, // 30 days
                    sessionsIncluded: 999, // unlimited
                    description:
                        "One month of unlimited play for infants! Best value for regular visitors.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/7sY5kC37B2Jn0Dz8wsffy06",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-5",
                    name: "Punch Card (10 passes) - Toddler",
                    category: "weekly",
                    price: 150.0,
                    duration: 90, // 90 days to use
                    sessionsIncluded: 10,
                    description:
                        "10 visits for toddlers! Use within 90 days of first visit.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/14A00i0Ztes5bid3c8ffy09",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "pass-6",
                    name: "Punch Card (10 passes) - Infant",
                    category: "weekly",
                    price: 50.0,
                    duration: 90, // 90 days to use
                    sessionsIncluded: 10,
                    description:
                        "10 visits for infants! Use within 90 days of first visit.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/9B6aEW8rVgAdcmh6okffy08",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            setPasses(initialPasses);
            savePassesToStorage(initialPasses);
        }
    }, []);

    // Initialize parties from localStorage or seed initial data
    useEffect(() => {
        const storedParties = getPartiesFromStorage();
        if (storedParties.length > 0) {
            setParties(storedParties);
        } else {
            // Seed initial party packages with real pricing
            const initialParties: PartyProduct[] = [
                {
                    id: "party-1",
                    name: "Queen Bee (Private)",
                    basePrice: 575.0,
                    capacity: 20,
                    duration: 2,
                    includedItems: [
                        "Private party room",
                        "Premium decorations",
                        "Plates, cups, napkins",
                        "Dedicated party host",
                        "Setup & cleanup",
                        "Party favors for all kids",
                        "Digital photo package",
                    ],
                    addOns: [
                        {
                            id: "addon-1",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-2",
                            name: "Additional child (over 20)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-3",
                            name: "Pizza party pack",
                            price: 75,
                            description: "4 large pizzas",
                        },
                        {
                            id: "addon-4",
                            name: "Face painting",
                            price: 100,
                            description: "Professional face painter",
                        },
                    ],
                    description:
                        "Our premium private party package! Perfect for up to 20 kids with all the bells and whistles.",
                    stripePurchaseLink:
                        "https://buy.stripe.com/9B6fZgbE797L3PLfYUffy05",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "party-2",
                    name: "Worker Bee (Private)",
                    basePrice: 525.0,
                    capacity: 15,
                    duration: 2,
                    includedItems: [
                        "Private party room",
                        "Standard decorations",
                        "Plates, cups, napkins",
                        "Party host",
                        "Setup & cleanup",
                        "Party favors for all kids",
                    ],
                    addOns: [
                        {
                            id: "addon-5",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-6",
                            name: "Additional child (over 15)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-7",
                            name: "Pizza party pack",
                            price: 65,
                            description: "3 large pizzas",
                        },
                        {
                            id: "addon-8",
                            name: "Face painting",
                            price: 100,
                            description: "Professional face painter",
                        },
                    ],
                    description:
                        "Great private party option for up to 15 kids with party favors included!",
                    stripePurchaseLink:
                        "https://buy.stripe.com/3cI5kC7nRbfTbid284ffy04",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "party-3",
                    name: "Basic Bee (Private)",
                    basePrice: 475.0,
                    capacity: 12,
                    duration: 2,
                    includedItems: [
                        "Private party room",
                        "Basic decorations",
                        "Plates, cups, napkins",
                        "Party host",
                        "Setup & cleanup",
                    ],
                    addOns: [
                        {
                            id: "addon-9",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-10",
                            name: "Additional child (over 12)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-11",
                            name: "Pizza party pack",
                            price: 55,
                            description: "2 large pizzas",
                        },
                        {
                            id: "addon-12",
                            name: "Party favors",
                            price: 50,
                            description: "Favors for all kids",
                        },
                    ],
                    description:
                        "Perfect private party starter package for up to 12 kids!",
                    stripePurchaseLink:
                        "https://buy.stripe.com/4gMbJ023x83H5XT6okffy03",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "party-4",
                    name: "Queen Bee (Semi-Private)",
                    basePrice: 500.0,
                    capacity: 20,
                    duration: 2,
                    includedItems: [
                        "Semi-private party area",
                        "Premium decorations",
                        "Plates, cups, napkins",
                        "Party host",
                        "Setup & cleanup",
                        "Party favors for all kids",
                    ],
                    addOns: [
                        {
                            id: "addon-13",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-14",
                            name: "Additional child (over 20)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-15",
                            name: "Pizza party pack",
                            price: 75,
                            description: "4 large pizzas",
                        },
                        {
                            id: "addon-16",
                            name: "Face painting",
                            price: 100,
                            description: "Professional face painter",
                        },
                    ],
                    description:
                        "Premium semi-private party for up to 20 kids with all the extras!",
                    stripePurchaseLink:
                        "https://buy.stripe.com/bJeeVc7nRbfTeup6okffy02",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "party-5",
                    name: "Worker Bee (Semi-Private)",
                    basePrice: 450.0,
                    capacity: 15,
                    duration: 2,
                    includedItems: [
                        "Semi-private party area",
                        "Standard decorations",
                        "Plates, cups, napkins",
                        "Party host",
                        "Setup & cleanup",
                    ],
                    addOns: [
                        {
                            id: "addon-17",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-18",
                            name: "Additional child (over 15)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-19",
                            name: "Pizza party pack",
                            price: 65,
                            description: "3 large pizzas",
                        },
                        {
                            id: "addon-20",
                            name: "Party favors",
                            price: 50,
                            description: "Favors for all kids",
                        },
                    ],
                    description: "Great semi-private party option for up to 15 kids!",
                    stripePurchaseLink:
                        "https://buy.stripe.com/cNidR8gYr0Bf4TP4gcffy01",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "party-6",
                    name: "Basic Bee (Semi-Private)",
                    basePrice: 400.0,
                    capacity: 12,
                    duration: 2,
                    includedItems: [
                        "Semi-private party area",
                        "Basic decorations",
                        "Plates, cups, napkins",
                        "Party host",
                        "Setup & cleanup",
                    ],
                    addOns: [
                        {
                            id: "addon-21",
                            name: "Extra 30 minutes",
                            price: 50,
                            description: "Extend party time",
                        },
                        {
                            id: "addon-22",
                            name: "Additional child (over 12)",
                            price: 15,
                            description: "Per extra child",
                        },
                        {
                            id: "addon-23",
                            name: "Pizza party pack",
                            price: 55,
                            description: "2 large pizzas",
                        },
                        {
                            id: "addon-24",
                            name: "Party favors",
                            price: 50,
                            description: "Favors for all kids",
                        },
                    ],
                    description:
                        "Perfect semi-private party starter package for up to 12 kids!",
                    stripePurchaseLink:
                        "https://buy.stripe.com/14A3cu6jNgAddql5kgffy00",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            setParties(initialParties);
            savePartiesToStorage(initialParties);
        }
    }, []);

    // Initialize products from localStorage or seed initial data
    useEffect(() => {
        const storedProducts = getProductsFromStorage();
        if (storedProducts.length > 0) {
            setProducts(storedProducts);
        } else {
            // Seed initial food/beverage/retail products
            const initialProducts: FoodProduct[] = [
                {
                    id: "product-1",
                    name: "Apple Sauce Pouch",
                    category: "food",
                    price: 3.0,
                    description: "Delicious apple sauce pouch snack",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-2",
                    name: "Veggie Sticks",
                    category: "food",
                    price: 3.0,
                    description: "Crunchy veggie stick snacks",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-3",
                    name: "Goldfish",
                    category: "food",
                    price: 3.0,
                    description: "Classic Goldfish crackers",
                    allergens: ["gluten", "dairy"],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-4",
                    name: "Bee Bracelets",
                    category: "retail",
                    price: 2.0,
                    description: "Cute bee-themed bracelets",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-5",
                    name: "Granola Bar",
                    category: "food",
                    price: 3.0,
                    description: "Nutritious granola bar snack",
                    allergens: ["gluten"],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-6",
                    name: "Honey Sticks",
                    category: "food",
                    price: 1.0,
                    description: "Sweet honey stick treats",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-7",
                    name: "Youth Socks",
                    category: "retail",
                    price: 3.0,
                    description: "Grip socks for kids - required for play",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: "product-8",
                    name: "Adult Socks",
                    category: "retail",
                    price: 5.0,
                    description: "Grip socks for adults - required for play areas",
                    allergens: [],
                    stripePurchaseLink: "",
                    isActive: true,
                    available: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            setProducts(initialProducts);
            saveProductsToStorage(initialProducts);
        }
    }, []);

    // Initialize volume discounts from localStorage or seed initial data
    useEffect(() => {
        const storedDiscounts = getVolumeDiscountsFromStorage();
        if (storedDiscounts.length > 0) {
            setVolumeDiscounts(storedDiscounts);
        } else {
            // Seed initial volume discounts
            const initialDiscounts: VolumeDiscount[] = [
                {
                    id: "discount-1",
                    productId: "pass-1", // Day pass
                    productType: "pass",
                    minQuantity: 10,
                    discountPercent: 15,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            setVolumeDiscounts(initialDiscounts);
            saveVolumeDiscountsToStorage(initialDiscounts);
        }
    }, []);

    // Save passes to localStorage whenever they change
    useEffect(() => {
        if (passes.length > 0) {
            savePassesToStorage(passes);
        }
    }, [passes]);

    // Save parties to localStorage whenever they change
    useEffect(() => {
        if (parties.length > 0) {
            savePartiesToStorage(parties);
        }
    }, [parties]);

    // Save products to localStorage whenever they change
    useEffect(() => {
        if (products.length > 0) {
            saveProductsToStorage(products);
        }
    }, [products]);

    // Save volume discounts to localStorage whenever they change
    useEffect(() => {
        if (volumeDiscounts.length > 0) {
            saveVolumeDiscountsToStorage(volumeDiscounts);
        }
    }, [volumeDiscounts]);

    // All customer data comes from API calls via PhoneLogin
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Fetch customers when entering admin mode
    useEffect(() => {
        if (currentView === "admin" && isStaffMode) {
            const fetchCustomers = async () => {
                try {
                    const response = await fetch("/api/pos/customers", {
                        headers: {
                            "x-pos-pin": "1234",
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setCustomers(data);
                        logger.info({ customerCount: data.length }, "Loaded customers for admin panel");
                    } else {
                        logger.error({ status: response.status }, "Failed to fetch customers");
                    }
                } catch (error) {
                    logger.error({ error }, "Error fetching customers");
                }
            };
            fetchCustomers();
        }
    }, [currentView, isStaffMode]);

    const handleLogin = (customer: Customer) => {
        setCurrentCustomer(customer);
        setCurrentView("checkin"); // Automatically go to Check In screen
    };

    const handleLogout = () => {
        setCurrentCustomer(null);
        setCurrentView("login");
    };

    const handleStaffToggle = () => {
        if (isStaffMode) {
            // Exit staff mode immediately
            setIsStaffMode(false);
            setCurrentView("login");
        } else {
            // Show PIN modal to enter staff mode
            setShowPinModal(true);
            setPin("");
            setPinError("");
        }
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "1234") {
            setIsStaffMode(true);
            setCurrentView("admin");
            setShowPinModal(false);
            setPin("");
            setPinError("");
        } else {
            setPinError("Incorrect PIN. Please try again.");
            setPin("");
        }
    };

    const handlePinCancel = () => {
        setShowPinModal(false);
        setPin("");
        setPinError("");
    };

    const handleAdminAccessFromWelcome = () => {
        setIsStaffMode(true);
        setCurrentView("admin");
    };

    // Handle auto-logout
    const handleAutoLogout = () => {
        setCurrentCustomer(null);
        setCurrentView("login");
        setShowInactivityWarning(false);
        setCountdownSeconds(30);
        setInactivityCountdown(30);
    };

    // Resume session (dismiss warning and restart timer)
    const handleResumeSession = () => {
        // Clear the warning modal and reset counters
        setShowInactivityWarning(false);
        setCountdownSeconds(30);
        setInactivityCountdown(30);

        // Trigger a synthetic activity event after the warning is cleared
        // This will cause handleActivity to restart the timer since warning is now false
        // The startInactivityTimer function will clear all existing timers including warningCountdown
        setTimeout(() => {
            const syntheticEvent = new MouseEvent("mousedown", { bubbles: true });
            document.dispatchEvent(syntheticEvent);
        }, 50); // Slightly longer delay to ensure state update
    };

    // Payment method management
    const fetchSavedCards = async () => {
        if (!currentCustomer) return;

        try {
            const response = await fetch('/api/stripe/payment-methods');
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

                setCurrentCustomer({
                    ...currentCustomer,
                    savedCards,
                });
            }
        } catch (error) {
            console.error('Error fetching saved cards:', error);
        }
    };

    const handleAddPaymentMethod = async () => {
        // Note: This function is no longer used - the modal uses Stripe's Payment Element
        // The actual card handling happens via the Stripe API in the modal
        // This is kept for compatibility but should not be called
        alert('Please use the Stripe payment form to add your card.');
    };

    const handleSetDefaultCard = (cardId: string) => {
        if (!currentCustomer) return;

        const updatedCards = currentCustomer.savedCards.map((card) => ({
            ...card,
            isDefault: card.id === cardId,
        }));

        const updatedCustomer = {
            ...currentCustomer,
            savedCards: updatedCards,
        };

        setCurrentCustomer(updatedCustomer);
        setShowPaymentDropdown(false);
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

    const getDefaultCard = () => {
        if (!currentCustomer) return null;
        return (
            currentCustomer.savedCards.find((card) => card.isDefault) ||
            currentCustomer.savedCards[0] ||
            null
        );
    };

    // Inactivity management
    useEffect(() => {
        // Only track inactivity for logged-in customers (not staff mode)
        if (!currentCustomer || isStaffMode) {
            // Clear any existing timers
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (warningTimer) clearTimeout(warningTimer);
            if (countdownTimer) clearTimeout(countdownTimer);
            setInactivityTimer(null);
            setWarningTimer(null);
            setCountdownTimer(null);
            setShowInactivityWarning(false);
            setCountdownSeconds(30);
            setInactivityCountdown(30);
            return;
        }

        let activityTimer: NodeJS.Timeout | undefined;
        let warningCountdown: NodeJS.Timeout | undefined;
        let inactivityCountdownTimer: NodeJS.Timeout | undefined;

        const startInactivityTimer = () => {
            // Clear any existing timers
            if (activityTimer) clearTimeout(activityTimer);
            if (warningCountdown) clearTimeout(warningCountdown);
            if (inactivityCountdownTimer) clearInterval(inactivityCountdownTimer);

            // Start inactivity countdown from 30 seconds
            let inactivitySeconds = 30;
            setInactivityCountdown(inactivitySeconds);

            inactivityCountdownTimer = setInterval(() => {
                inactivitySeconds--;
                setInactivityCountdown(inactivitySeconds);

                if (inactivitySeconds <= 0) {
                    clearInterval(inactivityCountdownTimer);
                }
            }, 1000);

            // Set 30-second timer for warning
            activityTimer = setTimeout(() => {
                // Show warning modal (countdown will be handled by separate useEffect)
                setShowInactivityWarning(true);
            }, 30000); // 30 seconds
        };

        const handleActivity = () => {
            // Only restart the timer if the warning is not currently showing
            // When warning is showing, user must explicitly click Resume or Start New Session
            if (!showInactivityWarning) {
                startInactivityTimer();
            }
        };

        // Add event listeners for user activity
        const events = [
            "mousedown",
            "mousemove",
            "keypress",
            "scroll",
            "touchstart",
            "click",
        ];
        events.forEach((event) => {
            document.addEventListener(event, handleActivity, true);
        });

        // Start initial timer
        startInactivityTimer();

        // Cleanup function
        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, handleActivity, true);
            });
            if (activityTimer) clearTimeout(activityTimer);
            if (warningCountdown) clearTimeout(warningCountdown);
            if (inactivityCountdownTimer) clearInterval(inactivityCountdownTimer);
        };
    }, [currentCustomer, isStaffMode, showInactivityWarning]);

    // Separate useEffect to handle countdown when warning modal appears
    useEffect(() => {
        if (!showInactivityWarning) return;

        // Start logout countdown immediately when warning shows
        let seconds = 30;
        setCountdownSeconds(seconds);

        // Create countdown function that can be called immediately and in interval
        const countdownTick = () => {
            seconds--;
            setCountdownSeconds(seconds);

            if (seconds <= 0) {
                handleAutoLogout();
                return;
            }
        };

        // Execute first tick immediately (30 -> 29)
        countdownTick();

        // Then start interval for remaining ticks (29 -> 28 -> 27 -> ... -> 0)
        const warningInterval = setInterval(countdownTick, 1000);

        // Cleanup function
        return () => {
            clearInterval(warningInterval);
        };
    }, [showInactivityWarning]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showSettingsDropdown && !target.closest(".settings-dropdown")) {
                setShowSettingsDropdown(false);
            }
            if (showPaymentDropdown && !target.closest(".payment-dropdown")) {
                setShowPaymentDropdown(false);
            }
        };

        if (showSettingsDropdown || showPaymentDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSettingsDropdown, showPaymentDropdown]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 pos-page-static">
            {/* Header - Hidden on login screen */}
            {currentView !== "login" && (
                <div className="bg-white shadow-lg border-b-4 border-yellow-400">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <button
                                onClick={handleStaffToggle}
                                className="flex items-center space-x-4 hover:bg-gray-50 rounded-lg p-2 transition-colors group"
                            >
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                        isStaffMode
                                            ? "bg-red-400 group-hover:bg-red-500"
                                            : "bg-yellow-400 group-hover:bg-yellow-500"
                                    }`}
                                >
                                    <span className="text-2xl">
                                        {isStaffMode ? "👨‍💼" : "🐝"}
                                    </span>
                                </div>
                                <div>
                                    <h1
                                        className={`text-2xl font-bold transition-colors ${
                                            isStaffMode
                                                ? "text-red-700"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        Busy Bees POS {isStaffMode && "(Staff Mode)"}
                                    </h1>
                                    <p
                                        className={`text-sm transition-colors ${
                                            isStaffMode
                                                ? "text-red-600"
                                                : "text-gray-600"
                                        }`}
                                    >
                                        {isStaffMode
                                            ? "Staff Management System"
                                            : "Point of Sale & Check-in System"}
                                    </p>
                                </div>
                            </button>

                            <div className="flex items-center space-x-4">
                                {currentCustomer && !isStaffMode && (
                                    <>
                                        {/* Inactivity Timer */}
                                        <div className="text-xs text-gray-400 font-mono">
                                            {inactivityCountdown}s
                                        </div>

                                        {/* Payment Method Selector */}
                                        <div className="relative payment-dropdown">
                                            <button
                                                onClick={() =>
                                                    setShowPaymentDropdown(
                                                        !showPaymentDropdown
                                                    )
                                                }
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                                            >
                                                <span>💳</span>
                                                <span>
                                                    {(() => {
                                                        const defaultCard =
                                                            getDefaultCard();
                                                        return defaultCard
                                                            ? `${defaultCard.brand} •••• ${defaultCard.last4}`
                                                            : "Add Payment";
                                                    })()}
                                                </span>
                                                <span
                                                    className={`transform transition-transform ${
                                                        showPaymentDropdown
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    ▼
                                                </span>
                                            </button>

                                            {/* Payment Dropdown */}
                                            {showPaymentDropdown && (
                                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                                    <div className="py-2">
                                                        {/* Existing Cards */}
                                                        {currentCustomer.savedCards
                                                            .length > 0 && (
                                                            <>
                                                                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                                    Saved Cards
                                                                </div>
                                                                {currentCustomer.savedCards.map(
                                                                    (card) => (
                                                                        <button
                                                                            key={
                                                                                card.id
                                                                            }
                                                                            onClick={() =>
                                                                                handleSetDefaultCard(
                                                                                    card.id
                                                                                )
                                                                            }
                                                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center justify-between ${
                                                                                card.isDefault
                                                                                    ? "bg-blue-50 text-blue-700"
                                                                                    : "text-gray-700"
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center space-x-3">
                                                                                <span>
                                                                                    💳
                                                                                </span>
                                                                                <div>
                                                                                    <div className="font-medium">
                                                                                        {
                                                                                            card.brand
                                                                                        }{" "}
                                                                                        ••••{" "}
                                                                                        {
                                                                                            card.last4
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500">
                                                                                        Expires{" "}
                                                                                        {card.expiryMonth
                                                                                            .toString()
                                                                                            .padStart(
                                                                                                2,
                                                                                                "0"
                                                                                            )}

                                                                                        /
                                                                                        {card.expiryYear
                                                                                            .toString()
                                                                                            .slice(
                                                                                                -2
                                                                                            )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {card.isDefault && (
                                                                                <span className="text-blue-600 text-xs font-medium">
                                                                                    DEFAULT
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )
                                                                )}
                                                                <hr className="my-2 border-gray-200" />
                                                            </>
                                                        )}

                                                        {/* Add New Card */}
                                                        <button
                                                            onClick={() => {
                                                                setShowPaymentDropdown(
                                                                    false
                                                                );
                                                                setShowPaymentModal(
                                                                    true
                                                                );
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                                                        >
                                                            <span>➕</span>
                                                            <span>
                                                                Add New Payment Method
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Settings Dropdown */}
                                        <div className="relative settings-dropdown">
                                            <button
                                                onClick={() =>
                                                    setShowSettingsDropdown(
                                                        !showSettingsDropdown
                                                    )
                                                }
                                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                                            >
                                                <span>⚙️</span>
                                                <span>Settings</span>
                                                <span
                                                    className={`transform transition-transform ${
                                                        showSettingsDropdown
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    ▼
                                                </span>
                                            </button>

                                            {/* Settings Dropdown */}
                                            {showSettingsDropdown && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                                    <div className="py-2">
                                                        <button
                                                            onClick={() => {
                                                                setCurrentView(
                                                                    "checkin"
                                                                );
                                                                setShowSettingsDropdown(
                                                                    false
                                                                );
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                                                                currentView ===
                                                                "checkin"
                                                                    ? "text-yellow-700 bg-yellow-50 font-medium"
                                                                    : "text-gray-700"
                                                            }`}
                                                        >
                                                            <span>✅</span>
                                                            <span>Check In</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentView(
                                                                    "customer"
                                                                );
                                                                setShowSettingsDropdown(
                                                                    false
                                                                );
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                                                                currentView ===
                                                                "customer"
                                                                    ? "text-yellow-700 bg-yellow-50 font-medium"
                                                                    : "text-gray-700"
                                                            }`}
                                                        >
                                                            <span>👤</span>
                                                            <span>My Account</span>
                                                        </button>
                                                        <hr className="my-1 border-gray-200" />
                                                        <button
                                                            onClick={() => {
                                                                handleLogout();
                                                                setShowSettingsDropdown(
                                                                    false
                                                                );
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                                        >
                                                            <span>🚪</span>
                                                            <span>Logout</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {currentView === "login" && !isStaffMode ? (
                <PhoneLogin
                    customers={customers}
                    onLogin={handleLogin}
                    onNewCustomer={(customer) => {
                        setCustomers([...customers, customer]);
                        handleLogin(customer);
                    }}
                    onAdminAccess={handleAdminAccessFromWelcome}
                />
            ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {currentView === "customer" && currentCustomer && (
                        <CustomerDashboard
                            customer={currentCustomer}
                            onUpdateCustomer={(updatedCustomer) => {
                                setCurrentCustomer(updatedCustomer);
                                setCustomers(
                                    customers.map((c) =>
                                        c.id === updatedCustomer.id
                                            ? updatedCustomer
                                            : c
                                    )
                                );
                            }}
                        />
                    )}

                    {currentView === "checkin" && (
                        <CheckIn
                            customers={customers}
                            currentCustomer={currentCustomer}
                            isStaffMode={isStaffMode}
                            onUpdateCustomer={(updatedCustomer) => {
                                if (currentCustomer?.id === updatedCustomer.id) {
                                    setCurrentCustomer(updatedCustomer);
                                }
                                setCustomers(
                                    customers.map((c) =>
                                        c.id === updatedCustomer.id
                                            ? updatedCustomer
                                            : c
                                    )
                                );
                            }}
                        />
                    )}

                    {currentView === "admin" && isStaffMode && (
                        <AdminPanel
                            customers={customers}
                            onUpdateCustomers={setCustomers}
                            promos={promos}
                            onUpdatePromos={setPromos}
                            passes={passes}
                            onUpdatePasses={setPasses}
                            parties={parties}
                            onUpdateParties={setParties}
                            products={products}
                            onUpdateProducts={setProducts}
                            volumeDiscounts={volumeDiscounts}
                            onUpdateVolumeDiscounts={setVolumeDiscounts}
                        />
                    )}
                </div>
            )}

            {/* PIN Authentication Modal */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🔒</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Staff Access Required
                            </h2>
                            <p className="text-gray-600">
                                Enter PIN to access Staff Mode
                            </p>
                        </div>

                        <form onSubmit={handlePinSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Enter 4-digit PIN"
                                    className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 tracking-widest"
                                    maxLength={4}
                                    autoFocus
                                />
                            </div>

                            {pinError && (
                                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">
                                    {pinError}
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={handlePinCancel}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pin.length !== 4}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    Enter
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 text-xs text-gray-500 text-center">
                            Staff members only • Authorized access required
                        </div>
                    </div>
                </div>
            )}

            {/* Inactivity Warning Modal */}
            {showInactivityWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-orange-400">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">⏰</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Session Timeout Warning
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Your session will automatically end due to inactivity.
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <p className="text-orange-800 font-bold text-lg">
                                    Auto-logout in:{" "}
                                    <span className="text-2xl text-orange-600">
                                        {countdownSeconds}
                                    </span>{" "}
                                    seconds
                                </p>
                            </div>
                            <p className="text-sm text-gray-500">
                                This helps ensure the next customer can use the system.
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleAutoLogout}
                                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                            >
                                🏠 Start New Session
                            </button>
                            <button
                                onClick={handleResumeSession}
                                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                            >
                                ⚡ Resume Session
                            </button>
                        </div>

                        <div className="mt-3 text-center">
                            <div className="text-xs text-gray-400 font-mono">
                                {countdownSeconds}s remaining
                            </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500 text-center">
                            Self-serve mode • Automatic session management
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal - Integrated with Stripe */}
            <AddPaymentMethodModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={async () => {
                    await fetchSavedCards();
                    setShowPaymentModal(false);
                    setShowPaymentSuccessModal(true);
                    setPaymentSuccessDetails({
                        cardBrand: 'Card',
                        last4: '****',
                        saved: true,
                    });
                }}
            />

            {/* Legacy Payment Modal - Keeping structure for reference but not rendered */}
            {false && showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">💳</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Add Payment Method
                            </h2>
                            <p className="text-gray-600">
                                Enter your card details to make purchases
                            </p>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleAddPaymentMethod();
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cardholder Name
                                </label>
                                <input
                                    type="text"
                                    value={cardholderName}
                                    onChange={(e) => setCardholderName(e.target.value)}
                                    placeholder="John Smith"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={processingPayment}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Card Number
                                </label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        if (value.length <= 16) {
                                            setCardNumber(value);
                                        }
                                    }}
                                    placeholder="1234 5678 9012 3456"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    disabled={processingPayment}
                                    maxLength={19}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="text"
                                        value={expiryDate}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(
                                                /\D/g,
                                                ""
                                            );
                                            if (value.length >= 2) {
                                                value =
                                                    value.substring(0, 2) +
                                                    "/" +
                                                    value.substring(2, 4);
                                            }
                                            if (value.length <= 5) {
                                                setExpiryDate(value);
                                            }
                                        }}
                                        placeholder="MM/YY"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                        disabled={processingPayment}
                                        maxLength={5}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        CVV
                                    </label>
                                    <input
                                        type="text"
                                        value={cvv}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(
                                                /\D/g,
                                                ""
                                            );
                                            if (value.length <= 4) {
                                                setCvv(value);
                                            }
                                        }}
                                        placeholder="123"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                        disabled={processingPayment}
                                        maxLength={4}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="saveCard"
                                    checked={saveCard}
                                    onChange={(e) => setSaveCard(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    disabled={processingPayment}
                                />
                                <label
                                    htmlFor="saveCard"
                                    className="text-sm text-gray-700"
                                >
                                    I'd like to store this card for future payments
                                </label>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClosePaymentModal}
                                    disabled={processingPayment}
                                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        processingPayment ||
                                        !cardNumber ||
                                        !expiryDate ||
                                        !cvv ||
                                        !cardholderName
                                    }
                                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    {processingPayment
                                        ? "💳 Processing..."
                                        : saveCard
                                        ? "💾 Save Card"
                                        : "✓ Add Payment"}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-xs text-gray-500 text-center">
                            🔒 Your payment information is secure and encrypted
                        </div>
                    </div>
                </div>
            )}

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
                                            {currentCustomer?.savedCards.length === 1
                                                ? "your default"
                                                : "a new"}{" "}
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
        </div>
    );
}
