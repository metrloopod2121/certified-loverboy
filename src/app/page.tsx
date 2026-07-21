"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import StorageScreen from "@/components/StorageScreen";
import { mutedText } from "@/lib/ui";

export default function Home() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "authorized" && auth.role === "PARTNER") {
      router.replace("/swipe");
    }
  }, [auth, router]);

  if (auth.status === "loading") {
    return <div className={`p-8 text-center ${mutedText}`}>Загрузка…</div>;
  }

  if (auth.status === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Lock className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>Открой это приложение через Telegram-бота.</p>
      </div>
    );
  }

  if (auth.role === "PARTNER") return null;

  return <StorageScreen />;
}
