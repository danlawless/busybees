"use client";

import { useCallback, useEffect, useState } from "react";
import { WaiverModal } from "@/components/ui/WaiverModal";

interface GuestEntry {
    purchaseId: string;
    childName: string;
    checkedInAt: string;
    visitOpen: boolean;
}

interface GuestPassStatus {
    open: boolean;
    hasMembership: boolean;
    allowance: number;
    used: number;
    remaining: number;
    guests: GuestEntry[];
}

interface ExistingChild {
    id: string;
    name: string;
    birthdate: string;
    waiverSigned: boolean;
}

type CheckResult =
    | { kind: "new" }
    | { kind: "existing"; parentName: string; children: ExistingChild[] }
    | { kind: "not_eligible"; message: string }
    | { kind: "conflict"; message: string };

type Step = "phone" | "existing" | "new" | "waiver" | "done";

interface ApiError {
    error?: string;
    reason?: string;
}

const NEW_CHILD = "__new__";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const inputClass = "w-full rounded-lg border border-gray-300 px-4 py-3 text-lg";
const primaryButton =
    "rounded-lg bg-amber-500 px-6 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300";
const secondaryButton =
    "rounded-lg border border-gray-300 bg-white px-6 py-3 text-lg font-semibold text-gray-700";

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
    });
}

async function readError(response: Response): Promise<ApiError> {
    try {
        return (await response.json()) as ApiError;
    } catch {
        return { error: "Something went wrong. Please try again." };
    }
}

