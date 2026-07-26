"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/hooks/useLang";
import { mutedText } from "@/lib/ui";
import SplashScreen from "@/components/SplashScreen";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const t = useT();

  if (auth.status === "loading") {
    return <SplashScreen />;
  }

  if (auth.status === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Lock className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>{t("authGateHint")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
