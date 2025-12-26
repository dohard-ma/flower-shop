import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "./globals.css";
import { Inter } from "next/font/google";
import { SettingsProvider } from "@/contexts/settings-context";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";
import type React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "千礼挑一",
  description: "千礼挑一后台管理",
  generator: "v0.dev",
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
      <head>
        <ColorSchemeScript />
      </head>
      <body className={inter.className}>
        <MantineProvider theme={theme}>
          <Notifications />
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
