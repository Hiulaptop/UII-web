import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

// Substitute for PolySans (see DESIGN.md): weight 400 only
const polysans = Inter_Tight({
  variable: "--font-polysans",
  subsets: ["latin", "vietnamese"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "UII",
  description: "Giám sát và cảnh báo sớm cho người có nguy cơ động kinh",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} ${polysans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas-white text-graphite">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
