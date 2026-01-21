// src/app/AppShell.tsx
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  // On the login page: do NOT show shell, just render the page
  if (isLoginPage) return <>{children}</>;

  const navBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'rgba(15,23,42,0.9)' : 'transparent',
    color: active ? '#e5e7eb' : '#9ca3af',
    fontSize: 14,
  });

  const navSectionTitle: React.CSSProperties = {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 11,
    color: '#6b7280',
    letterSpacing: 1,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        background: '#0b1120',
        color: '#e5e7eb',
      }}
    >
      {/* LEFT SIDEBAR */}
      <aside
        style={{
          background: '#020617',
          borderRight: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 16px',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#9ca3af',
            }}
          >
            Pawn Finance
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 4,
              color: '#f9fafb',
            }}
          >
            Control Panel
          </div>

          {/* Debug marker */}
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            AppShell v5 – Ledger added
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              ...navBtn(pathname === '/'),
              background: pathname === '/' ? 'rgba(79,70,229,0.2)' : 'transparent',
            }}
          >
            Dashboard / Home
          </button>

          <button
            type="button"
            onClick={() => router.push('/customers/new')}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: pathname.startsWith('/customers/new') ? '#4f46e5' : 'rgba(15,23,42,1)',
              color: '#f9fafb',
              fontSize: 14,
              marginTop: 8,
            }}
          >
            + New Customer
          </button>

          <button
            type="button"
            onClick={() => router.push('/customers/search')}
            style={navBtn(pathname.startsWith('/customers/search'))}
          >
            Search Existing Customer
          </button>

          {/* ✅ Deposits module */}
          <div style={navSectionTitle}>COMPANY DEPOSITS</div>

          <button
            type="button"
            onClick={() => router.push('/deposits')}
            style={navBtn(pathname === '/deposits' || pathname.startsWith('/deposits/'))}
          >
            Deposits
          </button>

          <button
            type="button"
            onClick={() => router.push('/deposits/new')}
            style={{
              ...navBtn(pathname.startsWith('/deposits/new')),
              background: pathname.startsWith('/deposits/new') ? 'rgba(16,185,129,0.18)' : 'transparent',
              color: pathname.startsWith('/deposits/new') ? '#d1fae5' : '#9ca3af',
            }}
          >
            + New Deposit
          </button>

          {/* ✅ Ledger module */}
          <div style={navSectionTitle}>COMPANY LEDGER</div>

          <button
            type="button"
            onClick={() => router.push('/ledger')}
            style={{
              ...navBtn(pathname.startsWith('/ledger')),
              background: pathname.startsWith('/ledger') ? 'rgba(245,158,11,0.18)' : 'transparent',
              color: pathname.startsWith('/ledger') ? '#fef3c7' : '#9ca3af',
            }}
          >
            Ledger
          </button>

          {/* ✅ Interest Schemes */}
          <div style={{ marginTop: 12 }} />
          <button
            type="button"
            onClick={() => router.push('/schemes')}
            style={navBtn(pathname.startsWith('/schemes'))}
          >
            Interest Schemes
          </button>
        </nav>

        <div style={{ marginTop: 'auto', fontSize: 12, color: '#6b7280' }}>
          Logged in as <span style={{ color: '#e5e7eb' }}>Admin</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          background: '#f9fafb',
          color: '#111827',
          padding: '18px 20px 32px',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
