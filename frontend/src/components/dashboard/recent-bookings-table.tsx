import { ChevronDown, MoreVertical, Plus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type BookingDto,
  fetchBookingsFromBackend,
  mapRoomStatusToDisplay,
  type RoomDisplayStatus,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusBadgeClasses(status: RoomDisplayStatus): string {
  switch (status) {
    case "OCCUPIED":
      return "border-0 bg-[#e8ecff] text-[#4f46e5] shadow-none dark:bg-[#2a3150] dark:text-[#a5b4fc]";
    case "AVAILABLE":
      return "border-0 bg-[#dcfce7] text-[#166534] shadow-none dark:bg-[#1a3d2d] dark:text-[#86efac]";
    case "CLEANING":
      return "border-0 bg-[#dbeafe] text-[#1e40af] shadow-none dark:bg-[#1e2a40] dark:text-[#93c5fd]";
    default:
      return "border-0 bg-muted text-muted-foreground shadow-none";
  }
}

function statusLabel(status: RoomDisplayStatus): string {
  switch (status) {
    case "OCCUPIED":
      return "Occupied";
    case "AVAILABLE":
      return "Available";
    case "CLEANING":
      return "Cleaning";
    default:
      return status;
  }
}

function formatCheckIn(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export async function RecentBookingsTable() {
  let rows: BookingDto[] = [];
  let error: string | null = null;
  try {
    rows = await fetchBookingsFromBackend();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load bookings";
  }

  const recent = rows.slice(0, 8);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-card shadow-elevation-soft ring-0 dark:bg-card/95 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl">
      <CardHeader className="px-8 pb-2 pt-8">
        <CardTitle className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">
          Recent Bookings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-4 pb-8 sm:px-8">
        {error ? (
          <p className="text-[0.875rem] text-muted-foreground">{error}</p>
        ) : recent.length === 0 ? (
          <p className="text-[0.875rem] text-muted-foreground">No bookings yet.</p>
        ) : (
          <>
            <Table>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-label-editorial text-table-header-warm">
                    Guest
                  </TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">
                    Room &amp; Type
                  </TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">Status</TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">
                    Check-in Date
                  </TableHead>
                  <TableHead className="w-12 text-label-editorial text-table-header-warm">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-0">
                {recent.map((b, index) => {
                  const display = mapRoomStatusToDisplay(b.room.status);
                  return (
                    <TableRow
                      key={b.id}
                      className={cn(
                        "border-0 transition-colors",
                        index % 2 === 1 ? "bg-muted/25 dark:bg-[#1a2230]/80" : "bg-transparent",
                        "hover:bg-muted/40 dark:hover:bg-[#242a3a]/90",
                      )}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 ring-0">
                            <AvatarFallback className="bg-muted text-[0.75rem] font-semibold text-foreground dark:bg-[#2f3445] dark:text-white">
                              {initials(b.customer.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[0.9375rem] font-semibold text-foreground dark:text-white">
                              {b.customer.fullName}
                            </p>
                            <p className="text-[0.75rem] text-muted-foreground">Guest</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-[0.875rem] text-muted-foreground">
                        Room {b.room.roomNumber}, {b.room.roomType.name}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.06em]",
                            statusBadgeClasses(display),
                          )}
                        >
                          {statusLabel(display)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-[0.875rem] text-muted-foreground">
                        {formatCheckIn(b.checkIn)}
                      </TableCell>
                      <TableCell className="py-4">
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground ring-0 transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                          aria-label="Row actions"
                        >
                          <MoreVertical className="size-4" strokeWidth={1.75} />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold text-muted-foreground ring-0 transition hover:bg-muted/50 dark:hover:bg-white/[0.06]"
              >
                Load more records
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-elevation-soft-md ring-0 transition hover:brightness-110 dark:shadow-[0_0_28px_rgba(0,204,255,0.5)]"
                aria-label="Add booking"
              >
                <Plus className="size-6" strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