export function GuestPassPanel({ customerId }: { customerId: string }) {
    const [status, setStatus] = useState<GuestPassStatus | null>(null);
    const [panelError, setPanelError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [step, setStep] = useState<Step>("phone");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isNewFamily, setIsNewFamily] = useState(false);
    const [phone, setPhone] = useState("");
    const [parentName, setParentName] = useState("");
    const [email, setEmail] = useState("");
    const [existingChildren, setExistingChildren] = useState<ExistingChild[]>([]);
    const [selectedChild, setSelectedChild] = useState<string>("");
    const [childName, setChildName] = useState("");
    const [childBirthdate, setChildBirthdate] = useState("");
    const [doneMessage, setDoneMessage] = useState("");

    const loadStatus = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/guest-passes?customer_id=${encodeURIComponent(customerId)}`
            );
            if (!response.ok) {
                setStatus(null);
                return;
            }
            setStatus((await response.json()) as GuestPassStatus);
        } catch {
            setStatus(null);
        }
    }, [customerId]);

    useEffect(() => {
        setStatus(null);
        setPanelError(null);
        void loadStatus();
    }, [loadStatus]);

    if (!status || !status.open || !status.hasMembership) return null;

    const noneLeft = status.remaining <= 0;
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneValid = phoneDigits.length === 10;
    const usingNewChild = isNewFamily || selectedChild === NEW_CHILD;
    const newChildValid = childName.trim().length > 0 && DATE_RE.test(childBirthdate);
    const childValid = usingNewChild ? newChildValid : selectedChild !== "";
    const familyValid = !isNewFamily || (parentName.trim().length > 0 && EMAIL_RE.test(email.trim()));
    const canContinueToWaiver = childValid && familyValid;

    const chosenExisting = existingChildren.find((c) => c.id === selectedChild);
    const waiverChildName = usingNewChild ? childName.trim() : chosenExisting?.name ?? "";

    const openDialog = () => {
        setPhone("");
        setParentName("");
        setEmail("");
        setExistingChildren([]);
        setIsNewFamily(false);
        setSelectedChild("");
        setChildName("");
        setChildBirthdate("");
        setError(null);
        setStep("phone");
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setBusy(false);
    };

    const checkPhone = async () => {
        setBusy(true);
        setError(null);
        try {
            const response = await fetch("/api/guest-passes/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ member_id: customerId, phone }),
            });
            if (!response.ok) {
                setError((await readError(response)).error ?? "Could not check that number.");
                return;
            }
            const result = (await response.json()) as CheckResult;
            if (result.kind === "not_eligible" || result.kind === "conflict") {
                setError(result.message);
            } else if (result.kind === "existing") {
                setParentName(result.parentName);
                setExistingChildren(result.children);
                setSelectedChild(result.children[0]?.id ?? NEW_CHILD);
                setIsNewFamily(false);
                setStep("existing");
            } else {
                setIsNewFamily(true);
                setStep("new");
            }
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const issuePass = async () => {
        setBusy(true);
        setError(null);
        const childPart = usingNewChild
            ? { child: { name: childName.trim(), birthdate: childBirthdate } }
            : { child_id: selectedChild };
        const familyPart = isNewFamily
            ? { parent_name: parentName.trim(), email: email.trim() }
            : {};
        try {
            const response = await fetch("/api/guest-passes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member_id: customerId,
                    phone,
                    ...familyPart,
                    ...childPart,
                    waiver_agreed: true,
                }),
            });
            if (!response.ok) {
                const body = await readError(response);
                const message = body.error ?? "Could not issue the guest pass.";
                if (response.status === 409 && body.reason === "none_left") {
                    setPanelError(message);
                    closeDialog();
                    void loadStatus();
                    return;
                }
                setError(message);
                setStep(isNewFamily ? "new" : "existing");
                return;
            }
            const created = (await response.json()) as { remaining: number };
            setDoneMessage(
                `${waiverChildName} is checked in as this member's guest. ${created.remaining} left.`
            );
            setStep("done");
            void loadStatus();
        } catch {
            setError("Could not reach the server. Please try again.");
            setStep(isNewFamily ? "new" : "existing");
        } finally {
            setBusy(false);
        }
    };

    const undoGuest = async (guest: GuestEntry) => {
        if (!window.confirm(`Undo ${guest.childName}'s guest pass? This checks them out and gives the pass back.`)) {
            return;
        }
        setPanelError(null);
        try {
            const response = await fetch(`/api/guest-passes/${encodeURIComponent(guest.purchaseId)}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                setPanelError((await readError(response)).error ?? "Could not undo that guest pass.");
            }
        } catch {
            setPanelError("Could not reach the server. Please try again.");
        }
        void loadStatus();
    };

    return (
        <div className="mt-3 rounded-lg bg-amber-100 border border-amber-400 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🐝</span>
                    <span className="text-sm font-bold text-amber-900">
                        Bring a friend — {status.remaining} of {status.allowance} left this membership
                    </span>
                </div>
                <button
                    type="button"
                    onClick={openDialog}
                    disabled={noneLeft}
                    className={primaryButton}
                >
                    Bring a friend
                </button>
            </div>
            {noneLeft && (
                <p className="mt-1 text-xs text-amber-800">Resets when the membership renews</p>
            )}
            {panelError && <p className="mt-2 text-sm font-semibold text-red-700">{panelError}</p>}
            {status.guests.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {status.guests.map((guest) => (
                        <li key={guest.purchaseId} className="flex items-center justify-between gap-3 text-sm text-amber-900">
                            <span>
                                {guest.childName} · {formatTime(guest.checkedInAt)}
                            </span>
                            {guest.visitOpen && (
                                <button
                                    type="button"
                                    onClick={() => void undoGuest(guest)}
                                    className="rounded-lg border border-amber-500 bg-white px-3 py-1 font-semibold text-amber-900"
                                >
                                    Undo
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {dialogOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Bring a friend"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        padding: 16,
                    }}
                >
                    <div
                        className="bg-white text-gray-900"
                        style={{
                            width: "100%",
                            maxWidth: 520,
                            maxHeight: "90vh",
                            overflowY: "auto",
                            borderRadius: 16,
                            padding: 24,
                        }}
                    >
                        <h2 className="mb-4 text-2xl font-bold">🐝 Bring a friend</h2>

                        {step === "phone" && (
                            <div className="space-y-4">
                                <label className="block text-lg font-semibold">
                                    Friend&apos;s parent phone number
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        autoFocus
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={`${inputClass} mt-1 font-normal`}
                                    />
                                </label>
                                {error && <p className="text-base font-semibold text-red-700">{error}</p>}
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={closeDialog} className={secondaryButton}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void checkPhone()}
                                        disabled={!phoneValid || busy}
                                        className={primaryButton}
                                    >
                                        {busy ? "Checking…" : "Continue"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {(step === "existing" || step === "new") && (
                            <div className="space-y-4">
                                {step === "existing" ? (
                                    <>
                                        <p className="text-lg font-semibold">Welcome back, {parentName}</p>
                                        <div className="space-y-2">
                                            {existingChildren.map((child) => (
                                                <label key={child.id} className="flex items-center gap-3 text-lg">
                                                    <input
                                                        type="radio"
                                                        name="guest-child"
                                                        checked={selectedChild === child.id}
                                                        onChange={() => setSelectedChild(child.id)}
                                                    />
                                                    {child.name}
                                                </label>
                                            ))}
                                            <label className="flex items-center gap-3 text-lg">
                                                <input
                                                    type="radio"
                                                    name="guest-child"
                                                    checked={selectedChild === NEW_CHILD}
                                                    onChange={() => setSelectedChild(NEW_CHILD)}
                                                />
                                                Add a different child
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-lg font-semibold">
                                            Phone
                                            <input type="tel" value={phone} readOnly className={`${inputClass} mt-1 bg-gray-100 font-normal`} />
                                        </label>
                                        <label className="block text-lg font-semibold">
                                            Parent name
                                            <input
                                                type="text"
                                                value={parentName}
                                                onChange={(e) => setParentName(e.target.value)}
                                                className={`${inputClass} mt-1 font-normal`}
                                            />
                                        </label>
                                        <label className="block text-lg font-semibold">
                                            Email
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={`${inputClass} mt-1 font-normal`}
                                            />
                                        </label>
                                    </>
                                )}
                                {usingNewChild && (
                                    <>
                                        <label className="block text-lg font-semibold">
                                            Child&apos;s name
                                            <input
                                                type="text"
                                                value={childName}
                                                onChange={(e) => setChildName(e.target.value)}
                                                className={`${inputClass} mt-1 font-normal`}
                                            />
                                        </label>
                                        <label className="block text-lg font-semibold">
                                            Child&apos;s birthdate
                                            <input
                                                type="date"
                                                value={childBirthdate}
                                                onChange={(e) => setChildBirthdate(e.target.value)}
                                                className={`${inputClass} mt-1 font-normal`}
                                            />
                                        </label>
                                    </>
                                )}
                                {error && <p className="text-base font-semibold text-red-700">{error}</p>}
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={closeDialog} className={secondaryButton}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError(null);
                                            setStep("waiver");
                                        }}
                                        disabled={!canContinueToWaiver}
                                        className={primaryButton}
                                    >
                                        Continue to waiver
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === "done" && (
                            <div className="space-y-4">
                                <p className="text-lg font-semibold text-green-800">{doneMessage}</p>
                                <div className="flex justify-end">
                                    <button type="button" onClick={closeDialog} className={primaryButton}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <WaiverModal
                isOpen={dialogOpen && step === "waiver"}
                onClose={() => setStep(isNewFamily ? "new" : "existing")}
                childName={waiverChildName}
                onAgree={() => void issuePass()}
                isSubmitting={busy}
            />
        </div>
    );
}
