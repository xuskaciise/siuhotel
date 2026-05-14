import type { BookingDto, BookingStatus, TransactionDto } from "@/lib/api/apiService";

export type BookingUiStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export type PaymentUiStatus = "paid" | "partial" | "unpaid";

function parseMoney(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function sumCompletedPayments(transactions: TransactionDto[], bookingId: string): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.bookingId !== bookingId) continue;
    if (tx.status === "COMPLETED") sum += parseMoney(tx.amount);
    if (tx.status === "REFUNDED") sum -= parseMoney(tx.amount);
  }
  return Math.max(0, sum);
}

export function derivePaymentUiStatus(totalPrice: string, paid: number): PaymentUiStatus {
  const total = parseMoney(totalPrice);
  if (total <= 0) return paid > 0 ? "paid" : "unpaid";
  if (paid <= 0) return "unpaid";
  if (paid + 0.005 < total) return "partial";
  return "paid";
}

export function deriveBookingUiStatus(booking: BookingDto, now: Date = new Date()): BookingUiStatus {
  if (booking.status === "CANCELLED") return "cancelled";
  if (booking.status === "CHECKED_OUT" || booking.status === "COMPLETED") return "checked_out";

  const start = new Date(booking.checkIn).getTime();
  const end = new Date(booking.checkOut).getTime();
  const t = now.getTime();

  if (booking.status === "PENDING") return "pending";

  // CONFIRMED (and any future statuses that behave like an active reservation)
  if (Number.isFinite(start) && Number.isFinite(end) && t >= start && t < end && booking.room.status === "OCCUPIED") {
    return "checked_in";
  }

  return "confirmed";
}

export function bookingApiStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "CHECKED_OUT":
      return "Checked out";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}
