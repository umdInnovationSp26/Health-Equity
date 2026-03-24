import "@/public/globals.css";
import { Montserrat, Bagel_Fat_One } from "next/font/google";
import React from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-montserrat",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Browser/Bookmark Text */}
        <title>Health Equity Northland</title>
        <meta name="description" content="HealthEquityNorthland" />

        {/* Meta */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Freshness */}
        <meta property="og:updated_time" content="2025-10-14T12:00:00Z" />

        {/* Vercel */}
        <Analytics />
        <SpeedInsights />
      </head>

      <body className={`${montserrat.variable} font-montserrat-normal`}>
        {children}
      </body>
    </html>
  );
}
