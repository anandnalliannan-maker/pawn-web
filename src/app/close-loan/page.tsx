'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type LoanStatus = 'ACTIVE' | 'CLOSED';

type CustomerRecord = {
  accNo: string;
  date: string;
  customer: {
    name: string;
    phone?: string | null;
  };
  loan?: {
    loanAmount: number;
    monthlyInterestAmount: number;
    pendingInterest?: number;
    advanceInterest?: number;
  };
  status?: LoanStatus;
  closedAt?: string | null;
  closedBy?: string | null;
  closeNote?: string | null;
};

type SearchRow = {
  accNo: string;
  name?: string;
  phone?: string | null;
  customer?: { name?: string; phone?: string };
};

const wrap: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h1: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '0 0 12px' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 };
const value: React.CSSProperties = { fontSize: 14, color: '#111827' };
const input: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 10,
  border: '1px solid #d1d5db',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
};
const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 999,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  fontSize: 13,
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtCurrency(v: number | null | undefined): string {
  if (!Number.isFinite(Number(v))) return '-';
  return Math.trunc(Number(v || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function CloseLoanPage() {
  const [qName, setQName] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);

  const [accNo, setAccNo] = useState('');
  const [date, setDate] = useState(todayIso());
  const [confirmPrincipal, setConfirmPrincipal] = useState(false);
  const [confirmInterest, setConfirmInterest] = useState(false);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [record, setRecord] = useState<CustomerRecord | null>(null);

  const canSubmit = useMemo(
    () => accNo.trim() && confirmPrincipal && confirmInterest && !saving,
    [accNo, confirmPrincipal, confirmInterest, saving],
  );

  const getName = (r: SearchRow) => (r.customer?.name ?? r.name ?? '').trim();
  const getPhone = (r: SearchRow) => (r.customer?.phone ?? r.phone ?? '').trim();

  const searchCustomers = async () => {
    setSearchErr('');
    setResults([]);
    const name = qName.trim();
    const phone = qPhone.trim();
    if (!name && !phone) {
      setSearchErr('Enter name or phone to search.');
      return;
    }
    setSearchLoading(true);
    try {
      const qs = new URLSearchParams();
      if (name) qs.set('name', name);
      if (phone) qs.set('phone', phone);
      const data = await apiFetch<SearchRow[]>(`customers?${qs.toString()}`);
      setResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setSearchErr(e?.message || 'Failed to search customers');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadCustomer = async () => {
    setError('');
    setOk('');
    const a = accNo.trim();
    if (!a) return setError('Acc. No is required');
    setLoading(true);
    try {
      const data = await apiFetch<CustomerRecord>(`customers/${encodeURIComponent(a)}`);
      setRecord(data);
    } catch (e: any) {
      setRecord(null);
      setError(e?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecord(null);
  }, [accNo]);

  const closeLoan = async () => {
    setError('');
    setOk('');
    const a = accNo.trim();
    if (!a) return setError('Acc. No is required');
    if (!confirmPrincipal || !confirmInterest) {
      return setError('Please confirm both principal and interest are fully paid.');
    }
    setSaving(true);
    try {
      await apiFetch(`customers/${encodeURIComponent(a)}/close`, {
        method: 'POST',
        body: JSON.stringify({
          date,
          confirmPrincipalPaid: true,
          confirmInterestPaid: true,
          note: note.trim() ? note.trim() : null,
        }),
      });
      setOk('Loan closed successfully.');
      await loadCustomer();
    } catch (e: any) {
      setError(e?.message || 'Failed to close loan');
    } finally {
      setSaving(false);
    }
  };

  const status = record?.status || 'ACTIVE';
  const isClosed = status === 'CLOSED';

  return (
    <main style={wrap}>
      <h1 style={h1}>Close Loan</h1>

      <section style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Search by name or phone</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
          <input
            style={input}
            placeholder="Customer name"
            value={qName}
            onChange={(e) => setQName(e.target.value)}
          />
          <input
            style={input}
            placeholder="Phone"
            value={qPhone}
            onChange={(e) => setQPhone(e.target.value)}
          />
          <button type="button" style={btn} onClick={searchCustomers} disabled={searchLoading}>
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchErr && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>{searchErr}</div>}

        {results.length > 0 && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Acc. No</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Phone</th>
                  <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Select</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.accNo}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontWeight: 700 }}>{r.accNo}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{getName(r) || '-'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{getPhone(r) || '-'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                      <button
                        type="button"
                        style={{ ...btn, padding: '6px 12px' }}
                        onClick={() => {
                          setAccNo(r.accNo);
                          void loadCustomer();
                        }}
                      >
                        Use
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: 10 }}>
          <input
            style={input}
            placeholder="Enter Acc. No"
            value={accNo}
            onChange={(e) => setAccNo(e.target.value)}
          />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          <button type="button" style={btn} onClick={loadCustomer} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {record && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={label}>Customer</div>
                <div style={value}>{record.customer?.name || '-'}</div>
              </div>
              <div>
                <div style={label}>Phone</div>
                <div style={value}>{record.customer?.phone || '-'}</div>
              </div>
              <div>
                <div style={label}>Outstanding principal</div>
                <div style={value}>₹ {fmtCurrency(record.loan?.loanAmount)}</div>
              </div>
              <div>
                <div style={label}>Pending interest</div>
                <div style={value}>₹ {fmtCurrency(record.loan?.pendingInterest)}</div>
              </div>
              <div>
                <div style={label}>Status</div>
                <div style={value}>{record.status || 'ACTIVE'}</div>
              </div>
              <div>
                <div style={label}>Closed at</div>
                <div style={value}>{record.closedAt || '-'}</div>
              </div>
            </div>

            {record.closeNote ? (
              <div style={{ marginTop: 8 }}>
                <div style={label}>Close note</div>
                <div style={value}>{record.closeNote}</div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section style={card}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
          Confirm full principal and pending interest are paid before closing the loan.
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={confirmPrincipal}
            onChange={(e) => setConfirmPrincipal(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>I confirm full principal is paid.</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={confirmInterest}
            onChange={(e) => setConfirmInterest(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>I confirm all pending interest is paid.</span>
        </label>

        <div style={{ marginTop: 8 }}>
          <div style={label}>Note (optional)</div>
          <input style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / remarks" />
        </div>

        {error && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        {ok && <div style={{ marginTop: 10, color: '#166534', fontSize: 13 }}>{ok}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" style={btn} onClick={closeLoan} disabled={!canSubmit || isClosed}>
            {saving ? 'Closing...' : isClosed ? 'Loan Already Closed' : 'Close Loan'}
          </button>
        </div>
      </section>
    </main>
  );
}
