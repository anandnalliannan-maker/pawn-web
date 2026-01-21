// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import AppShell from './AppShell';

export const metadata: Metadata = {
  title: 'Pawn Finance – Web',
  description: 'Pawn Finance web app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
