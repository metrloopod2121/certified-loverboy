"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const OWNER_LINKS = [
  { href: "/", label: "Хранилище" },
  { href: "/map", label: "Карта" },
  { href: "/import", label: "Импорт" },
  { href: "/swipe", label: "Свайп" },
  { href: "/matches", label: "Мэтчи" },
];

const PARTNER_LINKS = [
  { href: "/swipe", label: "Свайп" },
  { href: "/matches", label: "Мэтчи" },
];

export default function NavBar() {
  const auth = useAuth();
  const pathname = usePathname();

  if (auth.status !== "authorized") return null;

  const links = auth.role === "OWNER" ? OWNER_LINKS : PARTNER_LINKS;

  return (
    <nav className="sticky bottom-0 flex border-t bg-background text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex-1 text-center py-3 ${
            pathname === link.href ? "font-semibold" : "opacity-60"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
