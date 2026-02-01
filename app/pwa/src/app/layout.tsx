import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Betting Agent",
  description: "Automated betting with AI-powered analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${exo2.variable} antialiased bg-gray-50`} style={{fontFamily: exo2.style.fontFamily}}
      >
        <Sidebar />
        <Header />
        <main className="ml-64 mt-16 overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
