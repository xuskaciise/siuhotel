"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";

import { useStaffAuth } from "@/components/auth/staff-auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUserClient,
  deleteUserClient,
  fetchRolesClient,
  fetchUsersClient,
  presignAssetUrlsClient,
  type CreateStaffUserPayload,
  type RoleDto,
  type StaffUserDto,
  updateUserClient,
  uploadUserProfileImageClient,
} from "@/lib/api/apiService";
import { paginateArray } from "@/lib/pagination";
import { useUrlPagination } from "@/lib/use-url-pagination";
import { GlassModal } from "@/components/rooms/glass-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass =
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

const acceptImages = "image/jpeg,image/png,image/webp,image/gif";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function defaultRoleId(roles: RoleDto[]): string {
  const staff = roles.find((r) => r.name === "STAFF");
  return (staff ?? roles[0])?.id ?? "";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function StaffUsersClient() {
  const router = useRouter();
  const { user: loggedInUser } = useStaffAuth();
  const [users, setUsers] = useState<StaffUserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageSize = 10;
  const { state: paging, setPage, reset: resetPage } = useUrlPagination({ pageSize, pageParam: "page" });

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffUserDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileFilePreviewUrl, setProfileFilePreviewUrl] = useState<string | null>(null);
  const [avatarUrlByUserId, setAvatarUrlByUserId] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [users]);
  const { items: pagedUsers, meta } = useMemo(() => paginateArray(sortedUsers, paging), [sortedUsers, paging]);

  const reloadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      const u = await fetchUsersClient();
      setUsers(u);
      router.refresh();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load staff data.");
    }
  }, [router]);

  const reloadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [u, r] = await Promise.all([fetchUsersClient(), fetchRolesClient()]);
      setUsers(u);
      setRoles(r);
      if (r.length > 0) {
        setRoleId((prev) => (prev ? prev : defaultRoleId(r)));
      }
      router.refresh();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load staff data.");
    }
  }, [router]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    // Resolve signed avatar URLs for visible page users (best-effort).
    let cancelled = false;
    async function run() {
      const subset = pagedUsers.slice(0, 20);
      const missing = subset.filter((u) => u.profileImage && avatarUrlByUserId[u.id] === undefined);
      if (missing.length === 0) return;
      const paths = missing.map((u) => u.profileImage!).filter(Boolean);
      try {
        const urlByPath = await presignAssetUrlsClient(paths);
        if (cancelled) return;
        setAvatarUrlByUserId((prev) => {
          const next = { ...prev };
          for (const u of missing) {
            const url = u.profileImage ? urlByPath[u.profileImage] : undefined;
            if (url) next[u.id] = url;
          }
          return next;
        });
      } catch {
        // ignore
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [pagedUsers, avatarUrlByUserId]);

  const resetForm = useCallback(() => {
    setUsername("");
    setFullName("");
    setEmail("");
    setPassword("");
    setFormError(null);
    setRoleId((prev) => prev); // keep current role selection if already loaded
    if (fileRef.current) fileRef.current.value = "";
    if (profileFilePreviewUrl) URL.revokeObjectURL(profileFilePreviewUrl);
    setProfileFilePreviewUrl(null);
  }, []);

  const selectedList = useMemo(
    () => Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k),
    [selectedIds],
  );

  const canTarget = useCallback(
    (target: StaffUserDto) => {
      // Prevent locking/deleting the currently logged-in user (admin safety).
      return loggedInUser?.id ? target.id !== loggedInUser.id : true;
    },
    [loggedInUser?.id],
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!username.trim() || !fullName.trim() || password.length < 8) {
      setFormError("Username, full name, and password (8+ characters) are required.");
      return;
    }
    if (!roleId) {
      setFormError("Choose a role.");
      return;
    }
    const payload: CreateStaffUserPayload = {
      username: username.trim(),
      fullName: fullName.trim(),
      password,
      roleId,
      email: email.trim() || undefined,
    };
    setSubmitting(true);
    try {
      const created = await createUserClient(payload);

      const picked = fileRef.current?.files?.[0] ?? null;
      if (picked) {
        await uploadUserProfileImageClient(created.id, picked);
      }

      resetForm();
      await reloadUsers();
      resetPage();
      setCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);
    if (!username.trim() || !fullName.trim()) {
      setFormError("Username and full name are required.");
      return;
    }
    if (!roleId) {
      setFormError("Choose a role.");
      return;
    }
    if (password.trim() !== "" && password.length < 8) {
      setFormError("Password must be 8+ characters (or leave empty to keep unchanged).");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateUserClient(editingUser.id, {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim() ? email.trim() : null,
        roleId,
        password: password.trim() ? password : undefined,
      });

      const picked = fileRef.current?.files?.[0] ?? null;
      if (picked) {
        await uploadUserProfileImageClient(updated.id, picked);
      }

      resetForm();
      setEditingUser(null);
      setCreateOpen(false);
      await reloadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setSubmitting(false);
    }
  }

  const setActive = useCallback(
    async (target: StaffUserDto, isActive: boolean) => {
      if (!canTarget(target)) return;
      setSubmitting(true);
      setFormError(null);
      try {
        await updateUserClient(target.id, { isActive });
        await reloadUsers();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Could not update status.");
      } finally {
        setSubmitting(false);
      }
    },
    [canTarget, reloadUsers],
  );

  const bulkSetActive = useCallback(
    async (isActive: boolean) => {
      const ids = selectedList.filter((id) => id !== loggedInUser?.id);
      if (ids.length === 0) return;
      setBulkSubmitting(true);
      setBulkError(null);
      try {
        await Promise.all(ids.map((id) => updateUserClient(id, { isActive })));
        setSelectedIds({});
        await reloadUsers();
      } catch (e) {
        setBulkError(e instanceof Error ? e.message : "Bulk update failed.");
      } finally {
        setBulkSubmitting(false);
      }
    },
    [selectedList, loggedInUser?.id, reloadUsers],
  );
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteUserClient(deleteTarget.id);
      setDeleteTarget(null);
      await reloadUsers();
      resetPage();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete user.");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTarget, reloadUsers, resetPage]);

  return (
    <div className="space-y-8">
      {loadError ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-medium ring-0",
            "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-100",
          )}
          role="alert"
        >
          {loadError}
        </div>
      ) : null}
      {bulkError ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-medium ring-0",
            "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-100",
          )}
          role="alert"
        >
          {bulkError}
        </div>
      ) : null}

      <GlassModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setFormError(null);
            if (!submitting) {
              setPassword("");
            }
            setEditingUser(null);
          }
        }}
        title={editingUser ? "Update staff user" : "Add staff user"}
        description={
          editingUser
            ? "Update staff profile fields. Leave password empty to keep it unchanged."
            : "Abuur isticmaale cusub oo ku soo gali kara system-ka (username + password)."
        }
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={editingUser ? "update-staff-user" : "create-staff-user"}
              disabled={submitting || roles.length === 0}
              className="rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-8 text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
            >
              {submitting ? (editingUser ? "Updating…" : "Creating…") : editingUser ? "Update user" : "Create user"}
            </Button>
          </>
        }
      >
        <form
          id={editingUser ? "update-staff-user" : "create-staff-user"}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(ev) => void (editingUser ? onUpdate(ev) : onCreate(ev))}
        >
          {formError ? (
            <p className="sm:col-span-2 text-sm font-medium text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="nu-profile-image">
              Profile image (optional)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-11 ring-0">
                  {profileFilePreviewUrl ? <AvatarImage src={profileFilePreviewUrl} alt="" /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#006782] to-[#00CCFF] text-xs font-bold text-white">
                    {initials(fullName || username || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-white">Upload photo</p>
                  <p className="truncate text-xs text-muted-foreground dark:text-[#8a97a8]">
                    JPEG, PNG, WebP, or GIF
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  id="nu-profile-image"
                  type="file"
                  accept={acceptImages}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !file.type.startsWith("image/")) return;
                    if (profileFilePreviewUrl) URL.revokeObjectURL(profileFilePreviewUrl);
                    setProfileFilePreviewUrl(URL.createObjectURL(file));
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-0 bg-[#f0f2f6] font-semibold text-foreground hover:bg-[#e4e7ee] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
                  onClick={() => fileRef.current?.click()}
                  disabled={submitting}
                >
                  Choose image
                </Button>
                {profileFilePreviewUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-full border-0"
                    onClick={() => {
                      if (fileRef.current) fileRef.current.value = "";
                      if (profileFilePreviewUrl) URL.revokeObjectURL(profileFilePreviewUrl);
                      setProfileFilePreviewUrl(null);
                    }}
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="nu-username">
              Username
            </label>
            <input
              id="nu-username"
              className={fieldClass}
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="nu-fullname">
              Full name
            </label>
            <input
              id="nu-fullname"
              className={fieldClass}
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="nu-email">
              Email (optional)
            </label>
            <input
              id="nu-email"
              type="email"
              className={fieldClass}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="nu-password">
              {editingUser ? "Password (optional)" : "Password"}
            </label>
            <input
              id="nu-password"
              type="password"
              className={fieldClass}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              minLength={8}
              required={!editingUser}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="nu-role">
              Role
            </label>
            <select
              id="nu-role"
              className={cn(fieldClass, "cursor-pointer")}
              value={roleId}
              onChange={(ev) => setRoleId(ev.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </GlassModal>

      <Card className="shadow-elevation-2 ring-0 dark:bg-card/90">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg font-semibold tracking-tight">Staff directory</CardTitle>
            <CardDescription>{users.length} user{users.length === 1 ? "" : "s"} in the system.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={bulkSubmitting || selectedList.length === 0}
              onClick={() => void bulkSetActive(true)}
              className="h-10 rounded-full border-0 bg-[#f0f2f6] px-4 text-[0.8125rem] font-semibold text-foreground hover:bg-[#e4e7ee] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
              title="Activate selected users"
            >
              <LockOpen className="mr-2 size-4" strokeWidth={1.8} />
              Active
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={bulkSubmitting || selectedList.length === 0}
              onClick={() => void bulkSetActive(false)}
              className="h-10 rounded-full border-0 bg-[#f0f2f6] px-4 text-[0.8125rem] font-semibold text-foreground hover:bg-[#e4e7ee] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
              title="Deactivate selected users"
            >
              <Lock className="mr-2 size-4" strokeWidth={1.8} />
              Inactive
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setFormError(null);
                if (roles.length > 0) {
                  setRoleId((prev) => (prev ? prev : defaultRoleId(roles)));
                }
                setCreateOpen(true);
              }}
              className="h-10 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-5 text-[0.8125rem] font-semibold text-[#0d1322] hover:from-[#33d6ff] hover:to-[#00b4ea]"
            >
              <Plus className="mr-2 size-4" strokeWidth={2} />
              Add new user
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet. Use the form above or run database seed.</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <input
                        type="checkbox"
                        aria-label="Select all users on page"
                        checked={
                          pagedUsers.length > 0 &&
                          pagedUsers
                            .filter((u) => canTarget(u))
                            .every((u) => selectedIds[u.id] === true)
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedIds((prev) => {
                            const next = { ...prev };
                            for (const u of pagedUsers) {
                              if (!canTarget(u)) continue;
                              next[u.id] = checked;
                            }
                            return next;
                          });
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[72px]">Photo</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select @${u.username}`}
                          disabled={!canTarget(u)}
                          checked={selectedIds[u.id] === true}
                          onChange={(e) =>
                            setSelectedIds((prev) => ({ ...prev, [u.id]: e.target.checked }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Avatar className="size-10 ring-0">
                          {avatarUrlByUserId[u.id] ? <AvatarImage src={avatarUrlByUserId[u.id]} alt={u.fullName} /> : null}
                          <AvatarFallback className="bg-muted text-[0.75rem] font-semibold text-foreground dark:bg-[#2f3445] dark:text-white">
                            {initials(u.fullName)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">@{u.username}</TableCell>
                      <TableCell>{u.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>{u.role.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide",
                            u.isActive
                              ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                              : "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
                          )}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={!canTarget(u) || submitting}
                            className={cn(
                              "flex size-10 items-center justify-center rounded-2xl ring-0 transition",
                              !canTarget(u)
                                ? "opacity-40"
                                : "text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white",
                            )}
                            aria-label={u.isActive ? "Lock user" : "Unlock user"}
                            onClick={() => void setActive(u, !u.isActive)}
                            title={!canTarget(u) ? "You cannot lock your own account." : u.isActive ? "Set inactive" : "Set active"}
                          >
                            {u.isActive ? (
                              <Lock className="size-4" strokeWidth={1.75} />
                            ) : (
                              <LockOpen className="size-4" strokeWidth={1.75} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-2xl text-muted-foreground ring-0 transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                            aria-label="Edit user"
                            onClick={() => {
                              setEditingUser(u);
                              setFormError(null);
                              setUsername(u.username);
                              setFullName(u.fullName);
                              setEmail(u.email ?? "");
                              setPassword("");
                              setRoleId(u.role.id);
                              if (fileRef.current) fileRef.current.value = "";
                              if (profileFilePreviewUrl) URL.revokeObjectURL(profileFilePreviewUrl);
                              setProfileFilePreviewUrl(null);
                              setCreateOpen(true);
                            }}
                          >
                            <Pencil className="size-4" strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            disabled={!canTarget(u)}
                            className="flex size-10 items-center justify-center rounded-2xl text-muted-foreground ring-0 transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                            aria-label="Delete user"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(u);
                            }}
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.totalItems}
                pageSize={meta.pageSize}
                onPageChange={(p) => setPage(p, meta.totalItems)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <GlassModal
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete user?"
        description={
          deleteTarget
            ? `Permanently remove @${deleteTarget.username} (${deleteTarget.fullName}). This cannot be undone.`
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
              onClick={() => void confirmDelete()}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting…" : "Delete user"}
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
    </div>
  );
}
