import { Exo_2 } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo-2",
});

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
        className={`${exo2.variable} antialiased bg-gray-50`} style={{ fontFamily: exo2.style.fontFamily }}
      >
        <Sidebar />
        <Header />
        <main className="ml-0 md:ml-64 mt-16 overflow-y-auto h-[calc(100vh-4rem)] mb-16 md:mb-0 p-4 md:p-6 transition-all duration-200">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
