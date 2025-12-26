import '../globals.css';
import { AdminLayout } from '@/components/AdminLayout';
import type React from 'react';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
