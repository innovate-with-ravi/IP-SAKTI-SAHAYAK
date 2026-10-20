import { useSyncExternalStore } from "react";

export type AuthUser = { name: string; email: string };
const KEY = "ipsakti-user";
const listeners = new Set<() => void>();

const read = () => localStorage.getItem(KEY);
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function setUser(u: AuthUser | null) {
  if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function useUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribe, read);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
