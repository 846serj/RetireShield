"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

const featureLinks = [
  { label: "Overview", href: "/features" },
  { label: "Safety Score", href: "/features/safety-score" },
  { label: "Monitoring", href: "/features/monitoring" },
  { label: "AI Coach", href: "/features/ai-coach" },
  { label: "Medicare & Social Security", href: "/features/medicare-social-security" },
  { label: "Scam Shield", href: "/features/scam-shield" },
];

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/upgrade" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
];

const footerColumns = [
  { title: "Product", links: [{ label: "Safety Score", href: "/features/safety-score" }, { label: "Monitoring", href: "/features/monitoring" }, { label: "AI Coach", href: "/features/ai-coach" }, { label: "Scam Shield", href: "/features/scam-shield" }] },
  { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "mailto:hello@retireshield.com" }] },
  { title: "Resources", links: [{ label: "Retirement Watch", href: "/resources" }, { label: "Guides", href: "/resources" }, { label: "Calculators", href: "/quiz" }] },
  { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Refund Policy", href: "/refund-policy" }, { label: "Disclosures", href: "/about#trust-heading" }] },
];

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3 text-ink no-underline hover:text-brand-dark" aria-label="RetireShield home">
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

export function SiteHeader({ userEmail }: { userEmail?: string | null }) {
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFeaturesOpen(false);
        setDrawerOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        setFeaturesOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  return (
    <>
      {announcementVisible && (
        <div className="bg-brand-dark text-white">
          <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-4 py-3 text-sm font-semibold sm:px-6 lg:px-8">
            <Link href="/quiz" className="text-white no-underline hover:text-white/90">
              Create an account first or start with the free Retirement Safety Score — no bank linking. <span className="underline underline-offset-4">Get started →</span>
            </Link>
            <button
              type="button"
              className="rounded-lg p-1 text-white/90 transition hover:bg-white/10 hover:text-white"
              onClick={() => setAnnouncementVisible(false)}
              aria-label="Dismiss announcement"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden flex-1 items-center justify-center gap-6 text-base font-semibold min-[1120px]:flex xl:gap-7" aria-label="Main navigation">
            <Link href="/#how-it-works" className="whitespace-nowrap text-ink no-underline hover:text-brand">How it works</Link>
            <div className="relative" ref={featuresRef}>
              <button
                type="button"
                className="whitespace-nowrap rounded-lg text-ink hover:text-brand"
                aria-expanded={featuresOpen}
                aria-controls="features-menu"
                onClick={() => setFeaturesOpen((open) => !open)}
              >
                Features ▾
              </button>
              {featuresOpen && (
                <div id="features-menu" className="absolute left-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
                  {featureLinks.map((link) => (
                    <Link key={link.label} href={link.href} role="menuitem" className="block rounded-xl px-4 py-3 text-ink no-underline hover:bg-band hover:text-brand" onClick={() => setFeaturesOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/upgrade" className="whitespace-nowrap text-ink no-underline hover:text-brand">Pricing</Link>
            <Link href="/resources" className="whitespace-nowrap text-ink no-underline hover:text-brand">Resources</Link>
            <Link href="/about" className="whitespace-nowrap text-ink no-underline hover:text-brand">About</Link>
          </nav>

          <div className="hidden shrink-0 items-center gap-6 min-[1120px]:flex xl:gap-7">
            {userEmail ? (
              <>
                <Button href="/dashboard" className="min-h-12 px-5 py-2 text-base">Dashboard</Button>
                <span className="max-w-48 truncate text-sm font-semibold text-slate-600" title={userEmail}>{userEmail}</span>
                <form action="/auth/sign-out" method="post">
                  <button type="submit" className="whitespace-nowrap font-bold text-ink no-underline hover:text-brand">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="whitespace-nowrap font-bold text-ink no-underline hover:text-brand">Log in</Link>
                <Button href="/signup" variant="secondary" className="min-h-14 whitespace-nowrap px-5 py-2 text-base">Create account</Button>
                <Button href="/quiz" className="min-h-14 whitespace-nowrap px-5 py-2 text-base">Free Safety Score</Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-ink min-[1120px]:hidden"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-menu"
            onClick={() => setDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 min-[1120px]:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} />
          <div id="mobile-menu" className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="mobile-menu-title" className="text-lg font-bold">Menu</h2>
              <button type="button" className="rounded-xl border border-slate-300 p-3" onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu">✕</button>
            </div>
            <nav className="mt-8 flex flex-col gap-2 text-lg font-bold" aria-label="Mobile navigation">
              {navLinks.slice(0, 1).map((link) => <Link key={link.label} href={link.href} className="rounded-xl px-3 py-3 text-ink no-underline hover:bg-band" onClick={() => setDrawerOpen(false)}>{link.label}</Link>)}
              <div className="px-3 pt-4 text-sm uppercase tracking-[0.18em] text-slate-500">Features</div>
              {featureLinks.map((link) => <Link key={link.label} href={link.href} className="rounded-xl px-3 py-3 text-ink no-underline hover:bg-band" onClick={() => setDrawerOpen(false)}>{link.label}</Link>)}
              {navLinks.slice(1).map((link) => <Link key={link.label} href={link.href} className="rounded-xl px-3 py-3 text-ink no-underline hover:bg-band" onClick={() => setDrawerOpen(false)}>{link.label}</Link>)}
            </nav>
            <div className="mt-auto grid gap-3 pt-8">
              {userEmail ? (
                <>
                  <Button href="/dashboard" onClick={() => setDrawerOpen(false)} className="w-full text-base">Dashboard</Button>
                  <p className="truncate text-center text-sm font-semibold text-slate-600">{userEmail}</p>
                  <form action="/auth/sign-out" method="post" className="text-center">
                    <button type="submit" className="font-bold text-ink no-underline">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-center font-bold text-ink no-underline" onClick={() => setDrawerOpen(false)}>Log in</Link>
                  <Button href="/signup" variant="secondary" onClick={() => setDrawerOpen(false)} className="w-full text-base">Create account</Button>
                  <Button href="/quiz" onClick={() => setDrawerOpen(false)} className="w-full text-base">Free Safety Score</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-base text-slate-600">Get the weekly Retirement Watch</p>
            <form className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input id="newsletter-email" type="email" placeholder="Email address" className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-base" />
              <Button type="submit" className="min-h-12 px-5 py-2 text-base">Subscribe</Button>
            </form>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="font-sans text-base font-extrabold text-ink">{column.title}</h2>
                <ul className="mt-4 space-y-3 text-base">
                  {column.links.map((link) => <li key={link.label}><a href={link.href} className="text-slate-600 no-underline hover:text-brand">{link.label}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm font-semibold text-slate-600">
          RetireShield is for education and information only — not financial, tax, or legal advice.
        </div>
      </div>
    </footer>
  );
}
