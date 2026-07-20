"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
        <span className="text-4xl">🔒</span>
        <p className={mutedText}>Открой это приложение через Telegram-бота.</p>
      </div>
    );
  }

  if (auth.role === "PARTNER") return null;

  return <StorageScreen />;
}
