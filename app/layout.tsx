import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./Sidebar";

import AuthProvider from "./components/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Super Agente",
  description: "TV Sertão Livre",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex text-foreground bg-background`}>
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}