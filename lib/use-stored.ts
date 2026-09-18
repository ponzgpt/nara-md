"use client";
// useState that survives reloads. Reads after mount to keep server and client HTML identical;
// storage failures (private mode, blocked cookies) fall back to plain state.
import { useEffect, useState } from "react";

export function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [value, set];
}
