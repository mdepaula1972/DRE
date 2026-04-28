import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { DataModeProvider } from "@/contexts/DataModeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mar Brasil | Dashboard",
  description: "Gestão Integrada Financeira e Operacional",
  icons: {
    icon: "/Favicon.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <DataModeProvider>{children}</DataModeProvider>
        
        {/* BrisinhAI Scripts (Global Widget) */}
        <Script src="/ai.service.v2.js" strategy="beforeInteractive" />
        <Script src="/brisinhai.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
