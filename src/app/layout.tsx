import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import TelegramInit from "@/components/TelegramInit";
import NavBar from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "certified loverboy",
  description: "Идеи свиданий на двоих",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramInit />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <NavBar />
      </body>
    </html>
  );
}
