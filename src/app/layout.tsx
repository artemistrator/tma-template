import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TelegramProvider } from "@/lib/telegram/telegram-provider";
import { AppConfigProvider } from '@/context/app-config-context';

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
  title: "TMA Template",
  description: "Telegram Mini App Template",
  manifest: "/manifest.json",
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppConfigProvider defaultTenantSlug="pizza">
          <TelegramProvider>
            {children}
          </TelegramProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}
