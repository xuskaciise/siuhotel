"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, ClipboardSignature, Pencil, Plus } from "lucide-react";

import { EntityImagesModal, EntityImagesTriggerButton } from "@/components/rooms/entity-images-modal";
import { GlassModal } from "@/components/rooms/glass-modal";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  createRoomTypeClient,
  fetchRoomTypesClient,
  updateRoomTypeClient,
  type RoomTypeDto,
} from "@/lib/api/apiService";
import { paginateArray } from "@/lib/pagination";
import { useUrlPagination } from "@/lib/use-url-pagination";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass = "mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#9aa8bc]";

function formatMoneyFromDecimalString(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

type RoomTypesClientProps = {
  initialTypes: RoomTypeDto[];
  loadError: string | null;
};

export function RoomTypesClient({ initialTypes, loadError }: RoomTypesClientProps) {
  const router = useRouter();
  const [types, setTypes] = useState<RoomTypeDto[]>(initialTypes);
  const [error, setError] = useState<string | null>(loadError);
  const pageSize = 9;
  const { state: paging, setPage, reset: resetPage } = useUrlPagination({ pageSize, pageParam: "page" });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [photosTypeId, setPhotosTypeId] = useState<string | null>(null);

  useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);

  const sortedTypes = useMemo(() => [...types].sort((a, b) => a.name.localeCompare(b.name)), [types]);
  const { items: pagedTypes, meta } = useMemo(() => paginateArray(sortedTypes, paging), [sortedTypes, paging]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRoomTypesClient();
      setTypes(data);
      router.refresh();
      resetPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load room types.");
    }
  }, [router, resetPage]);

  function openAdd() {
    setEditingId(null);
    setName("");
    setBasePrice("");
    setDescription("");
    setFormError(null);
    setAddOpen(true);
  }

  function openEdit(t: RoomTypeDto) {
    setEditingId(t.id);
    setName(t.name);
    setBasePrice(t.basePrice);
    setDescription(t.description ?? "");
    setFormError(null);
    setEditOpen(true);
  }

  async function submitAdd() {
    setFormError(null);
    const price = Number.parseFloat(basePrice);
    if (!name.trim() || Number.isNaN(price) || price <= 0) {
      setFormError("Name and a positive base price are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createRoomTypeClient({
        name: name.trim(),
        basePrice: price,
        description: description.trim() || undefined,
      });
      setAddOpen(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create category.");
    } finally {
      setSubmitting(false);
    }
  }

  const photosType = photosTypeId ? types.find((x) => x.id === photosTypeId) : undefined;

  async function submitEdit() {
    if (!editingId) return;
    setFormError(null);
    const priceNum = Number.parseFloat(basePrice);
    if (!name.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setFormError("Name and a positive base price are required.");
      return;
    }
    setSubmitting(true);
    try {
      await updateRoomTypeClient(editingId, {
        name: name.trim(),
        basePrice: priceNum,
        description: description.trim() === "" ? null : description.trim(),
      });
      setEditOpen(false);
      setEditingId(null);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not update category.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-medium ring-0",
            "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-100",
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={openAdd}
          className={cn(
            "h-11 rounded-full border-0 px-6 font-semibold ring-0",
            "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322]",
            "shadow-[0_10px_32px_rgb(0_204_255/0.3)] hover:from-[#33d6ff] hover:to-[#00b4ea]",
          )}
        >
          <Plus className="mr-2 size-4" strokeWidth={2} />
          Add room type
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pagedTypes.map((t) => (
          <article
            key={t.id}
            className={cn(
              "rounded-2xl p-[1px] ring-0",
              "bg-gradient-to-br from-[rgb(0_204_255/0.14)] via-transparent to-[rgb(19_27_46/0.35)]",
            )}
          >
            <div
              className={cn(
                "flex h-full flex-col rounded-[0.95rem] p-6 ring-0",
                "bg-white/92 shadow-[0_14px_44px_rgb(15_23_42/0.07)] dark:bg-[rgb(18_24_38/0.94)]",
                "dark:shadow-[0_18px_50px_rgb(0_0_0/0.38)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground dark:text-white">
                    {t.name}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tabular-nums text-primary dark:text-[#9de2ff]">
                    <BadgeDollarSign className="size-5 opacity-80" strokeWidth={1.75} aria-hidden="true" />
                    {formatMoneyFromDecimalString(t.basePrice)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <EntityImagesTriggerButton onClick={() => setPhotosTypeId(t.id)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => openEdit(t)}
                    className={cn(
                      "rounded-full border-0 ring-0",
                      "bg-[rgb(255_255_255/0.55)] text-foreground shadow-[0_4px_16px_rgb(15_23_42/0.08)] backdrop-blur-md",
                      "hover:bg-white dark:bg-[rgb(255_255_255/0.08)] dark:text-white dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
                    )}
                    aria-label={`Edit ${t.name}`}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
              {t.description ? (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground dark:text-[#a8b4c4]">
                  {t.description}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-muted-foreground/70 dark:text-[#7a8799]">
                  No description yet.
                </p>
              )}
              <p className="mt-3 text-[0.65rem] font-medium leading-snug text-muted-foreground dark:text-[#8a97a8]">
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide">
                  <ClipboardSignature className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden="true" />
                  Created by
                </span>{" "}
                <span className="text-foreground/85 dark:text-white/75">
                  {t.createdBy?.fullName ?? "—"}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>

      {types.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground dark:text-[#9aa8bc]">
          No room categories yet. Add a deluxe suite, penthouse, or standard tier to begin.
        </p>
      ) : null}

      {types.length > 0 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={meta.pageSize}
          onPageChange={(p) => setPage(p, meta.totalItems)}
        />
      ) : null}

      <EntityImagesModal
        open={Boolean(photosType)}
        onOpenChange={(o) => {
          if (!o) setPhotosTypeId(null);
        }}
        variant="room-type"
        entityId={photosType?.id ?? ""}
        title={photosType ? `Photos — ${photosType.name}` : "Photos"}
        subtitle="Manage category photos stored in MinIO."
        paths={photosType?.images ?? []}
        onUpdated={reload}
      />

      <GlassModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add room type"
        description="Define a sellable category with a nightly base rate. This groups physical rooms for pricing and availability."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setAddOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => void submitAdd()}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Create category"}
            </Button>
          </>
        }
      >
        <TypeFormFields
          name={name}
          setName={setName}
          basePrice={basePrice}
          setBasePrice={setBasePrice}
          description={description}
          setDescription={setDescription}
          formError={formError}
        />
      </GlassModal>

      <GlassModal
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingId(null);
        }}
        title="Edit room type"
        description="Adjust naming, rate, or copy shown to your team in the inventory view."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setEditOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => void submitEdit()}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <TypeFormFields
          name={name}
          setName={setName}
          basePrice={basePrice}
          setBasePrice={setBasePrice}
          description={description}
          setDescription={setDescription}
          formError={formError}
        />
      </GlassModal>
    </div>
  );
}

function TypeFormFields({
  name,
  setName,
  basePrice,
  setBasePrice,
  description,
  setDescription,
  formError,
}: {
  name: string;
  setName: (v: string) => void;
  basePrice: string;
  setBasePrice: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  formError: string | null;
}) {
  return (
    <div className="space-y-4">
      {formError ? (
        <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
          {formError}
        </p>
      ) : null}
      <div>
        <label className={labelClass} htmlFor="rt-name">
          Name
        </label>
        <input
          id="rt-name"
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deluxe Ocean Suite"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="rt-price">
          Base price (USD / night)
        </label>
        <input
          id="rt-price"
          type="number"
          min={0}
          step="0.01"
          className={fieldClass}
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          placeholder="449"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="rt-desc">
          Description
        </label>
        <textarea
          id="rt-desc"
          rows={4}
          className={cn(fieldClass, "min-h-[100px] resize-y")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes for staff and CMS."
        />
      </div>
    </div>
  );
}
