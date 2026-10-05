'use client';

/**
 * "Who's coming?" for day passes bought in My Account.
 *
 * The parent ticks any number of children and sees each one's price before
 * paying: the pass comes from the child's age and the sibling discount comes
 * off the cheaper passes, worked out by the same quotePasses the POS uses.
 * The server prices the sale again and refuses it if the total differs, so
 * what is shown here is what is charged.
 */

import { useMemo, useState } from 'react';
import { quotePasses, type SelectablePass, type SiblingRule } from '@/lib/pos/passSelection';
import { formatCurrency } from '@/lib/utils/productHelpers';
import type { Child } from '@/lib/types/customer';

interface DayPassPickerProps {
  /** Children who may have a day pass today: waiver signed, none bought yet. */
  eligibleChildren: Child[];
  passes: SelectablePass[];
  siblingRules: SiblingRule[];
  isMember: boolean;
  cardLast4: string;
  giftCardBalance: number;
  onCancel: () => void;
  onPay: (childIds: string[], shownTotal: number) => Promise<void>;
}

export function DayPassPicker({
  eligibleChildren,
  passes,
  siblingRules,
  isMember,
  cardLast4,
  giftCardBalance,
  onCancel,
  onPay,
}: DayPassPickerProps) {
  // One child on the account is obviously the one coming; otherwise the
  // parent ticks who is, as at the front desk.
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    eligibleChildren.length === 1 ? [eligibleChildren[0].id] : []
  );
  const [paying, setPaying] = useState(false);

  const quote = useMemo(
    () =>
      quotePasses(
        eligibleChildren.filter((c) => selectedIds.includes(c.id)),
        'day',
        passes,
        siblingRules,
        isMember
      ),
    [eligibleChildren, selectedIds, passes, siblingRules, isMember]
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const giftCredit = Math.min(giftCardBalance, quote.total);
  const canPay = !paying && quote.lines.length > 0 && quote.unresolved.length === 0;

  const pay = async () => {
    setPaying(true);
    try {
      await onPay(
        quote.lines.map((l) => l.child.id),
        quote.total
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !paying) onCancel();
      }}
    >
      {/* Inline so the list scrolls on a phone with many children. */}
      <div
        className="bg-white p-6 rounded-lg max-w-md w-full relative"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <button
          onClick={onCancel}
          disabled={paying}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold mb-1">Who&apos;s coming?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Tick everyone who needs a day pass. Brothers and sisters get the sibling discount.
        </p>

        <div className="space-y-2">
          {eligibleChildren.map((child) => {
            const selected = selectedIds.includes(child.id);
            const line = quote.lines.find((l) => l.child.id === child.id);
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => toggle(child.id)}
                disabled={paying}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${
                  selected
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xl ${selected ? 'text-green-600' : 'text-gray-300'}`}>
                      {selected ? '✅' : '⬜'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{child.name}</p>
                      {line && <p className="text-xs text-gray-500">{line.pass.name}</p>}
                    </div>
                  </div>
                  {line && (
                    <div className="text-right">
                      {line.discountPercent > 0 && (
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(line.basePrice)}</p>
                      )}
                      <p className="font-semibold text-gray-900">{formatCurrency(line.price)}</p>
                      {line.discountPercent > 0 && (
                        <p className="text-xs text-green-700">Sibling {line.discountPercent}% off</p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {quote.unresolved.length > 0 && (
          <p className="mt-3 text-sm text-red-600">
            No day pass is set up for {quote.unresolved.map((c) => c.name).join(', ')}. Please ask at the front desk.
          </p>
        )}

        {quote.lines.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex justify-between font-semibold text-gray-900 text-base">
              <span>Total</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
            {quote.savings > 0 && (
              <p className="text-green-700 mt-1">You save {formatCurrency(quote.savings)} with the sibling discount</p>
            )}
            {giftCredit > 0 && (
              <p className="text-amber-700 mt-1">
                🎁 {giftCredit >= quote.total
                  ? 'Fully covered by your gift card balance'
                  : `${formatCurrency(giftCredit)} gift card credit will be applied`}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={paying}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={!canPay}
            className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
          >
            {paying
              ? 'Processing…'
              : quote.lines.length === 0
              ? 'Choose who’s coming'
              : `Pay ${formatCurrency(quote.total)} (•••• ${cardLast4})`}
          </button>
        </div>
      </div>
    </div>
  );
}
