"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, ClipboardSignature, Download, LayoutGrid, List, Pencil, Plus, Trash2 } from "lucide-react";

import { EntityImagesModal, EntityImagesTriggerButton } from "@/components/rooms/entity-images-modal";
import { GlassModal } from "@/components/rooms/glass-modal";
import { RoomStatusBadge } from "@/components/rooms/room-status-badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  createRoomClient,
  deleteRoomClient,
  fetchRoomsClient,
  mapRoomStatusToDisplay,
  presignAssetUrlsClient,
  updateRoomClient,
  type ListRoomsQueryParams,
  type RoomStatus,
  type RoomTypeDto,
  type RoomWithTypeDto,
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

const labelClass =
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

type StatusFilterValue = "" | RoomStatus;

const statusFilters: { value: StatusFilterValue; label: string }[] = [
  { value: "", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Cleaning" },
];

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

function formatCompactRevenue(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type ViewMode = "grid" | "list";

function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "emerald" | "amber" | "violet";
}) {
  const bar =
    accent === "emerald"
      ? "from-[#66dd8b] to-[#3ecf7a]"
      : accent === "amber"
        ? "from-[#ffd096] to-[#f0b060]"
        : accent === "violet"
          ? "from-[#a78bfa] to-[#7c3aed]"
          : "from-[#00CCFF] to-[#0099FF]";
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 ring-0 transition duration-300",
        "bg-[#f6f7fa] shadow-[0_12px_40px_rgb(15_23_42/0.05)] dark:bg-[rgb(24_30_44/0.85)]",
        "dark:shadow-[0_16px_48px_rgb(0_0_0/0.28)]",
        "hover:-translate-y-1 hover:shadow-[0_20px_56px_rgb(0_204_255/0.12)] dark:hover:shadow-[0_20px_56px_rgb(0_0_0/0.35)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-4 h-12 w-1 rounded-full bg-gradient-to-b opacity-90",
          bar,
        )}
      />
      <p className="pl-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-[#8a97a8]">
        {title}
      </p>
      <p className="font-display mt-3 pl-3 text-3xl font-bold tracking-tight text-primary dark:text-[#9de2ff]">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 pl-3 text-[0.8125rem] leading-snug text-muted-foreground dark:text-[#a8b4c4]">
          {hint}
        </p>
      ) : null}
    </article>
  );
}

