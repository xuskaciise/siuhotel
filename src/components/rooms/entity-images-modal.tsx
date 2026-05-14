"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { GlassModal } from "@/components/rooms/glass-modal";
import { Button } from "@/components/ui/button";
import {
  listRoomStorageKeysClient,
  listRoomTypeStorageKeysClient,
  listCustomerStorageKeysClient,
  presignAssetUrlsClient,
  removeRoomImageClient,
  removeRoomTypeImageClient,
  removeCustomerImageClient,
  uploadRoomImagesClient,
  uploadRoomTypeImagesClient,
  uploadCustomerImagesClient,
  type UploadProgressEvent,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const acceptImages = "image/jpeg,image/png,image/webp,image/gif";

type EntityVariant = "room" | "room-type" | "customer";

function EntityImageGallery({
  variant,
  entityId,
  paths: dbPaths,
  onChanged,
}: {
  variant: EntityVariant;
  entityId: string;
  paths: string[];
  onChanged: () => void | Promise<void>;
}) {
  const [urlsByPath, setUrlsByPath] = useState<Record<string, string>>({});
  const [urlError, setUrlError] = useState<string | null>(null);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [storageListing, setStorageListing] = useState(false);
  const [uploadState, setUploadState] = useState<UploadProgressEvent | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "finalizing" | "done">("idle");
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayPaths = useMemo(
    () => [...new Set([...dbPaths, ...storageKeys])].sort(),
    [dbPaths, storageKeys],
  );

  const displayPathsKey = useMemo(() => displayPaths.join("\0"), [displayPaths]);

  const loadStorageKeys = useCallback(async () => {
    if (!entityId) {
      setStorageKeys([]);
      return;
    }
    setStorageListing(true);
    try {
      const keys =
        variant === "room-type"
          ? await listRoomTypeStorageKeysClient(entityId)
          : variant === "customer"
            ? await listCustomerStorageKeysClient(entityId)
            : await listRoomStorageKeysClient(entityId);
      setStorageKeys(keys);
    } catch {
      setStorageKeys([]);
    } finally {
      setStorageListing(false);
    }
  }, [entityId, variant]);

  useEffect(() => {
    void loadStorageKeys();
  }, [loadStorageKeys]);

  useEffect(() => {
    if (!entityId || displayPaths.length === 0) {
      setUrlsByPath({});
      setUrlError(null);
      setLoadingUrls(false);
      return;
    }
    let cancelled = false;
    setLoadingUrls(true);
    setUrlError(null);
    void presignAssetUrlsClient(displayPaths)
      .then((m) => {
        if (!cancelled) setUrlsByPath(m);
      })
      .catch((e) => {
        if (!cancelled) {
          setUrlError(e instanceof Error ? e.message : "Could not resolve image URLs.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUrls(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityId, displayPathsKey, displayPaths.length]);

  const refreshAfterChange = useCallback(async () => {
    setActionError(null);
    await onChanged();
    await loadStorageKeys();
  }, [onChanged, loadStorageKeys]);

  const onPickFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || !entityId) return;
      const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      setUploadState({ loaded: 0, total: 0, percent: 0, lengthComputable: false });
      setUploadPhase("uploading");
      setActionError(null);
      const onProgress = (e: UploadProgressEvent) => setUploadState(e);
      try {
        if (variant === "room-type") {
          await uploadRoomTypeImagesClient(entityId, files.slice(0, 20), onProgress);
        } else if (variant === "customer") {
          await uploadCustomerImagesClient(entityId, files.slice(0, 20), onProgress);
        } else {
          await uploadRoomImagesClient(entityId, files.slice(0, 20), onProgress);
        }
        setUploadState((prev) =>
          prev?.lengthComputable
            ? { ...prev, percent: 100 }
            : { loaded: prev?.loaded ?? 0, total: prev?.total ?? 0, percent: 100, lengthComputable: true },
        );
        setUploadPhase("finalizing");
        await refreshAfterChange();
        setUploadPhase("done");
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        // Keep the final 100% / done state visible briefly.
        window.setTimeout(() => {
          setUploadState(null);
          setUploadPhase("idle");
        }, 900);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [entityId, refreshAfterChange, variant],
  );

  const onRemove = useCallback(
    async (objectPath: string) => {
      if (!entityId) return;
      setRemovingPath(objectPath);
      setActionError(null);
      try {
        if (variant === "room-type") {
          await removeRoomTypeImageClient(entityId, objectPath);
        } else if (variant === "customer") {
          await removeCustomerImageClient(entityId, objectPath);
        } else {
          await removeRoomImageClient(entityId, objectPath);
        }
        await refreshAfterChange();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not remove image.");
      } finally {
        setRemovingPath(null);
      }
    },
    [entityId, refreshAfterChange, variant],
  );

  const inCatalog = useCallback((objectPath: string) => dbPaths.includes(objectPath), [dbPaths]);

  return (
    <div className="space-y-6">
      <p className="text-[0.875rem] leading-relaxed text-muted-foreground dark:text-[#a8b4c4] sm:text-[0.9375rem]">
        Gallery merges the <strong className="text-foreground/90 dark:text-white/90">catalog</strong> (
        {dbPaths.length} in database) with whatever already exists under this folder in MinIO (
        <span className="font-mono text-[0.75rem]">hotel-pos-assets</span>
        {variant === "room-type"
          ? ` / room-types / ${entityId}`
          : variant === "customer"
            ? ` / customers / ${entityId}`
            : ` / rooms / ${entityId}`}). JPEG,
        PNG, WebP, or GIF; up to 20 files per upload.
      </p>

      {urlError ? (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-200" role="alert">
          {urlError}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={acceptImages}
            multiple
            className="sr-only"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            disabled={uploadState !== null || !entityId}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "rounded-full border-0 font-semibold ring-0",
              "bg-[#f0f2f6] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] hover:bg-[#e4e7ee]",
              "dark:bg-[rgb(255_255_255/0.08)] dark:text-white dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
            )}
          >
            <Upload className="mr-2 size-4" strokeWidth={1.75} />
            {uploadState !== null ? "Uploading…" : "Add images"}
          </Button>
        </div>

        {uploadState !== null ? (
          <div
            className={cn(
              "rounded-xl px-4 py-3 ring-0",
              "bg-[#eef1f6] dark:bg-[rgb(255_255_255/0.06)]",
            )}
            role="status"
            aria-live="polite"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="flex items-center gap-2 font-semibold text-foreground dark:text-white">
                {uploadPhase === "finalizing" ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                ) : uploadPhase === "done" ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" strokeWidth={1.75} aria-hidden="true" />
                ) : null}
                {uploadPhase === "finalizing"
                  ? "Finalizing…"
                  : uploadPhase === "done"
                    ? "Upload complete"
                    : "Upload progress"}
              </span>
              <span className="tabular-nums font-bold text-primary dark:text-[#9de2ff]">
                {uploadState.lengthComputable
                  ? `${uploadState.percent}%`
                  : uploadState.loaded > 0
                    ? `${(uploadState.loaded / (1024 * 1024)).toFixed(2)} MB`
                    : "Starting…"}
              </span>
            </div>
            <div
              className={cn(
                "h-2.5 overflow-hidden rounded-full",
                "bg-[rgb(15_23_42/0.08)] dark:bg-[rgb(0_0_0/0.35)]",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF] transition-[width] duration-150 ease-out",
                  !uploadState.lengthComputable && uploadState.loaded > 0 ? "animate-pulse" : "",
                )}
                style={{
                  width: uploadState.lengthComputable
                    ? `${uploadState.percent}%`
                    : uploadState.loaded > 0
                      ? "88%"
                      : "8%",
                }}
              />
            </div>
            {uploadState.lengthComputable && uploadState.total > 0 ? (
              <p className="mt-2 text-[0.7rem] text-muted-foreground dark:text-[#8a97a8]">
                {(uploadState.loaded / (1024 * 1024)).toFixed(2)} MB of{" "}
                {(uploadState.total / (1024 * 1024)).toFixed(2)} MB
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {storageListing ? (
        <p className="text-sm text-muted-foreground dark:text-[#9aa8bc]">Reading MinIO folder…</p>
      ) : null}

      {loadingUrls && displayPaths.length > 0 ? (
        <p className="text-sm text-muted-foreground dark:text-[#9aa8bc]">Preparing signed previews…</p>
      ) : null}

      {!storageListing && displayPaths.length === 0 && !loadingUrls ? (
        <p className="text-sm text-muted-foreground dark:text-[#9aa8bc]">
          No files in this MinIO prefix and nothing in the catalog yet.
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:gap-7">
        {displayPaths.map((path) => {
          const href = urlsByPath[path];
          const busy = removingPath === path;
          const catalog = inCatalog(path);
          return (
            <li
              key={path}
              className={cn(
                "relative overflow-hidden rounded-2xl ring-0",
                "bg-[#eef0f4] shadow-[0_8px_28px_rgb(15_23_42/0.08)] dark:bg-[rgb(255_255_255/0.05)]",
                "dark:shadow-[0_12px_36px_rgb(0_0_0/0.28)]",
              )}
            >
              <div className="aspect-[4/3] min-h-[13rem] w-full sm:min-h-[15rem] lg:min-h-[17rem] xl:min-h-[18rem]">
                {href ? (
                  <img
                    src={href}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    …
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[0.7rem] text-muted-foreground opacity-90 dark:text-[#9aa8bc] sm:text-xs">
                    {path.split("/").pop()}
                  </span>
                  {catalog ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onRemove(path)}
                      className="size-9 shrink-0 rounded-full text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                      aria-label="Remove from catalog and MinIO"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide sm:text-[0.7rem]",
                        "bg-amber-400/25 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100",
                      )}
                      title="File is in MinIO but not linked in the database catalog"
                    >
                      MinIO only
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EntityImagesModal({
  open,
  onOpenChange,
  variant,
  entityId,
  title,
  subtitle,
  paths,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: EntityVariant;
  entityId: string;
  title: string;
  subtitle?: string;
  paths: string[];
  onUpdated: () => void | Promise<void>;
}) {
  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title={title}
      description={
        subtitle ??
        "Gallery is backed by MinIO. Thumbnails use short-lived signed URLs; refresh if a preview expires."
      }
      footer={
        <Button
          type="button"
          variant="ghost"
          className="rounded-full border-0"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      }
    >
      <EntityImageGallery
        variant={variant}
        entityId={entityId}
        paths={paths}
        onChanged={onUpdated}
      />
    </GlassModal>
  );
}

export function EntityImagesTriggerButton({
  onClick,
  label = "Photos",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "rounded-full border-0 font-semibold ring-0",
        "bg-[rgb(255_255_255/0.55)] text-foreground shadow-[0_4px_16px_rgb(15_23_42/0.08)] backdrop-blur-md",
        "hover:bg-white dark:bg-[rgb(255_255_255/0.08)] dark:text-white dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
      )}
    >
      <ImageIcon className="mr-2 size-4" strokeWidth={1.75} />
      {label}
    </Button>
  );
}
