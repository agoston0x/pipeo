"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV: { href: string; label: string }[] = [
  { href: "/channels", label: "Channels" },
  { href: "/users", label: "Users" },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header
      className="h-16 sticky top-0 z-20 backdrop-blur-md border-b"
      style={{ borderColor: "var(--rule)", background: "color-mix(in srgb, var(--bg) 75%, transparent)" }}
    >
      <div className="h-full max-w-[1480px] mx-auto px-8 flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2.5 text-display text-[15px] font-semibold tracking-[0.04em] leading-none">
          <Logo />
          <span>PIPEO</span>
        </Link>
        <nav className="flex items-center gap-7">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`text-sm transition-colors ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden md:flex items-center gap-2 text-mono text-[11px] text-ink-faint">
            <span className="size-1.5 rounded-full bg-up pulse-soft" style={{ background: "var(--color-up)" }} />
            swarm online
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="cp-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4DA2FF" />
          <stop offset="0.6" stopColor="#a8d5ff" />
          <stop offset="1" stopColor="#FE8BC2" />
        </linearGradient>
      </defs>
      <rect x="3"  y="6"  width="3.6" height="20" rx="1.8" fill="url(#cp-grad)" />
      <rect x="9"  y="3"  width="3.6" height="26" rx="1.8" fill="url(#cp-grad)" opacity="0.85" />
      <rect x="15" y="9"  width="3.6" height="20" rx="1.8" fill="url(#cp-grad)" opacity="0.7" />
      <rect x="21" y="6"  width="3.6" height="22" rx="1.8" fill="url(#cp-grad)" opacity="0.55" />
      <circle cx="4.8" cy="6.5" r="2" fill="#FE8BC2" opacity="0.9" />
    </svg>
  );
}
