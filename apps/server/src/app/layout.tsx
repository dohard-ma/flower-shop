import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/settings-context";
import { Toaster } from "@/components/ui/toaster";
import type React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "花涧里",
  description: "花涧里在线商城",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SettingsProvider>
            <TooltipProvider delayDuration={0}>
              {children}
              <Toaster />
            </TooltipProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
