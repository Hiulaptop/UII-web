import type { Metadata } from "next";
import { Barlow_Condensed, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Type system from DESIGN.md v2 (Ridgeline layout)
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Seize Guard",
  description: "Ứng dụng Wear OS hỏi bạn có ổn không khi nghi bạn ngã, rồi gửi cảnh báo và vị trí cho người thân. Đang beta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${barlow.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas-white text-graphite">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
