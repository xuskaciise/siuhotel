"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { StaffUserDto } from "@/lib/api/apiService";
import {
  clearStaffSession,
  getStaffToken,
  readStaffUserFromStorage,
  setStaffSession,
  setStaffUser,
} from "@/lib/auth/staff-session";

type StaffAuthContextValue = {
  user: StaffUserDto | null;
  refreshFromStorage: () => void;
  setLoggedIn: (token: string, user: StaffUserDto) => void;
  updateUser: (user: StaffUserDto) => void;
  logout: () => void;
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUserDto | null>(null);

  const refreshFromStorage = useCallback(() => {
    const raw = readStaffUserFromStorage();
    if (raw && typeof raw === "object" && "id" in raw && "username" in raw) {
      setUser(raw as StaffUserDto);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (getStaffToken()) {
      refreshFromStorage();
    }
  }, [refreshFromStorage]);

  const setLoggedIn = useCallback((token: string, nextUser: StaffUserDto) => {
    setStaffSession(token, nextUser);
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: StaffUserDto) => {
    setStaffUser(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setUser(null);
  }, []);

  const value = useMemo<StaffAuthContextValue>(
    () => ({
      user,
      refreshFromStorage,
      setLoggedIn,
      updateUser,
      logout,
    }),
    [user, refreshFromStorage, setLoggedIn, updateUser, logout],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (ctx === null) {
    throw new Error("useStaffAuth must be used within StaffAuthProvider");
  }
  return ctx;
}
