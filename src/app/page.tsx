"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import StorageScreen from "@/components/StorageScreen";

export default function Home() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "authorized" && auth.role === "PARTNER") {
      router.replace("/swipe");
    }
  }, [auth, router]);

  if (auth.status === "loading") {
    return <div className="p-6 text-center text-sm opacity-60">Загрузка…</div>;
  }

  if (auth.status === "unauthorized") {
    return (
      <div className="p-6 text-center text-sm opacity-60">
        Открой это приложение через Telegram-бота.
      </div>
    );
  }

  if (auth.role === "PARTNER") return null;

  return <StorageScreen />;
}
