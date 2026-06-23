import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RetireShield — Your free Retirement Safety Score",
  description: "See how secure your retirement is in 2 minutes. Free Retirement Safety Score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-container px-4 py-4 text-xl font-bold text-ink sm:px-6 lg:px-8">RetireShield</div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-container px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
            RetireShield is for education and information only — not financial, tax, or legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
