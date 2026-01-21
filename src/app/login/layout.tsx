// src/app/login/layout.tsx
import React from 'react';
import '../globals.css';

export const metadata = {
  title: 'Login - Pawn Finance App',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, sans-serif',
          background: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
