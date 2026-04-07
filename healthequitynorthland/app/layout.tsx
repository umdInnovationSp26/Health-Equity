import "@/public/globals.css";
import { Roboto, Merriweather, JetBrains_Mono } from "next/font/google";
import React from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next"; //not sure if we need this

const fontSans = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

//not sure if we need this
export const metadata: Metadata = {
  title: "Health Equity Northland",
  description: "Health Equity Northland",
};

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

      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
