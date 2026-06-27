import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "@/app/context/GlobalContext";
import AppContent from "@/app/AppContent";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
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
        </GlobalProvider>
      </body>
    </html>
  );
}
