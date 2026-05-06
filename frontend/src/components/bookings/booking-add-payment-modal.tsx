"use client";

import { useEffect, useMemo, useState } from "react";

import { GlassModal } from "@/components/rooms/glass-modal";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass =
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

const methods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "EVC_PLUS", label: "EVC Plus" },
  { value: "PREMIER_BANK", label: "Premier Bank" },
  { value: "SAHAL", label: "Sahal" },
];

export type BookingPaymentSubmitInput = {
  amount: number;
  paymentMethod: PaymentMethod;
  /** Optional staff-visible note; not persisted by the transaction API (see parent). */
  staffReference?: string;
};

export type BookingAddPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingLabel: string;
  outstandingUsd: number;
  /** When true, shows an optional reference / memo field (session-only unless parent maps it). */
  showStaffReferenceField?: boolean;
  onSubmit: (input: BookingPaymentSubmitInput) => Promise<void>;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function BookingAddPaymentModal({
  open,
  onOpenChange,
  bookingLabel,
  outstandingUsd,
  showStaffReferenceField = false,
  onSubmit,
}: BookingAddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [staffReference, setStaffReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hint = useMemo(() => {
    if (!Number.isFinite(outstandingUsd) || outstandingUsd <= 0) return "No balance remaining.";
    return `Outstanding: ${formatMoney(outstandingUsd)}`;
  }, [outstandingUsd]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setPaymentMethod("CASH");
    setStaffReference("");
    if (Number.isFinite(outstandingUsd) && outstandingUsd > 0) {
      setAmount(outstandingUsd.toFixed(2));
    } else {
      setAmount("");
    }
  }, [open, outstandingUsd]);

  async function handleSave() {
    setError(null);
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (outstandingUsd > 0 && n - outstandingUsd > 0.009) {
      setError(`Amount cannot exceed the outstanding balance (${formatMoney(outstandingUsd)}).`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        amount: n,
        paymentMethod,
        staffReference: showStaffReferenceField && staffReference.trim() ? staffReference.trim() : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add payment"
      description={bookingLabel}
      footer={
        <>
          <Button type="button" variant="ghost" className="rounded-full border-0" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
            onClick={() => void handleSave()}
            disabled={submitting || outstandingUsd <= 0}
          >
            {submitting ? "Saving…" : "Record payment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground dark:text-[#a8b4c4]">{hint}</p>

        {error ? (
          <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <label className={labelClass} htmlFor="pay-amount">
            Amount (USD)
          </label>
          <input
            id="pay-amount"
            inputMode="decimal"
            className={fieldClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="pay-method">
            Payment method
          </label>
          <select
            id="pay-method"
            className={cn(fieldClass, "cursor-pointer")}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {showStaffReferenceField ? (
          <div>
            <label className={labelClass} htmlFor="pay-ref">
              Note / reference (optional)
            </label>
            <textarea
              id="pay-ref"
              className={cn(fieldClass, "min-h-[4.5rem] resize-y")}
              value={staffReference}
              onChange={(e) => setStaffReference(e.target.value)}
              placeholder="Receipt #, POS batch, or internal memo…"
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-muted-foreground dark:text-white/45">
              Not stored on the server today — shown next to this payment in your session after save.
            </p>
          </div>
        ) : null}
      </div>
    </GlassModal>
  );
}
