"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffAuth } from "@/components/auth/staff-auth-provider";
import {
  SYSTEM_RESET_CONFIRM_PHRASE,
  resetSystemDataClient,
  type SystemResetDeletedCounts,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

function formatCounts(c: SystemResetDeletedCounts): string {
  return [
    `${c.transactions} transactions`,
    `${c.bookings} bookings`,
    `${c.customers} customers`,
    `${c.rooms} rooms`,
    `${c.roomTypes} room types`,
    `${c.heroSections} hero sections`,
    `${c.hotelInfoRows} hotel info rows`,
    `${c.usersDeleted} other users`,
  ].join(" · ");
}

export function SystemSettingsClient() {
  const { user, updateUser } = useStaffAuth();
  const [phrase, setPhrase] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SystemResetDeletedCounts | null>(null);

  const onReset = useCallback(async () => {
    setError(null);
    setDone(null);
    if (user?.role?.name !== "ADMIN") {
      setError("Only administrators can reset the database.");
      return;
    }
    if (!ack) {
      setError("Confirm that you understand this action cannot be undone.");
      return;
    }
    if (phrase !== SYSTEM_RESET_CONFIRM_PHRASE) {
      setError(`Type exactly: ${SYSTEM_RESET_CONFIRM_PHRASE}`);
      return;
    }
    setBusy(true);
    try {
      const { deleted, user: nextUser } = await resetSystemDataClient();
      updateUser(nextUser);
      setDone(deleted);
      setPhrase("");
      setAck(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }, [ack, phrase, updateUser, user?.role?.name]);

  if (user?.role?.name !== "ADMIN") {
    return (
      <Card className="max-w-xl border-0 shadow-elevation-soft dark:shadow-elevation-1">
        <CardHeader>
          <CardTitle className="font-display text-lg">System settings</CardTitle>
          <CardDescription>Administrator access is required for this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card className="border-0 shadow-elevation-soft dark:shadow-elevation-1">
        <CardHeader>
          <CardTitle className="font-display text-lg">System settings</CardTitle>
          <CardDescription>
            Danger zone: remove all hotel operational data from the database. Your admin account stays signed in;
            every other staff user and all bookings, customers, rooms, CMS rows, and related records are removed.
            MinIO files are not deleted automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 size-4 rounded border-muted-foreground/40"
            />
            <span>I understand this is permanent and cannot be undone.</span>
          </label>
          <div>
            <label className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Type confirmation phrase
            </label>
            <input
              className={fieldClass}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={SYSTEM_RESET_CONFIRM_PHRASE}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          {done ? (
            <p className="rounded-lg bg-muted/80 px-3 py-2 text-sm text-foreground dark:bg-white/[0.06]">
              Reset complete: {formatCounts(done)}
            </p>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="rounded-full font-semibold"
            disabled={busy}
            onClick={() => void onReset()}
          >
            {busy ? "Resetting…" : "Delete all system data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
