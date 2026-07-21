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
      className="sticky bottom-0 z-10 flex justify-center gap-1 border-t border-black/5 bg-[var(--tg-bg)]/95 px-2 pt-1.5 backdrop-blur dark:border-white/10"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 6px)" }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 max-w-24 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition ${
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
