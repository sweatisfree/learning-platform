import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { NavBar } from "@/components/layout/NavBar";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["700"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Thríamvos",
  description: "Privacy-first, on-device training readiness and recovery.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <SupabaseProvider>
          <NavBar />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
