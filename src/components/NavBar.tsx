"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderHeart, Map, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Ideas", icon: FolderHeart },
  { href: "/map", label: "Map", icon: Map },
];

export default function NavBar() {
  const auth = useAuth();
  const pathname = usePathname();

  if (auth.status !== "authorized") return null;
  // The place detail screen is a full-screen overlay (back button only, no tabbar).
  if (pathname.startsWith("/place/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-3 flex justify-center gap-0.5 rounded-full border border-[var(--app-outline)]/10 bg-[#f8d9e8]/70 px-1 py-1 shadow-[0_8px_22px_rgba(28,26,23,0.12)] backdrop-blur-xl"
      style={{ marginBottom: "calc(var(--safe-bottom) + 12px)" }}
    >
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-[58px] flex-1 max-w-24 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[10px] font-semibold transition ${
              active
                ? "bg-[var(--app-ink)] text-[var(--app-canvas)] shadow-[0_2px_0_rgba(28,26,23,0.16)]"
                : "text-[var(--app-ink)]/70 active:bg-[var(--app-ink)]/8"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
