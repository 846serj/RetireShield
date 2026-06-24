import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { defaultOgImage } from "@/lib/seo";
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
  metadataBase: new URL(getPublicBaseUrl()),
  title: {
    default: "RetireShield — Your Free Retirement Safety Score",
    template: "%s | RetireShield",
  },
  description: "See how secure your retirement is in two minutes. Free Retirement Safety Score.",
  openGraph: {
    siteName: "RetireShield",
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: "RetireShield Retirement Safety Score preview" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
