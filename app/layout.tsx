import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "@/app/context/GlobalContext";
import AppContent from "@/app/AppContent";
import { Toaster } from "react-hot-toast";
import CookieConsent from "@/components/CookieConsent";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CodeWalk — Enterprise AI that runs on codebase outcomes",
  description: "Index, comprehend, and walk through your codebases dynamically with AI. Perfect for interview prep, developer onboarding, and active recall code learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${inter.className} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://rteithxwzclqtmjruevb.supabase.co" />
        <link rel="preconnect" href="https://api.groq.com" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,wght@0..1,100..700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        <GlobalProvider>
          <AppContent>{children}</AppContent>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#151d1e',
                color: '#F1F5F9',
                border: '1px solid #3b494b',
              },
            }}
          />
          <CookieConsent />
        </GlobalProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}