import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientRoot from "@/components/ClientRoot";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Episodic",
  description: "Suas séries e os próximos episódios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
