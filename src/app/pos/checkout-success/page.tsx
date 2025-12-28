"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(10);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID found. Please try again.");
      return;
    }

    // Verify the session and show success
    const verifySession = async () => {
      try {
        // The webhook handles the actual purchase creation
        // Here we just show success and redirect back to POS
        setStatus("success");
        setMessage("Your payment was successful! Thank you for your purchase.");
      } catch (error) {
        console.error("Error verifying session:", error);
        setStatus("error");
        setMessage("Unable to verify payment. Please contact staff if you were charged.");
      }
    };

    verifySession();
  }, [sessionId]);

  // Auto-redirect countdown
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      router.push("/pos");
    }
  }, [status, countdown, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Processing Payment...
            </h1>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎉 Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                Redirecting to kiosk in <span className="font-bold">{countdown}</span> seconds...
              </p>
            </div>
            <Button
              onClick={() => router.push("/pos")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Return to Kiosk Now
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              onClick={() => router.push("/pos")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Return to Kiosk
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

