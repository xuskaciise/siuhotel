export const STAFF_TOKEN_KEY = "siu_staff_token";
export const STAFF_USER_KEY = "siu_staff_user";

export function getStaffToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function setStaffSession(token: string, user: unknown): void {
  localStorage.setItem(STAFF_TOKEN_KEY, token);
  localStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
}

export function setStaffUser(user: unknown): void {
  localStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
}

export function clearStaffSession(): void {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(STAFF_USER_KEY);
}

export function readStaffUserFromStorage(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STAFF_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function getStaffAuthHeaders(): Record<string, string> {
  const t = getStaffToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
