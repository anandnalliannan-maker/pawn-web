import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Pawn Finance – Web</h1>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Admin</span>
      </header>

      <p style={{ marginBottom: 16 }}>
        Welcome. Use the options below to start working with customers.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link
          href="/customers/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 999,
            background: '#111827',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          New Customer
        </Link>

        <Link
          href="/customers/search"
          style={{
            fontSize: 14,
            textDecoration: 'underline',
            color: '#4b5563',
          }}
        >
          Search Existing Customer
        </Link>
      </div>
    </div>
  );
}
