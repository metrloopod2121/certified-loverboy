"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderHeart, Map, Inbox, Heart, PartyPopper, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const OWNER_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Идеи", icon: FolderHeart },
  { href: "/map", label: "Карта", icon: Map },
  { href: "/import", label: "Импорт", icon: Inbox },
  { href: "/swipe", label: "Свайп", icon: Heart },
  { href: "/matches", label: "Мэтчи", icon: PartyPopper },
];

const PARTNER_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/swipe", label: "Свайп", icon: Heart },
  { href: "/matches", label: "Мэтчи", icon: PartyPopper },
];

export default function NavBar() {
  const auth = useAuth();
  const pathname = usePathname();

  if (auth.status !== "authorized") return null;

  const links = auth.role === "OWNER" ? OWNER_LINKS : PARTNER_LINKS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-3 flex justify-center gap-1 rounded-full border border-black/5 bg-[var(--tg-secondary-bg)]/90 px-1.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      style={{ marginBottom: "calc(var(--safe-bottom) + 12px)" }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 max-w-24 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition ${
              active
                ? "bg-[var(--tg-button)]/12 text-[var(--tg-button)]"
                : "text-[var(--tg-hint)] active:bg-black/5 dark:active:bg-white/5"
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
