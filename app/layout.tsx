import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { ThemeBoot } from "@/components/ThemeBoot";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Hoot — Curiosity for kids",
  description: "A voice-first curiosity companion for kids. Ask Hoot anything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="sky" suppressHydrationWarning>
      <body className={`${fredoka.variable} ${nunito.variable}`}>
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}
