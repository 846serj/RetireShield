"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SubscriptionAccess } from "@/lib/subscription-types";
import { Button } from "@/components/ui";

const navItems = [
  { label: "Home", href: "/ask" },
  { label: "Safety Score", href: "/dashboard/score" },
  { label: "Retirement Watch", href: "/dashboard/monitoring" },
  { label: "AI Coach", href: "/dashboard/coach" },
  { label: "Tools", href: "/dashboard/tools" },
  { label: "Accounts", href: "/dashboard/accounts" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

function LogoLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/ask" onClick={onClick} className="flex min-h-12 items-center gap-3 text-ink no-underline hover:text-brand-dark" aria-label="RetireShield dashboard">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-dark text-white shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight">RetireShield</span>
    </Link>
  );
}

function PlanBadge({ access }: { access: SubscriptionAccess }) {
  const label = access.active ? access.tier : "free";
  return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">{label}</span>;
}

function SidebarNav({ onNavigate, unreadAlertCount = 0 }: { onNavigate?: () => void; unreadAlertCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="mt-8 grid gap-2" aria-label="App navigation">
      {navItems.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showUnreadBadge = item.href === "/dashboard/monitoring" && unreadAlertCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-base font-extrabold no-underline transition ${active ? "bg-brand text-white shadow-sm" : "text-ink hover:bg-band hover:text-brand"}`}
          >
            <span>{item.label}</span>
            {showUnreadBadge ? (
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ${active ? "bg-white text-brand" : "bg-brand text-white"}`} aria-label={`${unreadAlertCount} unread Retirement Watch alerts`}>
                {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children, userEmail, access, unreadAlertCount = 0 }: { children: React.ReactNode; userEmail: string; access: SubscriptionAccess; unreadAlertCount?: number }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isFree = !access.active;

  return (
    <div className="min-h-screen bg-slate-50 text-ink lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white px-5 py-6 lg:block">
        <LogoLink />
        <SidebarNav unreadAlertCount={unreadAlertCount} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-ink lg:hidden" aria-label="Open app navigation" onClick={() => setDrawerOpen(true)}>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="hidden lg:block"><LogoLink /></div>
            <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
              <span className="hidden max-w-64 truncate text-sm font-bold text-slate-600 sm:inline" title={userEmail}>{userEmail}</span>
              <PlanBadge access={access} />
              {isFree ? <Button href="/upgrade" className="hidden min-h-11 px-4 py-2 text-sm sm:inline-flex">Upgrade</Button> : null}
              <form action="/auth/sign-out" method="post">
                <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-extrabold text-ink hover:bg-band hover:text-brand">Sign out</button>
              </form>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="app-menu-title">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close app navigation" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-full max-w-sm flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="app-menu-title" className="text-lg font-bold">App menu</h2>
              <button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 font-bold" onClick={() => setDrawerOpen(false)} aria-label="Close app navigation">✕</button>
            </div>
            <div className="mt-6"><LogoLink onClick={() => setDrawerOpen(false)} /></div>
            <SidebarNav onNavigate={() => setDrawerOpen(false)} unreadAlertCount={unreadAlertCount} />
            {isFree ? <Button href="/upgrade" onClick={() => setDrawerOpen(false)} className="mt-auto w-full text-base">Upgrade</Button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