function RoomCover({
  room,
  coverUrl,
  className,
  children,
}: {
  room: RoomWithTypeDto;
  coverUrl?: string;
  className?: string;
  children: ReactNode;
}) {
  const hasImage = Boolean(coverUrl);
  return (
    <div className={cn("relative overflow-hidden bg-[#e8eaef] dark:bg-[rgb(15_20_32)]", className)}>
      {hasImage ? (
        <img
          src={coverUrl}
          alt={`Room ${room.roomNumber}`}
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="font-display text-4xl font-bold text-[#0d1322]/10 dark:text-white/10">SIU</div>
          <p className="max-w-[12rem] text-xs font-medium text-muted-foreground dark:text-[#7a8799]">
            No photo yet — add images to showcase this room.
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(13_19_34/0.75)] via-[rgb(13_19_34/0.15)] to-transparent dark:from-[rgb(5_8_18/0.85)]" />
      {children}
    </div>
  );
}

function LuminaRoomCard({
  room,
  coverUrl,
  onPhotos,
  onEdit,
  onDelete,
}: {
  room: RoomWithTypeDto;
  coverUrl?: string;
  onPhotos: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const display = mapRoomStatusToDisplay(room.status);
  const price = formatMoneyFromDecimalString(room.roomType.basePrice);
  const desc = room.roomType.description?.trim();

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl ring-0 transition duration-300",
        "bg-white shadow-[0_16px_48px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.92)]",
        "dark:shadow-[0_20px_56px_rgb(0_0_0/0.35)]",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgb(0_204_255/0.14)] dark:hover:shadow-[0_24px_64px_rgb(0_0_0/0.45)]",
      )}
    >
      <RoomCover room={room} coverUrl={coverUrl} className="aspect-[5/4] w-full sm:aspect-[4/3]">
        <div className="pointer-events-auto absolute left-4 top-4 z-10">
          <RoomStatusBadge status={display} variant="onImage" />
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 text-right">
          <p className="font-display text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl">
            {room.roomNumber}
          </p>
        </div>
        <div className="pointer-events-auto absolute right-3 top-4 z-10 flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "rounded-full border-0 bg-[rgb(255_255_255/0.2)] text-white shadow-none backdrop-blur-md",
              "hover:bg-[rgb(255_255_255/0.35)]",
            )}
            aria-label="Edit room"
          >
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              "rounded-full border-0 bg-rose-500/30 text-white backdrop-blur-md",
              "hover:bg-rose-500/50",
            )}
            aria-label="Delete room"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </RoomCover>

      <div className="flex flex-1 flex-col gap-4 p-5 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground dark:text-white">
              {room.roomType.name}
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-[#8a97a8]">
              Room unit
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="inline-flex items-center justify-end gap-1.5 font-display text-lg font-bold text-primary dark:text-[#9de2ff]">
              <BadgeDollarSign className="size-4 opacity-80" strokeWidth={1.75} aria-hidden="true" />
              {price}
            </span>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#8a97a8]">
              per night
            </span>
          </p>
        </div>

        {desc ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground dark:text-[#a8b4c4]">{desc}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/70 dark:text-[#6b7585]">No category description.</p>
        )}

        <p className="text-[0.65rem] font-medium text-muted-foreground dark:text-[#8a97a8]">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <ClipboardSignature className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden="true" />
            Created by
          </span>{" "}
          <span className="text-foreground/80 dark:text-white/70">{room.createdBy?.fullName ?? "—"}</span>
        </p>

        {room.status === "OCCUPIED" ? (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm ring-0",
              "bg-[rgb(0_204_255/0.08)] text-foreground dark:bg-[rgb(0_204_255/0.1)] dark:text-[#c8e8f5]",
            )}
          >
            <span className="font-semibold text-foreground dark:text-white">Guest in house</span>
            <span className="mt-1 block text-[0.8125rem] text-muted-foreground dark:text-[#9aa8bc]">
              Occupied room — manage guest details in the relevant module.
            </span>
          </div>
        ) : null}

        {room.status === "MAINTENANCE" ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground dark:text-[#8a97a8]">
              <span>Cleaning progress</span>
              <span className="tabular-nums text-foreground dark:text-white">65%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgb(15_23_42/0.08)] dark:bg-white/10">
              <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-sky-400 to-[#00CCFF]" />
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className={cn(
              "h-10 flex-1 rounded-full border-0 text-[0.75rem] font-bold uppercase tracking-wide ring-0",
              "bg-[#eef1f6] text-foreground hover:bg-[#e2e6ee] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]",
            )}
          >
            Details
          </Button>
          {room.status === "MAINTENANCE" ? (
            <Button
              type="button"
              onClick={onEdit}
              className={cn(
                "h-10 flex-[2] min-w-[8rem] rounded-full border-0 text-[0.75rem] font-bold uppercase tracking-wide ring-0",
                "bg-gradient-to-r from-[#64748b] to-[#475569] text-white hover:from-[#718096] hover:to-[#526179]",
              )}
            >
              Notify housekeeping
            </Button>
          ) : null}
          <div className="flex w-full gap-2 sm:w-auto sm:flex-initial">
            <EntityImagesTriggerButton onClick={onPhotos} />
          </div>
        </div>
      </div>
    </article>
  );
}

function LuminaRoomListRow({
  room,
  coverUrl,
  onPhotos,
  onEdit,
  onDelete,
}: {
  room: RoomWithTypeDto;
  coverUrl?: string;
  onPhotos: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const display = mapRoomStatusToDisplay(room.status);
  return (
    <article
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-2xl p-4 ring-0 sm:flex-nowrap sm:gap-6 sm:p-5",
        "bg-white shadow-[0_8px_28px_rgb(15_23_42/0.06)] dark:bg-[rgb(22_28_42/0.88)] dark:shadow-[0_12px_36px_rgb(0_0_0/0.25)]",
      )}
    >
      <RoomCover room={room} coverUrl={coverUrl} className="relative h-24 w-36 shrink-0 rounded-xl sm:h-28 sm:w-40">
        <div className="pointer-events-auto absolute left-2 top-2 z-10 scale-90">
          <RoomStatusBadge status={display} variant="onImage" />
        </div>
        <p className="pointer-events-none absolute bottom-2 right-2 z-10 font-display text-xl font-bold text-white drop-shadow">
          {room.roomNumber}
        </p>
      </RoomCover>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-foreground dark:text-white">{room.roomType.name}</p>
        <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">
          <span className="inline-flex items-center gap-1.5">
            <BadgeDollarSign className="size-4 opacity-80" strokeWidth={1.75} aria-hidden="true" />
            {formatMoneyFromDecimalString(room.roomType.basePrice)} / night
          </span>{" "}
          · {display}
        </p>
        <p className="mt-1 text-[0.65rem] text-muted-foreground dark:text-[#8a97a8]">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <ClipboardSignature className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden="true" />
            Created by
          </span>{" "}
          <span className="text-foreground/80 dark:text-white/70">{room.createdBy?.fullName ?? "—"}</span>
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
        <Button type="button" variant="outline" size="sm" className="rounded-full border-0" onClick={onEdit}>
          Details
        </Button>
        <EntityImagesTriggerButton onClick={onPhotos} />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full border-0 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
  );
}

