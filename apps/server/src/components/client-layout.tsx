"use client";

import {
  SidebarProvider,
  Sidebar,
  useSidebarContext,
} from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import type React from "react";

function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarContext();

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${isCollapsed ? "lg:ml-[72px]" : "lg:ml-72"
        }`}
    >
      <TopNav />
      <div className="w-full px-6 py-6">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
