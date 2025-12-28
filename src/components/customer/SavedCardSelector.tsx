'use client';

/**
 * SavedCardSelector Component
 * Displays saved payment methods and allows selection for one-click purchases
 * Shows card brand icons, last 4 digits, and expiry
 */

import { useState } from 'react';
import { CreditCard, Check, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface SavedCardSelectorProps {
  cards: SavedCard[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onAddCard: () => void;
  disabled?: boolean;
  compact?: boolean;
}

// Card brand icon mapping
const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  default: '💳',
};

const CARD_BRAND_COLORS: Record<string, string> = {
  visa: 'bg-blue-50 border-blue-200',
  mastercard: 'bg-orange-50 border-orange-200',
  amex: 'bg-indigo-50 border-indigo-200',
  discover: 'bg-amber-50 border-amber-200',
  default: 'bg-gray-50 border-gray-200',
};

export function SavedCardSelector({
  cards,
  selectedCardId,
  onSelectCard,
  onAddCard,
  disabled = false,
  compact = false,
}: SavedCardSelectorProps) {
  // Auto-select default card if none selected
  const effectiveSelectedId =
    selectedCardId || cards.find((c) => c.isDefault)?.id || cards[0]?.id || null;

  if (cards.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-yellow-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">No payment method saved</p>
            <p className="text-xs text-yellow-600">Add a card for quick one-click purchases</p>
          </div>
          <Button size="sm" onClick={onAddCard} disabled={disabled}>
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={effectiveSelectedId || ''}
          onChange={(e) => onSelectCard(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 disabled:opacity-50"
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
              {card.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddCard}
          disabled={disabled}
          className="shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Payment Method</label>

      <div className="space-y-2">
        {cards.map((card) => {
          const isSelected = card.id === effectiveSelectedId;
          const brandColor = CARD_BRAND_COLORS[card.brand.toLowerCase()] || CARD_BRAND_COLORS.default;

          return (
            <button
              key={card.id}
              onClick={() => onSelectCard(card.id)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200'
                  : `${brandColor} hover:border-gray-300`
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-yellow-400' : 'bg-white'
                }`}
              >
                {isSelected ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <CreditCard className="w-5 h-5 text-gray-600" />
                )}
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 capitalize">{card.brand}</span>
                  <span className="text-gray-500">•••• {card.last4}</span>
                  {card.isDefault && (
                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Expires {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                </p>
              </div>

              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddCard}
        disabled={disabled}
        className="w-full mt-2"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add New Card
      </Button>
    </div>
  );
}

/**
 * OneClickBuyButton Component
 * Encapsulates the one-click purchase flow with saved cards
 */
interface OneClickBuyButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  productDescription?: string;
  purchaseType: string;
  childId?: string;
  savedCards: SavedCard[];
  selectedCardId: string | null;
  onSuccess: (result: { purchaseId: string; message: string }) => void;
  onError: (error: string) => void;
  onRequiresAuth?: (clientSecret: string) => void;
  onNoCard?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function OneClickBuyButton({
  productId,
  productName,
  productPrice,
  productDescription,
  purchaseType,
  childId,
  savedCards,
  selectedCardId,
  onSuccess,
  onError,
  onRequiresAuth,
  onNoCard,
  disabled = false,
  className = '',
  children,
}: OneClickBuyButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const defaultCard = savedCards.find((c) => c.isDefault) || savedCards[0];
  const cardToUse = selectedCardId
    ? savedCards.find((c) => c.id === selectedCardId)
    : defaultCard;

  const handlePurchase = async () => {
    if (!cardToUse) {
      onNoCard?.();
      onError('Please add a payment method first');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/stripe/direct-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          productPrice,
          productDescription,
          purchaseType,
          childId,
          paymentMethodId: cardToUse.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      if (data.requiresAction && data.clientSecret) {
        // 3DS required - pass to parent to handle with Stripe.js
        onRequiresAuth?.(data.clientSecret);
        return;
      }

      if (data.success) {
        onSuccess({
          purchaseId: data.purchaseId,
          message: data.message,
        });
      }
    } catch (error) {
      console.error('One-click purchase failed:', error);
      onError(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isProcessing || savedCards.length === 0}
      className={className}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        children || (
          <>
            {savedCards.length > 0 && cardToUse ? (
              <>Buy Now (•••• {cardToUse.last4})</>
            ) : (
              <>Add Card to Buy</>
            )}
          </>
        )
      )}
    </Button>
  );
}

