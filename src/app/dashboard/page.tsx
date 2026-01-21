'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Pawn Finance – Web</h1>
      <p style={{ marginBottom: 16 }}>
        Use the link below to register a new customer.
      </p>

      <Link
        href="/customers/new"
        style={{
          display: 'inline-block',
          background: '#111827',
          color: '#fff',
          padding: '10px 14px',
          borderRadius: 8,
          textDecoration: 'none'
        }}
      >
        ➕ New Customer
      </Link>
    </main>
  );
}