type RoomsInventoryClientProps = {
  initialRooms: RoomWithTypeDto[];
  initialRoomTypes: RoomTypeDto[];
  loadError: string | null;
};

export function RoomsInventoryClient({
  initialRooms,
  initialRoomTypes,
  loadError,
}: RoomsInventoryClientProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomWithTypeDto[]>(initialRooms);
  const [roomTypes] = useState<RoomTypeDto[]>(initialRoomTypes);
  const [statsRooms, setStatsRooms] = useState<RoomWithTypeDto[]>(initialRooms);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const pageSize = viewMode === "grid" ? 9 : 10;
  const { state: paging, setPage, reset: resetPage } = useUrlPagination({ pageSize, pageParam: "page" });

  const [addOpen, setAddOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [newStatus, setNewStatus] = useState<RoomStatus>("AVAILABLE");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [photosRoomId, setPhotosRoomId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [edRoomNumber, setEdRoomNumber] = useState("");
  const [edRoomTypeId, setEdRoomTypeId] = useState("");
  const [edStatus, setEdStatus] = useState<RoomStatus>("AVAILABLE");
  const [edSubmitting, setEdSubmitting] = useState(false);
  const [edError, setEdError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RoomWithTypeDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useMemo((): ListRoomsQueryParams | undefined => {
    const q: ListRoomsQueryParams = {};
    if (statusFilter) q.status = statusFilter;
    if (typeFilter) q.roomTypeId = typeFilter;
    if (!q.status && !q.roomTypeId) return undefined;
    return q;
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    resetPage();
  }, [statusFilter, typeFilter, viewMode, resetPage]);

  const refreshStats = useCallback(async () => {
    try {
      const all = await fetchRoomsClient({});
      setStatsRooms(all);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoomsClient(query);
      setRooms(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const photosRoom = photosRoomId ? rooms.find((r) => r.id === photosRoomId) : undefined;

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    setStatsRooms(initialRooms);
  }, [initialRooms]);

  useEffect(() => {
    if (statusFilter === "" && typeFilter === "") {
      setLoading(false);
      setRooms(initialRooms);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchRoomsClient(query ?? {})
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load rooms.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, typeFilter, initialRooms, query]);

  const coverPaths = useMemo(
    () => rooms.map((r) => r.images[0]).filter((p): p is string => Boolean(p)),
    [rooms],
  );
  const [coverByPath, setCoverByPath] = useState<Record<string, string>>({});
  useEffect(() => {
    const unique = [...new Set(coverPaths)].slice(0, 30);
    if (unique.length === 0) {
      setCoverByPath({});
      return;
    }
    let cancelled = false;
    void presignAssetUrlsClient(unique)
      .then((m) => {
        if (!cancelled) setCoverByPath(m);
      })
      .catch(() => {
        if (!cancelled) setCoverByPath({});
      });
    return () => {
      cancelled = true;
    };
  }, [coverPaths.join("|")]);

  const { items: pagedRooms, meta } = useMemo(() => paginateArray(rooms, paging), [rooms, paging]);

  const stats = useMemo(() => {
    const total = statsRooms.length;
    const occ = statsRooms.filter((r) => r.status === "OCCUPIED").length;
    const clean = statsRooms.filter((r) => r.status === "MAINTENANCE").length;
    const occRate = total ? Math.round((occ / total) * 100) : 0;
    let occRevenue = 0;
    for (const r of statsRooms) {
      if (r.status === "OCCUPIED") occRevenue += Number.parseFloat(r.roomType.basePrice) || 0;
    }
    return { total, occ, clean, occRate, occRevenue };
  }, [statsRooms]);

  async function handleCreateRoom() {
    setFormError(null);
    if (!roomNumber.trim() || !roomTypeId) {
      setFormError("Room number and room type are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createRoomClient({
        roomNumber: roomNumber.trim(),
        roomTypeId,
        status: newStatus,
      });
      setAddOpen(false);
      setRoomNumber("");
      setRoomTypeId("");
      setNewStatus("AVAILABLE");
      await loadRooms();
      await refreshStats();
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create room.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditRoom(room: RoomWithTypeDto) {
    setEditRoomId(room.id);
    setEdRoomNumber(room.roomNumber);
    setEdRoomTypeId(room.roomTypeId);
    setEdStatus(room.status);
    setEdError(null);
    setEditOpen(true);
  }

  async function handleUpdateRoom() {
    if (!editRoomId) return;
    setEdError(null);
    if (!edRoomNumber.trim() || !edRoomTypeId) {
      setEdError("Room number and room type are required.");
      return;
    }
    setEdSubmitting(true);
    try {
      await updateRoomClient(editRoomId, {
        roomNumber: edRoomNumber.trim(),
        roomTypeId: edRoomTypeId,
        status: edStatus,
      });
      setEditOpen(false);
      setEditRoomId(null);
      await loadRooms();
      await refreshStats();
      router.refresh();
    } catch (e) {
      setEdError(e instanceof Error ? e.message : "Could not update room.");
    } finally {
      setEdSubmitting(false);
    }
  }

  async function handleConfirmDeleteRoom() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await deleteRoomClient(deleteTarget.id);
      setDeleteTarget(null);
      if (photosRoomId === deleteTarget.id) setPhotosRoomId(null);
      await loadRooms();
      await refreshStats();
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete room.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground dark:text-[#b4c0cc]">
          <span className="font-semibold text-foreground/90 dark:text-white/90">Inventory control</span> — tonal
          stat cards, category tabs, and image-forward units. Matches the Digital Concierge layout without hard
          dividers.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 rounded-full border-0 px-5 text-[0.8125rem] font-semibold ring-0",
              "bg-[#f0f2f6] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] hover:bg-[#e6e8ee]",
              "dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]",
            )}
          >
            <Download className="mr-2 size-4" strokeWidth={1.75} />
            Export report
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setRoomTypeId(roomTypes[0]?.id ?? "");
              setAddOpen(true);
            }}
            className={cn(
              "h-11 rounded-full border-0 px-6 text-[0.8125rem] font-semibold ring-0",
              "bg-gradient-to-r from-[#0d1322] to-[#1a2744] text-white shadow-[0_10px_32px_rgb(13_19_34/0.2)]",
              "hover:from-[#1a2744] hover:to-[#243352] dark:from-[#00CCFF] dark:to-[#0099FF] dark:text-[#0d1322] dark:shadow-[0_10px_32px_rgb(0_204_255/0.35)]",
            )}
          >
            <Plus className="mr-2 size-4" strokeWidth={2} />
            Add new room
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total inventory"
          value={String(stats.total)}
          hint="All physical keys on property."
          accent="cyan"
        />
        <StatCard
          title="Occupied today"
          value={String(stats.occ)}
          hint={`${stats.occRate}% occupancy rate`}
          accent="violet"
        />
        <StatCard
          title="Pending cleaning"
          value={String(stats.clean)}
          hint={stats.clean > 0 ? "Housekeeping queue" : "All clear"}
          accent="amber"
        />
        <StatCard
          title="Nightly at occupancy"
          value={formatCompactRevenue(stats.occRevenue)}
          hint="Sum of base rates for occupied rooms (estimate)."
          accent="emerald"
        />
      </div>

      <div
        className={cn(
          "flex flex-col gap-5 rounded-2xl p-5 ring-0 sm:p-6",
          "bg-[#f4f5f8] shadow-[inset_0_1px_0_rgb(255_255_255/0.95)] dark:bg-[rgb(255_255_255/0.04)]",
          "dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => setTypeFilter("")}
              className={cn(
                "relative px-4 py-2.5 text-[0.9375rem] font-semibold transition",
                typeFilter === ""
                  ? "text-foreground dark:text-white"
                  : "text-muted-foreground hover:text-foreground dark:text-[#8a97a8] dark:hover:text-white/80",
              )}
            >
              All rooms
              {typeFilter === "" ? (
                <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF]" />
              ) : null}
            </button>
            {roomTypes.map((t) => {
              const active = typeFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={cn(
                    "relative px-4 py-2.5 text-[0.9375rem] font-semibold transition",
                    active
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground hover:text-foreground dark:text-[#8a97a8] dark:hover:text-white/80",
                  )}
                >
                  {t.name}
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className={labelClass.replace("mb-1.5 ", "")}>View</span>
            <div
              className={cn(
                "flex rounded-full p-1",
                "bg-white/80 shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] dark:bg-[rgb(0_0_0/0.2)]",
              )}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-full p-2 transition",
                  viewMode === "grid"
                    ? "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-md"
                    : "text-muted-foreground hover:bg-white/80 dark:hover:bg-white/5",
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-[1.15rem]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-full p-2 transition",
                  viewMode === "list"
                    ? "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-md"
                    : "text-muted-foreground hover:bg-white/80 dark:hover:bg-white/5",
                )}
                aria-label="List view"
              >
                <List className="size-[1.15rem]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className={labelClass}>Availability</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {statusFilters.map(({ value, label }) => {
              const active = statusFilter === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[0.8125rem] font-semibold ring-0 transition",
                    active
                      ? "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-[0_6px_20px_rgb(0_204_255/0.25)]"
                      : "bg-white/80 text-foreground/75 hover:bg-white dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground dark:text-[#9aa8bc]">Updating inventory…</p>
      ) : null}

      {viewMode === "grid" ? (
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {pagedRooms.map((room) => {
            const key = room.images[0];
            const cover = key ? coverByPath[key] : undefined;
            return (
              <LuminaRoomCard
                key={room.id}
                room={room}
                coverUrl={cover}
                onPhotos={() => setPhotosRoomId(room.id)}
                onEdit={() => openEditRoom(room)}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleteTarget(room);
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pagedRooms.map((room) => {
            const key = room.images[0];
            const cover = key ? coverByPath[key] : undefined;
            return (
              <LuminaRoomListRow
                key={room.id}
                room={room}
                coverUrl={cover}
                onPhotos={() => setPhotosRoomId(room.id)}
                onEdit={() => openEditRoom(room)}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleteTarget(room);
                }}
              />
            );
          })}
        </div>
      )}

      {rooms.length === 0 && !loading ? (
        <p className="text-center text-sm text-muted-foreground dark:text-[#9aa8bc]">
          No rooms match these filters yet.
        </p>
      ) : null}

      {rooms.length > 0 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={meta.pageSize}
          onPageChange={(p) => setPage(p, meta.totalItems)}
        />
      ) : null}

      <EntityImagesModal
        open={Boolean(photosRoom)}
        onOpenChange={(o) => {
          if (!o) setPhotosRoomId(null);
        }}
        variant="room"
        entityId={photosRoom?.id ?? ""}
        title={photosRoom ? `Photos — Room ${photosRoom.roomNumber}` : "Photos"}
        subtitle="Manage unit photos in MinIO (same bucket as categories)."
        paths={photosRoom?.images ?? []}
        onUpdated={async () => {
          await loadRooms();
          await refreshStats();
          router.refresh();
        }}
      />

      <GlassModal
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditRoomId(null);
        }}
        title="Edit room"
        description="Update room number, category, or housekeeping status."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setEditOpen(false)}
              disabled={edSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => void handleUpdateRoom()}
              disabled={edSubmitting}
            >
              {edSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {edError ? (
            <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
              {edError}
            </p>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="edit-room-number">
              Room number
            </label>
            <input
              id="edit-room-number"
              className={fieldClass}
              value={edRoomNumber}
              onChange={(e) => setEdRoomNumber(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-room-type">
              Room type
            </label>
            <select
              id="edit-room-type"
              className={cn(fieldClass, "cursor-pointer")}
              value={edRoomTypeId}
              onChange={(e) => setEdRoomTypeId(e.target.value)}
            >
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-room-status">
              Status
            </label>
            <select
              id="edit-room-status"
              className={cn(fieldClass, "cursor-pointer")}
              value={edStatus}
              onChange={(e) => setEdStatus(e.target.value as RoomStatus)}
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Cleaning</option>
            </select>
          </div>
        </div>
      </GlassModal>

      <GlassModal
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete room?"
        description={
          deleteTarget
            ? `Permanently remove room ${deleteTarget.roomNumber} (${deleteTarget.roomType.name}), its catalog entry, and MinIO files under this room’s folder. This cannot be undone. Deletion may fail if related records exist.`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-rose-600 px-6 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
              onClick={() => void handleConfirmDeleteRoom()}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting…" : "Delete room"}
            </Button>
          </>
        }
      >
        {deleteError ? (
          <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
            {deleteError}
          </p>
        ) : null}
      </GlassModal>

      <GlassModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add room"
        description="Create a physical unit and assign it to a category. Status defaults to available unless housekeeping is in progress."
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
              onClick={() => void handleCreateRoom()}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Create room"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
              {formError}
            </p>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="new-room-number">
              Room number
            </label>
            <input
              id="new-room-number"
              className={fieldClass}
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 1204"
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-room-type">
              Room type
            </label>
            <select
              id="new-room-type"
              className={cn(fieldClass, "cursor-pointer")}
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
            >
              <option value="" disabled>
                Select a category
              </option>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="new-room-status">
              Status
            </label>
            <select
              id="new-room-status"
              className={cn(fieldClass, "cursor-pointer")}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RoomStatus)}
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Cleaning</option>
            </select>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
