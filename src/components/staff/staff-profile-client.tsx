"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

import { useStaffAuth } from "@/components/auth/staff-auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  fetchStaffMeClient,
  presignAssetUrlsClient,
  uploadUserProfileImageClient,
  type UploadProgressEvent,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const acceptImages = "image/jpeg,image/png,image/webp,image/gif";

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?";
}

export function StaffProfileClient() {
  const { user, updateUser } = useStaffAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.fullName ?? "Staff";
  const handleLine = useMemo(() => {
    if (!user) return "";
    const role = user.role?.name?.replace(/_/g, " ") ?? "Staff";
    return user.username ? `@${user.username} · ${role}` : role;
  }, [user]);

  const [remoteAvatarUrl, setRemoteAvatarUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgressEvent | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "finalizing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.profileImage) {
      setRemoteAvatarUrl(null);
      return;
    }
    void presignAssetUrlsClient([user.profileImage])
      .then((m) => {
        if (!cancelled) setRemoteAvatarUrl(m[user.profileImage!] ?? null);
      })
      .catch(() => {
        if (!cancelled) setRemoteAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.profileImage]);

  useEffect(() => {
    // Best-effort refresh so the profile page reflects the latest DB state.
    if (!user) return;
    let cancelled = false;
    void fetchStaffMeClient()
      .then((me) => {
        if (!cancelled) updateUser(me);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatarSrc = localPreviewUrl ?? remoteAvatarUrl ?? undefined;

  const onPick = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setError(null);
    setProgress(null);
    setPhase("idle");
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
  }, [localPreviewUrl]);

  const onUpload = useCallback(async () => {
    if (!user?.id) return;
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    setSaving(true);
    setError(null);
    setProgress({ loaded: 0, total: 0, percent: 0, lengthComputable: false });
    setPhase("uploading");
    try {
      const nextUser = await uploadUserProfileImageClient(user.id, file, (e) => setProgress(e));
      setPhase("finalizing");
      updateUser(nextUser);
      setPhase("done");
      window.setTimeout(() => setPhase("idle"), 900);
      if (inputRef.current) inputRef.current.value = "";
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setPhase("idle");
    } finally {
      setSaving(false);
      window.setTimeout(() => setProgress(null), 900);
    }
  }, [user?.id, updateUser, localPreviewUrl]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">
            Update your display photo for the staff dashboard.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-primary underline-offset-4 transition hover:underline dark:text-[#9de2ff]"
        >
          Back to dashboard
        </Link>
      </div>

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

      <section
        className={cn(
          "rounded-3xl p-6 ring-0 sm:p-8",
          "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
          "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 ring-0" size="lg">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-[#006782] to-[#00CCFF] text-sm font-bold text-white">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground dark:text-white">{displayName}</p>
              {handleLine ? (
                <p className="truncate text-xs font-medium text-muted-foreground dark:text-white/55">{handleLine}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <input
              ref={inputRef}
              type="file"
              accept={acceptImages}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-0 bg-[#f0f2f6] font-semibold text-foreground hover:bg-[#e4e7ee] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                onClick={() => inputRef.current?.click()}
                disabled={saving}
              >
                <Upload className="mr-2 size-4" strokeWidth={1.75} />
                Choose image
              </Button>
              <Button
                type="button"
                className="h-10 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 font-semibold text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
                onClick={() => void onUpload()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>

            {progress ? (
              <div className="w-full sm:w-[22rem]" role="status" aria-live="polite">
                <div className="mb-2 flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <span className="flex items-center gap-2 font-semibold text-foreground dark:text-white">
                    {phase === "finalizing" ? (
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                    ) : phase === "done" ? (
                      <CheckCircle2
                        className="size-4 text-emerald-600 dark:text-emerald-300"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    ) : null}
                    {phase === "finalizing"
                      ? "Finalizing…"
                      : phase === "done"
                        ? "Upload complete"
                        : "Upload progress"}
                  </span>
                  <span className="tabular-nums font-bold text-primary dark:text-[#9de2ff]">
                    {progress.lengthComputable ? `${progress.percent}%` : progress.loaded > 0 ? "Uploading…" : "Starting…"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(15_23_42/0.08)] dark:bg-[rgb(0_0_0/0.35)]">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF] transition-[width] duration-150 ease-out",
                      !progress.lengthComputable && progress.loaded > 0 ? "animate-pulse" : "",
                    )}
                    style={{
                      width: progress.lengthComputable ? `${progress.percent}%` : progress.loaded > 0 ? "88%" : "8%",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

