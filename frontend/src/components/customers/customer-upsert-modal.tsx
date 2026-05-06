"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";

import { EntityImagesModal, EntityImagesTriggerButton } from "@/components/rooms/entity-images-modal";
import { GlassModal } from "@/components/rooms/glass-modal";
import { Button } from "@/components/ui/button";
import {
  createWalkInCustomerClient,
  updateCustomerClient,
  type CustomerDto,
  type UpdateCustomerPayload,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass =
  "mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#9aa8bc]";

type CustomerUpsertModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerDto | null;
  onSaved: () => void | Promise<void>;
};

export function CustomerUpsertModal({ open, onOpenChange, customer, onSaved }: CustomerUpsertModalProps) {
  const isEdit = Boolean(customer);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [idCard, setIdCard] = useState("");

  const [photosCustomerId, setPhotosCustomerId] = useState<string | null>(null);

  const activeCustomerId = useMemo(() => (customer?.id ? customer.id : photosCustomerId ?? null), [customer?.id, photosCustomerId]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (customer) {
      setFullName(customer.fullName ?? "");
      setEmail(customer.email ?? "");
      setPhoneNumber(customer.phoneNumber ?? "");
      setAddress(customer.address ?? "");
      setIdCard(customer.idCard ?? "");
      setPhotosCustomerId(customer.id);
    } else {
      setFullName("");
      setEmail("");
      setPhoneNumber("");
      setAddress("");
      setIdCard("");
      setPhotosCustomerId(null);
    }
  }, [open, customer]);

  const save = useCallback(async () => {
    setFormError(null);
    if (!fullName.trim() || !phoneNumber.trim()) {
      setFormError("Name and phone number are required.");
      return;
    }
    setSubmitting(true);
    try {
      let id = customer?.id ?? "";
      if (!id) {
        const created = await createWalkInCustomerClient({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() });
        id = created.id;
        setPhotosCustomerId(created.id);
      }

      const payload: UpdateCustomerPayload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() ? email.trim() : null,
        address: address.trim() ? address.trim() : null,
        idCard: idCard.trim() ? idCard.trim() : null,
      };
      await updateCustomerClient(id, payload);
      await onSaved();
      onOpenChange(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save customer.");
    } finally {
      setSubmitting(false);
    }
  }, [address, customer?.id, email, fullName, idCard, onOpenChange, onSaved, phoneNumber]);

  return (
    <>
      <GlassModal
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? "Edit customer" : "Add customer"}
        description="Create or update a guest profile. Upload a profile photo or ID scan in the same MinIO-backed gallery used for rooms."
        footer={
          <>
            <Button type="button" variant="ghost" className="rounded-full border-0" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => void save()}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save customer"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {formError ? (
            <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground dark:text-white">Profile</p>
            {activeCustomerId ? (
              <EntityImagesTriggerButton
                onClick={() => setPhotosCustomerId(activeCustomerId)}
                label="Upload photo / ID"
              />
            ) : (
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold ring-0 transition",
                  "bg-muted/40 text-foreground hover:bg-muted/55 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]",
                )}
                onClick={() => setFormError("Save the customer first, then upload images.")}
              >
                <ImageIcon className="size-4" strokeWidth={1.75} />
                Upload photo / ID
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="c-fullname">
                Name
              </label>
              <input id="c-fullname" className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div>
              <label className={labelClass} htmlFor="c-email">
                Email
              </label>
              <input
                id="c-email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@siu-hotel.local"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="c-phone">
                Phone
              </label>
              <input id="c-phone" className={fieldClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+252…" />
            </div>

            <div>
              <label className={labelClass} htmlFor="c-id">
                National ID / Passport
              </label>
              <input id="c-id" className={fieldClass} value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="P-1234567" />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="c-address">
                Address
              </label>
              <textarea
                id="c-address"
                rows={3}
                className={cn(fieldClass, "min-h-[90px] resize-y")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Hodan, Mogadishu…"
              />
            </div>
          </div>
        </div>
      </GlassModal>

      <EntityImagesModal
        open={Boolean(photosCustomerId)}
        onOpenChange={(o) => {
          if (!o) setPhotosCustomerId(null);
        }}
        variant="customer"
        entityId={photosCustomerId ?? ""}
        title="Guest images"
        subtitle="Profile photos / ID scans stored in MinIO."
        paths={[]}
        onUpdated={onSaved}
      />
    </>
  );
}

