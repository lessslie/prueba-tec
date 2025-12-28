import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthWatcher } from "./auth-watcher";
import { SessionExpiredModal } from "./session-expired-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeliInsights - Business Intelligence for Mercado Libre",
  description: "AI-powered analytics and insights for your Mercado Libre publications",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthWatcher />
        <SessionExpiredModal />
        {children}
      </body>
    </html>
  );
}
