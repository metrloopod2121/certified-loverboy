"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mutedText } from "@/lib/ui";
import SplashScreen from "@/components/SplashScreen";

export default function AuthGate({
  allow,
  children,
}: {
  allow: Array<"OWNER" | "PARTNER">;
  children: React.ReactNode;
}) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <SplashScreen />;
  }

  if (auth.status === "unauthorized" || !allow.includes(auth.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Lock className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>Open this app through the Telegram bot.</p>
      </div>
    );
  }

  return <>{children}</>;
}
