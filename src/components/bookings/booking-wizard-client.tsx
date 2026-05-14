"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Loader2,
  Maximize2,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createBookingClient,
  createTransactionClient,
  createWalkInCustomerClient,
  fetchCustomersClient,
  fetchRoomClient,
  fetchRoomsClient,
  presignAssetUrlsClient,
  updateCustomerClient,
  type CreateBookingPayload,
  type CustomerDto,
  type PaymentMethod,
  type RoomWithTypeDto,
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
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

const cardShell = cn(
  "rounded-3xl ring-0",
  "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
  "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
);

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "EVC_PLUS", label: "EVC Plus" },
  { value: "PREMIER_BANK", label: "Premier Bank" },
  { value: "SAHAL", label: "Sahal" },
];

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil(ms / dayMs));
}

function dateInputToIsoBoundary(dateStr: string, boundary: "in" | "out"): string {
  if (boundary === "in") return `${dateStr}T15:00:00.000Z`;
  return `${dateStr}T11:00:00.000Z`;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function parseMoneyString(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function simpleEmailOk(v: string): boolean {
  if (!v.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

type GuestMode = "existing" | "new";

export function BookingWizardClient() {
  const router = useRouter();
  const customerComboWrapRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [rooms, setRooms] = useState<RoomWithTypeDto[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  /** MinIO object key → short-lived GET URL (first image per room). */
  const [roomImageUrlByPath, setRoomImageUrlByPath] = useState<Record<string, string>>({});

  // Step 2
  const [guestMode, setGuestMode] = useState<GuestMode>("existing");
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerComboOpen, setCustomerComboOpen] = useState(false);

  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newIdCard, setNewIdCard] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});

  // Step 3
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkInIso = useMemo(() => (checkInDate ? dateInputToIsoBoundary(checkInDate, "in") : null), [checkInDate]);
  const checkOutIso = useMemo(() => (checkOutDate ? dateInputToIsoBoundary(checkOutDate, "out") : null), [checkOutDate]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const stayNights = useMemo(() => {
    if (!checkInIso || !checkOutIso) return 0;
    return nightsBetween(new Date(checkInIso), new Date(checkOutIso));
  }, [checkInIso, checkOutIso]);

  const nightlyRate = useMemo(() => (selectedRoom ? parseMoneyString(selectedRoom.roomType.basePrice) : 0), [selectedRoom]);

  const roomSubtotal = useMemo(() => nightlyRate * (stayNights || 0), [nightlyRate, stayNights]);

  /** No tax/fee lines in API — placeholder for future configuration. */
  const feesTotal = 0;
  const grandTotal = roomSubtotal + feesTotal;

  const payAmountNum = useMemo(() => {
    const n = Number.parseFloat(payAmount);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [payAmount]);

  const dueAfterPay = useMemo(() => Math.max(0, grandTotal - payAmountNum), [grandTotal, payAmountNum]);

  const loadRooms = useCallback(async () => {
    setRoomsError(null);
    if (!checkInIso || !checkOutIso) {
      setRoomsError("Choose check-in and check-out dates.");
      return;
    }
    if (new Date(checkOutIso).getTime() <= new Date(checkInIso).getTime()) {
      setRoomsError("Check-out must be after check-in.");
      return;
    }
    setRoomsLoading(true);
    try {
      const list = await fetchRoomsClient({ checkIn: checkInIso, checkOut: checkOutIso });
      setRooms(list);
      setSelectedRoomId((prev) => (prev && list.some((r) => r.id === prev) ? prev : null));
    } catch (e) {
      setRooms([]);
      setSelectedRoomId(null);
      setRoomsError(e instanceof Error ? e.message : "Could not load available rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }, [checkInIso, checkOutIso]);

  useEffect(() => {
    if (!checkInIso || !checkOutIso) return;
    if (new Date(checkOutIso).getTime() <= new Date(checkInIso).getTime()) return;
    const t = window.setTimeout(() => {
      void loadRooms();
    }, 450);
    return () => window.clearTimeout(t);
  }, [checkInIso, checkOutIso, loadRooms]);

  const roomCoverPaths = useMemo(
    () => rooms.map((r) => r.images[0]).filter((p): p is string => Boolean(p)),
    [rooms],
  );

  useEffect(() => {
    const unique = [...new Set(roomCoverPaths)].slice(0, 30);
    if (unique.length === 0) {
      setRoomImageUrlByPath({});
      return;
    }
    let cancelled = false;
    void presignAssetUrlsClient(unique)
      .then((m) => {
        if (!cancelled) setRoomImageUrlByPath(m);
      })
      .catch(() => {
        if (!cancelled) setRoomImageUrlByPath({});
      });
    return () => {
      cancelled = true;
    };
  }, [roomCoverPaths.join("|")]);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const list = await fetchCustomersClient();
      setCustomers(list);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2) void loadCustomers();
  }, [step, loadCustomers]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const el = customerComboWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setCustomerComboOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDocPointerDown, { capture: true });
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.fullName} ${c.phoneNumber} ${c.email ?? ""}`.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  function customerLabel(c: CustomerDto): string {
    const email = c.email ? ` · ${c.email}` : "";
    return `${c.fullName} · ${c.phoneNumber}${email}`;
  }

  function selectCustomer(c: CustomerDto) {
    setSelectedCustomerId(c.id);
    setCustomerQuery(customerLabel(c));
    setCustomerComboOpen(false);
    setGuestErrors((prev) => {
      const next = { ...prev };
      delete next.customer;
      return next;
    });
  }

  function validateStep1(): boolean {
    if (!checkInDate || !checkOutDate) {
      setRoomsError("Select both dates to continue.");
      return false;
    }
    if (!checkInIso || !checkOutIso || new Date(checkOutIso).getTime() <= new Date(checkInIso).getTime()) {
      setRoomsError("Check-out must be after check-in.");
      return false;
    }
    if (!selectedRoomId) {
      setRoomsError("Select a room to continue.");
      return false;
    }
    setRoomsError(null);
    return true;
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {};
    if (guestMode === "existing") {
      if (!selectedCustomerId) next.customer = "Select a guest from the directory.";
    } else {
      if (!newFullName.trim()) next.fullName = "Full name is required.";
      if (!newPhone.trim()) next.phone = "Phone number is required.";
      if (!simpleEmailOk(newEmail)) next.email = "Enter a valid email or leave blank.";
    }
    setGuestErrors(next);
    return Object.keys(next).length === 0;
  }

  async function persistCustomerProfile(customerId: string, payload: UpdateCustomerPayload): Promise<void> {
    try {
      await updateCustomerClient(customerId, payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const emailTaken =
        (/email already exists|EMAIL_TAKEN|UNIQUE_CONSTRAINT/i.test(msg) || /duplicate.*email/i.test(msg)) &&
        payload.email !== undefined &&
        payload.email !== null &&
        String(payload.email).trim() !== "";
      if (!emailTaken) throw e;
      const { email: _e, ...rest } = payload;
      await updateCustomerClient(customerId, rest);
    }
  }

  function findCustomerByPhone(phone: string, list: CustomerDto[]): CustomerDto | undefined {
    const t = phone.trim();
    const digits = t.replace(/\D/g, "");
    return list.find((c) => {
      const ct = c.phoneNumber.trim();
      if (ct === t) return true;
      const cd = ct.replace(/\D/g, "");
      return digits.length >= 7 && cd.length >= 7 && cd === digits;
    });
  }

  async function resolveCustomerId(): Promise<string> {
    if (guestMode === "existing") {
      if (!selectedCustomerId) throw new Error("No guest selected.");
      return selectedCustomerId;
    }

    const phone = newPhone.trim();
    const profilePayload = {
      fullName: newFullName.trim(),
      phoneNumber: phone,
      email: newEmail.trim() ? newEmail.trim().toLowerCase() : null,
      idCard: newIdCard.trim() ? newIdCard.trim() : null,
      address: newNotes.trim() ? `Special requests: ${newNotes.trim()}` : null,
    };

    try {
      const created = await createWalkInCustomerClient({
        fullName: profilePayload.fullName,
        phoneNumber: profilePayload.phoneNumber,
      });
      await persistCustomerProfile(created.id, profilePayload);
      return created.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const duplicatePhone =
        msg.includes("PHONE_NUMBER_TAKEN") || /phone number already exists/i.test(msg);

      if (!duplicatePhone) throw e;

      const fromState = findCustomerByPhone(phone, customers);
      const list = fromState ? customers : await fetchCustomersClient();
      const match = fromState ?? findCustomerByPhone(phone, list);

      if (!match) {
        throw new Error(
          `${msg} Switch to “Existing guest” and select them from the directory, or use a unique phone number.`,
        );
      }

      await persistCustomerProfile(match.id, profilePayload);
      return match.id;
    }
  }

  async function handleSubmitBooking() {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!selectedRoom || !checkInIso || !checkOutIso) {
      setSubmitError("Missing stay or room selection.");
      return;
    }
    if (payAmountNum - grandTotal > 0.009) {
      setSubmitError("Payment amount cannot exceed the estimated total.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();
      const roomLive = await fetchRoomClient(selectedRoom.id);
      if (roomLive.status !== "AVAILABLE") {
        setSubmitError(
          "This room is no longer available (it may already be occupied). Go back to step 1 and choose another room.",
        );
        return;
      }
      const payload: CreateBookingPayload = {
        customerId,
        roomId: selectedRoom.id,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        status: "CONFIRMED",
      };
      if (grandTotal > 0) payload.totalPrice = grandTotal;
      const booking = await createBookingClient(payload);

      const totalDue = parseMoneyString(booking.totalPrice);
      const payNow = Math.min(payAmountNum, totalDue);

      if (payNow > 0) {
        try {
          await createTransactionClient({
            bookingId: booking.id,
            amount: payNow,
            paymentMethod,
            status: "COMPLETED",
          });
        } catch (payErr) {
          setSubmitError(
            payErr instanceof Error
              ? `${payErr.message} — the booking was still created; record payment from the bookings list.`
              : "Payment recording failed; booking was still created.",
          );
          setSubmitSuccess(`Booking ${booking.id.slice(0, 8)}… created.`);
          router.refresh();
          return;
        }
      }

      setSubmitSuccess(`Booking confirmed. Reference: ${booking.id.slice(0, 8).toUpperCase()}…`);
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not complete booking.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepperSteps = [
    { n: 1 as const, label: "Stay & room", icon: BedDouble },
    { n: 2 as const, label: "Guest", icon: UserRound },
    { n: 3 as const, label: "Review & pay", icon: CreditCard },
  ] as const;

  const stepper = (
    <div
      role="navigation"
      aria-label="Booking steps"
      className="flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-0"
    >
      {stepperSteps.map(({ n, label, icon: Icon }, idx) => {
        const active = step === n;
        const done = step > n;
        /** Line after step `prevN`: primary when on that step (active) or past it (completed). */
        const prevStepN = idx > 0 ? stepperSteps[idx - 1]!.n : null;
        const linePrimary = prevStepN !== null && step >= prevStepN;

        return (
          <Fragment key={n}>
            {idx > 0 ? (
              <div
                className="flex h-11 shrink-0 flex-col justify-center px-2 sm:min-w-[2rem] sm:flex-1 sm:px-3"
                aria-hidden
              >
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/50 shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-[#0099FF] shadow-[0_0_12px_rgb(0_204_255/0.35)] transition-[width] duration-500 ease-out dark:shadow-[0_0_16px_rgb(0_204_255/0.25)]",
                      linePrimary ? "w-full" : "w-0",
                    )}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[7.5rem]">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ring-0 transition-shadow duration-200",
                  done || active
                    ? "bg-gradient-to-br from-[#00CCFF] to-[#0099FF] text-[#0d1322]"
                    : "bg-muted text-muted-foreground dark:bg-white/[0.08] dark:text-white/55",
                  active
                    ? "ring-2 ring-[#00CCFF]/55 ring-offset-2 ring-offset-white dark:ring-[#66d9ff]/50 dark:ring-offset-[rgb(22_28_42)]"
                    : null,
                )}
              >
                {done ? <Check className="size-5" strokeWidth={2.5} /> : <Icon className="size-5" strokeWidth={1.75} />}
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">
                  Step {n}
                </p>
                <p
                  className={cn(
                    "truncate text-sm font-semibold transition-colors",
                    active ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-white/55",
                  )}
                >
                  {label}
                </p>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/bookings"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-10 items-center rounded-full border-0 bg-white/80 px-4 text-xs font-semibold shadow-sm dark:bg-white/[0.06] dark:text-white",
          )}
        >
          <ArrowLeft className="mr-2 size-4" strokeWidth={2} />
          Back to list
        </Link>
      </div>

      <section className={cn(cardShell, "p-6 sm:p-8")}>{stepper}</section>

      {step === 1 ? (
        <section className={cn(cardShell, "p-6 sm:p-8")}>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">Select dates & room</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">
            Available rooms load automatically for your stay window (no overlapping active reservations).
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="wiz-ci">
                Check-in
              </label>
              <input id="wiz-ci" type="date" className={fieldClass} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="wiz-co">
                Check-out
              </label>
              <input id="wiz-co" type="date" className={fieldClass} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-0 bg-white/80 dark:bg-white/[0.06]"
              onClick={() => void loadRooms()}
              disabled={roomsLoading}
            >
              {roomsLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Refresh availability
            </Button>
            {stayNights > 0 ? (
              <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-50">
                {stayNights} night{stayNights === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>

          {roomsError ? (
            <p className="mt-4 text-sm font-medium text-destructive dark:text-red-300" role="alert">
              {roomsError}
            </p>
          ) : null}

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground dark:text-white">Available rooms</h3>
            {roomsLoading && rooms.length === 0 ? (
              <div className="mt-4 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full min-h-[11rem] rounded-2xl" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground dark:text-[#9aa8bc]">
                No rooms available for these dates. Adjust the window or refresh after inventory changes.
              </p>
            ) : (
              <div className="mt-4 grid w-full min-w-0 grid-cols-2 gap-3 md:grid-cols-4 md:gap-3.5">
                {rooms.map((room) => {
                  const selected = room.id === selectedRoomId;
                  const inD = checkInIso && checkOutIso ? new Date(checkInIso) : null;
                  const outD = checkInIso && checkOutIso ? new Date(checkOutIso) : null;
                  const nights = inD && outD ? nightsBetween(inD, outD) : stayNights || 1;
                  const total = parseMoneyString(room.roomType.basePrice) * nights;
                  const nightly = parseMoneyString(room.roomType.basePrice);
                  const coverKey = room.images[0];
                  const coverUrl = coverKey ? roomImageUrlByPath[coverKey] : undefined;
                  const typeDesc = room.roomType.description?.trim();
                  const specView =
                    typeDesc && typeDesc.length > 0
                      ? typeDesc.length > 28
                        ? `${typeDesc.slice(0, 28)}…`
                        : typeDesc
                      : "Premium stay experience";
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={cn(
                        "group relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden rounded-2xl text-left outline-none transition-all duration-300",
                        "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-[rgb(22_28_42)]",
                        selected
                          ? cn(
                              "border-2 border-[#00CCFF] bg-white shadow-[0_12px_40px_rgba(0,204,255,0.2)]",
                              "dark:border-[#00CCFF] dark:bg-[rgb(24_30_46)] dark:shadow-[0_14px_48px_rgba(0,204,255,0.1)]",
                            )
                          : cn(
                              "border border-border/80 bg-card/95 shadow-sm",
                              "hover:border-[#00CCFF]/50 hover:shadow-[0_10px_32px_rgba(0,204,255,0.1)]",
                              "dark:border-white/[0.1] dark:bg-[rgb(22_28_42/0.96)] dark:hover:border-[#00CCFF]/40",
                            ),
                      )}
                    >
                      {selected ? (
                        <span
                          className={cn(
                            "absolute right-1.5 top-1.5 z-20 max-w-[calc(100%-0.75rem)] truncate rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF]",
                            "px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.08em] text-white shadow-[0_4px_12px_rgba(0,204,255,0.4)]",
                            "md:right-2 md:top-2 md:px-2.5 md:text-[0.58rem]",
                          )}
                        >
                          Selected
                        </span>
                      ) : null}

                      {/* 4-column grid: vertical card (photo top, details below) for even columns. */}
                      <div className="flex min-h-0 flex-1 flex-col">
                        <div
                          className={cn(
                            "relative isolate w-full shrink-0 overflow-hidden border-b border-border/70 bg-muted/50",
                            "dark:border-white/10 dark:bg-[rgb(18_22_34)]",
                            "aspect-[5/4] sm:aspect-[4/3]",
                          )}
                        >
                          {coverUrl ? (
                            <img src={coverUrl} alt="" className="size-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted to-muted/30 p-3 dark:from-[rgb(15_20_32)] dark:to-[rgb(22_28_42)]">
                              <Maximize2 className="size-7 text-muted-foreground/45 dark:text-white/15" strokeWidth={1.15} />
                              <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-white/25">
                                No photo
                              </span>
                            </div>
                          )}
                          <div
                            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.04] dark:ring-inset dark:ring-white/[0.06]"
                            aria-hidden
                          />
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 p-2.5 md:p-3">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2 pr-10 md:pr-11">
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.52rem] font-bold uppercase tracking-[0.16em] text-primary dark:text-[#7ed9ff] md:text-[0.55rem]">
                                  Elite collection
                                </p>
                                <p className="mt-0.5 line-clamp-2 font-display text-[0.8125rem] font-bold leading-tight tracking-tight text-foreground md:text-sm">
                                  {room.roomType.name}
                                </p>
                                <p className="text-[0.65rem] font-medium text-muted-foreground">Room {room.roomNumber}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-base font-bold tabular-nums leading-none text-foreground md:text-lg">
                                  {formatMoney(nightly)}
                                </p>
                                <p className="text-[0.58rem] font-medium text-muted-foreground">/night</p>
                              </div>
                            </div>

                            <p className="line-clamp-2 text-[0.65rem] leading-snug text-muted-foreground">
                              <span className="font-medium text-foreground/85 dark:text-white/75">
                                {nights} night{nights === 1 ? "" : "s"}
                              </span>
                              <span className="text-muted-foreground/80"> · </span>
                              Premium bedding
                              <span className="text-muted-foreground/80"> · </span>
                              <span className="text-foreground/75 dark:text-white/70">{specView}</span>
                            </p>

                            <p className="text-[0.62rem] tabular-nums text-muted-foreground">
                              Total <span className="font-semibold text-foreground/90 dark:text-white/80">{formatMoney(total)}</span>
                            </p>
                          </div>

                          {selected ? (
                            <div
                              className={cn(
                                "flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF]",
                                "py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white shadow-[0_4px_14px_rgba(0,204,255,0.28)] md:py-2 md:text-[0.62rem]",
                              )}
                            >
                              Selected
                            </div>
                          ) : (
                            <div className="rounded-full border border-dashed border-border/80 py-1 text-center text-[0.55rem] font-bold uppercase tracking-[0.08em] text-muted-foreground/80 opacity-0 transition-opacity group-hover:opacity-100 dark:border-white/10 md:opacity-100">
                              Tap
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              type="button"
              className="h-11 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-8 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => validateStep1() && setStep(2)}
            >
              Continue
              <ChevronRight className="ml-2 size-4" strokeWidth={2} />
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className={cn(cardShell, "p-6 sm:p-8")}>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">Guest details</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">Attach an existing profile or register a walk-in guest.</p>

          <div className="mt-6 inline-flex rounded-full bg-muted/60 p-1 dark:bg-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setGuestMode("existing");
                setGuestErrors({});
              }}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide",
                guestMode === "existing"
                  ? "bg-white text-foreground shadow-sm dark:bg-gradient-to-r dark:from-[#00CCFF] dark:to-[#0099FF] dark:text-[#0d1322]"
                  : "text-muted-foreground dark:text-white/60",
              )}
            >
              Existing guest
            </button>
            <button
              type="button"
              onClick={() => {
                setGuestMode("new");
                setGuestErrors({});
              }}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide",
                guestMode === "new"
                  ? "bg-white text-foreground shadow-sm dark:bg-gradient-to-r dark:from-[#00CCFF] dark:to-[#0099FF] dark:text-[#0d1322]"
                  : "text-muted-foreground dark:text-white/60",
              )}
            >
              Walk-in (new)
            </button>
          </div>

          {guestMode === "existing" ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className={labelClass} htmlFor="wiz-csel">
                  Guest
                </label>
                {customersLoading ? (
                  <Skeleton className="h-11 w-full rounded-xl" />
                ) : (
                  <div ref={customerComboWrapRef} className="relative">
                    <div className="relative">
                      <input
                        id="wiz-csel"
                        className={cn(fieldClass, "pr-20")}
                        value={customerQuery}
                        onChange={(e) => {
                          setCustomerQuery(e.target.value);
                          setSelectedCustomerId(null);
                          setCustomerComboOpen(true);
                        }}
                        onFocus={() => setCustomerComboOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setCustomerComboOpen(false);
                            return;
                          }
                          if (e.key === "Enter") {
                            if (!customerComboOpen) return;
                            const first = filteredCustomers[0];
                            if (first) {
                              e.preventDefault();
                              selectCustomer(first);
                            }
                          }
                        }}
                        placeholder="Search guest by name, phone, or email…"
                        autoComplete="off"
                        aria-expanded={customerComboOpen}
                        aria-controls="wiz-csel-list"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                        {customerQuery.trim() ? (
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-white"
                            onClick={() => {
                              setCustomerQuery("");
                              setSelectedCustomerId(null);
                              setCustomerComboOpen(true);
                            }}
                            title="Clear"
                          >
                            <X className="size-4" strokeWidth={2} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-white"
                          onClick={() => setCustomerComboOpen((v) => !v)}
                          title="Toggle list"
                        >
                          <ChevronDown className={cn("size-4 transition-transform", customerComboOpen ? "rotate-180" : "")} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {customerComboOpen ? (
                      <div
                        id="wiz-csel-list"
                        role="listbox"
                        className={cn(
                          "absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_60px_rgb(15_23_42/0.08)]",
                          "dark:border-white/10 dark:bg-[rgb(22_28_42/0.98)] dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)]",
                        )}
                      >
                        <ScrollArea className="max-h-64">
                          <div className="p-1.5">
                            {filteredCustomers.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-muted-foreground dark:text-[#a8b4c4]">
                                No matching guests.
                              </div>
                            ) : (
                              filteredCustomers.slice(0, 50).map((c) => {
                                const active = c.id === selectedCustomerId;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => selectCustomer(c)}
                                    className={cn(
                                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                      active
                                        ? "bg-cyan-50 text-foreground dark:bg-white/[0.06] dark:text-white"
                                        : "hover:bg-muted/50 dark:hover:bg-white/[0.06]",
                                    )}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-foreground dark:text-white">
                                        {c.fullName}
                                      </span>
                                      <span className="mt-0.5 block truncate text-xs text-muted-foreground dark:text-[#a8b4c4]">
                                        {c.phoneNumber}
                                        {c.email ? ` · ${c.email}` : ""}
                                      </span>
                                    </span>
                                    {active ? <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} /> : null}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : null}
                  </div>
                )}
                {guestErrors.customer ? (
                  <p className="mt-2 text-sm font-medium text-destructive dark:text-red-300">{guestErrors.customer}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="wiz-name">
                  Full name
                </label>
                <input id="wiz-name" className={fieldClass} value={newFullName} onChange={(e) => setNewFullName(e.target.value)} autoComplete="name" />
                {guestErrors.fullName ? (
                  <p className="mt-2 text-sm font-medium text-destructive dark:text-red-300">{guestErrors.fullName}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor="wiz-phone">
                  Phone
                </label>
                <input id="wiz-phone" className={fieldClass} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} autoComplete="tel" />
                {guestErrors.phone ? (
                  <p className="mt-2 text-sm font-medium text-destructive dark:text-red-300">{guestErrors.phone}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor="wiz-email">
                  Email (optional)
                </label>
                <input id="wiz-email" className={fieldClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
                {guestErrors.email ? (
                  <p className="mt-2 text-sm font-medium text-destructive dark:text-red-300">{guestErrors.email}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="wiz-id">
                  ID / passport (optional)
                </label>
                <input id="wiz-id" className={fieldClass} value={newIdCard} onChange={(e) => setNewIdCard(e.target.value)} autoComplete="off" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="wiz-notes">
                  Notes / special requests
                </label>
                <textarea id="wiz-notes" className={cn(fieldClass, "min-h-[6.5rem] resize-y")} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
                <p className="mt-2 text-xs text-muted-foreground dark:text-white/45">
                  Stored on the guest profile as address notes (no separate booking-notes field in the API).
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-8 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => validateStep2() && setStep(3)}
            >
              Continue
              <ChevronRight className="ml-2 size-4" strokeWidth={2} />
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className={cn(cardShell, "p-6 sm:p-8")}>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">Summary & payment</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">Confirm the stay, then record an optional initial payment.</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Guest</p>
              {guestMode === "existing" && selectedCustomer ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold text-foreground dark:text-white">{selectedCustomer.fullName}</p>
                  <p className="text-muted-foreground dark:text-[#a8b4c4]">{selectedCustomer.phoneNumber}</p>
                  <p className="text-muted-foreground dark:text-[#a8b4c4]">{selectedCustomer.email ?? "—"}</p>
                </div>
              ) : guestMode === "new" ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold text-foreground dark:text-white">{newFullName.trim() || "—"}</p>
                  <p className="text-muted-foreground dark:text-[#a8b4c4]">{newPhone.trim() || "—"}</p>
                  <p className="text-muted-foreground dark:text-[#a8b4c4]">{newEmail.trim() || "—"}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Select a guest in step 2.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Stay</p>
              {selectedRoom && checkInIso && checkOutIso ? (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground dark:text-[#a8b4c4]">
                  <p>
                    <span className="font-semibold text-foreground dark:text-white">Room {selectedRoom.roomNumber}</span> ·{" "}
                    {selectedRoom.roomType.name}
                  </p>
                  <p>
                    {new Date(checkInIso).toLocaleDateString()} → {new Date(checkOutIso).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground dark:text-white">{stayNights}</span> night{stayNights === 1 ? "" : "s"}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Incomplete selection.</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/10 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Pricing</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground dark:text-[#a8b4c4]">
                  Room ({stayNights} × {formatMoney(nightlyRate)})
                </dt>
                <dd className="font-semibold tabular-nums text-foreground dark:text-white">{formatMoney(roomSubtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground dark:text-[#a8b4c4]">Taxes & fees</dt>
                <dd className="tabular-nums text-foreground dark:text-white">{feesTotal === 0 ? "—" : formatMoney(feesTotal)}</dd>
              </div>
              <p className="text-xs text-muted-foreground dark:text-white/45">Itemized taxes/resort fees are not returned by the API; total follows room rate × nights.</p>
              <div className="border-t border-border/60 pt-3 dark:border-white/10">
                <div className="flex justify-between gap-4 text-base">
                  <dt className="font-semibold text-foreground dark:text-white">Total</dt>
                  <dd className="font-bold tabular-nums text-foreground dark:text-white">{formatMoney(grandTotal)}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="wiz-pm">
                Payment method
              </label>
              <select
                id="wiz-pm"
                className={cn(fieldClass, "cursor-pointer")}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="wiz-pay">
                Amount to charge now (USD)
              </label>
              <input
                id="wiz-pay"
                inputMode="decimal"
                className={fieldClass}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="mt-2 text-xs text-muted-foreground dark:text-white/45">
                Due after this payment: <span className="font-semibold text-foreground dark:text-white">{formatMoney(dueAfterPay)}</span>
              </p>
            </div>
          </div>

          {submitError ? (
            <p className="mt-4 text-sm font-medium text-destructive dark:text-red-300" role="alert">
              {submitError}
            </p>
          ) : null}
          {submitSuccess ? (
            <div
              className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50"
              role="status"
            >
              {submitSuccess}
              <div className="mt-3">
                <Link
                  href="/bookings"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex rounded-full border-0 bg-white/80 px-4 dark:bg-white/[0.08]",
                  )}
                >
                  View bookings
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setStep(2)} disabled={submitting}>
              Back
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-8 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
              onClick={() => void handleSubmitBooking()}
              disabled={submitting || !!submitSuccess}
            >
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} /> : null}
              {submitting ? "Submitting…" : "Confirm booking"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
