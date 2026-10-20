import { useSyncExternalStore } from "react";

export type AuthUser = {
  id?: string;
  name: string;
  email: string;
  token?: string;
};

const USER_KEY = "ipsakti-user";
const listeners = new Set<() => void>();

const read = () => localStorage.getItem(USER_KEY);
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function setUser(u: AuthUser | null) {
  if (u) {
    localStorage.setItem(USER_KEY, JSON.stringify({ name: u.name, email: u.email }));
    if (u.token) {
      localStorage.setItem("accessToken", u.token);
    }
    if (u.id) {
      localStorage.setItem("userId", u.id);
    }
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
  }
  listeners.forEach((l) => l());
}

export function useUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribe, read);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
