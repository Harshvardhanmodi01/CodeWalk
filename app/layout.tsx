import type { Metadata } from "next";
import "./globals.css";
import { GlobalProvider } from "@/app/context/GlobalContext";
import AppContent from "@/app/AppContent";
import { Toaster } from "react-hot-toast";
import CookieConsent from "@/components/CookieConsent";
import { GoogleAnalytics } from '@next/third-parties/google';

// Use generic system fonts mock to allow offline building without Google Fonts network requests
const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "CodeWalk — Enterprise AI that runs on codebase outcomes",
  description: "Index, comprehend, and walk through your codebases dynamically with AI. Perfect for interview prep, developer onboarding, and active recall code learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // NOTE: Do NOT call headers() here. It is a Next.js Dynamic API that opts the
  // entire root layout (and therefore every page in the app) out of static rendering.
  // On Vercel, this forces every page navigation to go through a cold serverless
  // function call, causing the "buffering" delay users see when clicking links.
  // The x-nonce header was never set by middleware anyway (no middleware.ts exists),
  // so the nonce was always undefined — making the call purely wasted overhead.

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
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
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} />
      </body>
    </html>
  );
}