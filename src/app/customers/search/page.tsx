// src/app/customers/search/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

// Match backend enum values (DOCUMENT / GOLD / SILVER)
type LoanType = 'DOCUMENT' | 'GOLD' | 'SILVER' | 'Document' | 'Gold' | 'Silver';

// This type supports BOTH:
// 1) Old nested shape { customer: {...}, loan: {...} }
// 2) New flat shape from /customers (name, phone, loanAmount, loanType on root)
type CustomerRecord = {
  accNo: string;
  date: string | Date;

  // flat fields (new API)
  name?: string;
  phone?: string | null;
  loanType?: LoanType;
  loanAmount?: number | null;

  // nested fields (old DTO)
  customer?: {
    name?: string;
    address?: string;
    relative?: string;
    area?: string;
    phone?: string;
    phone2?: string;
    aadhar?: string;
    dob?: string;
  };
  loan?: {
    company?: string;
    scheme?: string;
    loanType?: LoanType;
    loanAmount?: number;
    monthlyPct?: number;
    yearlyPct?: number;
    monthlyInterestAmount?: number;
    remarks?: string;
  };
};

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '18px 16px 26px',
};

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  padding: 16,
  marginBottom: 16,
};

const labelCss: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
};

const inputCss: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 999,
  border: '1px solid #d1d5db',
  padding: '0 14px',
  fontSize: 14,
};

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '-';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN');
}

// Helpers to gracefully handle both shapes
function getName(c: CustomerRecord): string {
  return (c.customer?.name ?? c.name ?? '').trim();
}

function getPhone(c: CustomerRecord): string {
  return (c.customer?.phone ?? c.phone ?? '').trim();
}

function getLoanType(c: CustomerRecord): string {
  const raw = c.loan?.loanType ?? c.loanType ?? '';
  if (!raw) return '-';
  const upper = String(raw).toUpperCase();
  if (upper === 'DOCUMENT') return 'Document';
  if (upper === 'GOLD') return 'Gold';
  if (upper === 'SILVER') return 'Silver';
  return String(raw);
}

function getLoanAmount(c: CustomerRecord): number {
  const nested = c.loan?.loanAmount;
  const flat = c.loanAmount;
  if (typeof nested === 'number') return nested;
  if (typeof flat === 'number') return flat;
  return 0;
}

export default function SearchExistingCustomerPage() {
  const router = useRouter();

  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [accNo, setAccNo] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [filterVersion, setFilterVersion] = useState(0); // just to trigger recompute

  // Load data from /api/customers (which proxies to pawn-api /customers)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch<CustomerRecord[]>('customers');
        if (!cancelled) {
          setAllCustomers(Array.isArray(data) ? data : []);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            (e as { message?: string })?.message ??
            'Failed to load customers.';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered list in memory
  const filtered = useMemo(() => {
    const acc = accNo.trim().toLowerCase();
    const nm = name.trim().toLowerCase();
    const ph = phone.trim().toLowerCase();

    return allCustomers.filter((c) => {
      const cName = getName(c).toLowerCase();
      const cPhone = getPhone(c).toLowerCase();

      if (acc && !c.accNo.toLowerCase().includes(acc)) return false;
      if (nm && !cName.includes(nm)) return false;
      if (ph && !cPhone.includes(ph)) return false;
      return true;
    });
  }, [allCustomers, accNo, name, phone, filterVersion]);

  const handleClear = () => {
    setAccNo('');
    setName('');
    setPhone('');
    setFilterVersion((v) => v + 1);
  };

  const handleSearchClick = () => {
    setFilterVersion((v) => v + 1);
  };

  const handleRowClick = (row: CustomerRecord) => {
    router.push(`/customers/${encodeURIComponent(row.accNo)}`);
  };

  return (
    <main style={pageWrap}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '4px 0 14px',
        }}
      >
        Search Existing Customer
      </h1>

      {/* Filter Panel */}
      <section style={card}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
            marginBottom: 14,
          }}
        >
          <label>
            <div style={labelCss}>Acc. No</div>
            <input
              style={inputCss}
              value={accNo}
              onChange={(e) => setAccNo(e.target.value)}
              placeholder="e.g. 2025-2026/105"
            />
          </label>

          <label>
            <div style={labelCss}>Customer Name</div>
            <input
              style={inputCss}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anand"
            />
          </label>

          <label>
            <div style={labelCss}>Phone</div>
            <input
              style={inputCss}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98765..."
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={handleSearchClick}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              background: '#111827',
              color: '#f9fafb',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Search
          </button>
        </div>
      </section>

      {/* Results */}
      <section style={card}>
        {loading && <div style={{ fontSize: 14 }}>Loading customers…</div>}
        {error && !loading && (
          <div style={{ fontSize: 14, color: '#b91c1c' }}>{error}</div>
        )}

        {!loading && !error && (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              Showing {filtered.length} of {allCustomers.length} record(s)
            </div>

            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                No customers found for the given criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Acc. No
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Phone
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Loan Type
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Loan Amount
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 8,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={row.accNo}
                        onClick={() => handleRowClick(row)}
                        style={{
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            'transparent';
                        }}
                      >
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {row.accNo}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {getName(row)}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {getPhone(row) || '-'}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {getLoanType(row)}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                            textAlign: 'right',
                          }}
                        >
                          ₹ {fmtCurrency(getLoanAmount(row))}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {fmtDate(row.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}