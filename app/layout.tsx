import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
// removed next/font/google Geist import (not available); use local fonts below
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

// const geist removed — using local fonts from ./fonts instead

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Live Countdown Timer",
  description: "A live countdown timer with customizable styles, built with Next.js and Supabase.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
