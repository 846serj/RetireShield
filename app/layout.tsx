import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetireShield — Your free Retirement Safety Score",
  description: "See how secure your retirement is in 2 minutes. Free Retirement Safety Score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-3xl px-4 py-4 font-bold text-xl text-ink">RetireShield</div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t bg-white">
          <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-slate-500">
            RetireShield is for education and information only — not financial, tax, or legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
