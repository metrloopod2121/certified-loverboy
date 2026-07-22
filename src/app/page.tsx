"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import StorageScreen from "@/components/StorageScreen";
import { mutedText } from "@/lib/ui";
import SplashScreen from "@/components/SplashScreen";

export default function Home() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <SplashScreen />;
  }

  if (auth.status === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Lock className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>Open this app through the Telegram bot.</p>
      </div>
    );
  }

  return <StorageScreen readOnly={auth.role === "PARTNER"} />;
}
