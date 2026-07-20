"use client";

import { useAuth } from "@/hooks/useAuth";

export default function AuthGate({
  allow,
  children,
}: {
  allow: Array<"OWNER" | "PARTNER">;
  children: React.ReactNode;
}) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className="p-6 text-center text-sm opacity-60">Загрузка…</div>;
  }

  if (auth.status === "unauthorized" || !allow.includes(auth.role)) {
    return (
      <div className="p-6 text-center text-sm opacity-60">
        Открой это приложение через Telegram-бота.
      </div>
    );
  }

  return <>{children}</>;
}
