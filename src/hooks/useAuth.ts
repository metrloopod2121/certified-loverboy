"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type AuthState =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "authorized"; telegramId: string; role: "OWNER" | "PARTNER" };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/me")
      .then((data) => {
        if (!cancelled) setState({ status: "authorized", ...data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unauthorized" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
