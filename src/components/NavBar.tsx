"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const OWNER_LINKS = [
  { href: "/", label: "Идеи", icon: "🗂️" },
  { href: "/map", label: "Карта", icon: "🗺️" },
  { href: "/import", label: "Импорт", icon: "📥" },
  { href: "/swipe", label: "Свайп", icon: "❤️" },
  { href: "/matches", label: "Мэтчи", icon: "🎉" },
];

const PARTNER_LINKS = [
  { href: "/swipe", label: "Свайп", icon: "❤️" },
  { href: "/matches", label: "Мэтчи", icon: "🎉" },
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
            <span className="text-[19px] leading-none">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
