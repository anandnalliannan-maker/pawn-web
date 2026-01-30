// src/app/AppShell.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, clearToken, clearCompanyId, getCompanyId, getCompanyName } from '@/lib/api';

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isCompanyPage = pathname === '/company';

  // ✅ allow search without company selected (ALL companies view)
  const isSearchAllCompaniesPage = pathname.startsWith('/customers/search');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // allow login page always
    if (isLoginPage) return;

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    // If logged in, require company selection for most pages
    if (!isCompanyPage && !isSearchAllCompaniesPage) {
      const companyId = getCompanyId();
      if (!companyId) {
        router.replace('/company');
        return;
      }
    }
  }, [mounted, isLoginPage, isCompanyPage, isSearchAllCompaniesPage, router]);

  if (!mounted) return null;
  if (isLoginPage) return <>{children}</>;

  const companyId = getCompanyId();
  const companyName = getCompanyName();
  const showSidebar = Boolean(companyId);

  if (!showSidebar) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f9fafb',
          color: '#111827',
          padding: '18px 20px 32px',
        }}
      >
        {children}
      </div>
    );
  }

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

  const doLogout = () => {
    clearToken();
    clearCompanyId();
    router.push('/login');
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
      {companyId && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: '#111827',
            color: '#f9fafb',
            border: '1px solid #1f2937',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          Company: {companyName || companyId}
        </div>
      )}
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
          <div style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af' }}>
            Pawn Finance
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#f9fafb' }}>Control Panel</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>AppShell v8 – Auth + Company Required</div>
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

          <div style={navSectionTitle}>COMPANY</div>
          <button
            type="button"
            onClick={() => router.push('/company')}
            style={{
              ...navBtn(pathname.startsWith('/company')),
              background: pathname.startsWith('/company') ? 'rgba(56,189,248,0.16)' : 'transparent',
              color: pathname.startsWith('/company') ? '#cffafe' : '#9ca3af',
            }}
          >
            Switch / Select Company
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
            Search Existing Customer (All Companies)
          </button>

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

          <button
            type="button"
            onClick={() => router.push('/vouchers')}
            style={{
              ...navBtn(pathname.startsWith('/vouchers')),
              background: pathname.startsWith('/vouchers') ? 'rgba(239,68,68,0.18)' : 'transparent',
              color: pathname.startsWith('/vouchers') ? '#fecaca' : '#9ca3af',
            }}
          >
            Vouchers (Expenses)
          </button>

          <div style={{ marginTop: 12 }} />
          <button type="button" onClick={() => router.push('/schemes')} style={navBtn(pathname.startsWith('/schemes'))}>
            Interest Schemes
          </button>

          <div style={navSectionTitle}>LOANS</div>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Logged in as <span style={{ color: '#e5e7eb' }}>Admin</span>
          </div>

          <button
            type="button"
            onClick={doLogout}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #334155',
              background: 'rgba(148,163,184,0.08)',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </aside>

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
