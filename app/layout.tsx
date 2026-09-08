import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { getPublicBaseUrl } from "@/lib/siteUrl";
import { defaultOgImage } from "@/lib/seo";
import { PostHogProvider } from "@/components/PostHogProvider";
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
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
  openGraph: {
    siteName: "RetireShield",
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: "RetireShield Retirement Safety Score preview" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <head>
        <Script id="trustedform" type="text/javascript" strategy="afterInteractive">
          {`(function() {
  var tf = document.createElement('script');
  tf.type = 'text/javascript';
  tf.async = true;
  tf.src = ("https:" == document.location.protocol ? 'https' : 'http') +
    '://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&use_tagged_consent=true&l=' +
    new Date().getTime() + Math.random();
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(tf, s);
})();`}
        </Script>
        <noscript><img src="https://api.trustedform.com/ns.gif" alt="" /></noscript>
      </head>
      <body className="min-h-screen font-sans"><PostHogProvider>{children}</PostHogProvider></body>
    </html>
  );
}
