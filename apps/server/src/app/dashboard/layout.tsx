import '../globals.css';
import { ClientLayout } from '@/components/client-layout';
import type React from 'react';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
