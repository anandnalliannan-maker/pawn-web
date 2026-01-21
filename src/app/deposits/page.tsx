'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DepositStatus = 'ACTIVE' | 'CLOSED';

type DepositListRow = {
  id: string;
  financierName: string;
  phone?: string | null;
  referenceNo?: string | null;
  startDate: string; // YYYY-MM-DD or ISO
  status: DepositStatus;
  originalAmount: number;
  outstanding: number;
  monthlyInterest?: number | null;
  pendingInterest?: number | null;
};

const wrap: React.CSSProperties = { maxWidth: 980, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h1: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '0 0 12px' };
const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 999,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 13,
};
const input: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 10,
  border: '1px solid #d1d5db',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
};

function n(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function fmtCurrency(v: number): string {
  if (!Number.isFinite(v)) return '-';
  return Math.trunc(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtDate(ymd: string): string {
  if (!ymd) return '-';
  if (/^\d{4}-\d{2}-\d{2}/.test(ymd)) {
    const [y, m, d] = ymd.slice(0, 10).split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export default function DepositsListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<DepositListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [qName, setQName] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [qStatus, setQStatus] = useState<'' | DepositStatus>('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (qName.trim()) qs.set('name', qName.trim());
      if (qPhone.trim()) qs.set('phone', qPhone.trim());
      if (qStatus) qs.set('status', qStatus);

      const path = qs.toString() ? `deposits?${qs.toString()}` : 'deposits';
      const data = await apiFetch<DepositListRow[]>(path);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load deposits');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOutstanding = useMemo(() => rows.reduce((sum, r) => sum + n(r.outstanding), 0), [rows]);

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1 style={h1}>Deposits</h1>
        <button type="button" style={btn} onClick={() => router.push('/deposits/new')}>
          + New Deposit
        </button>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr auto', gap: 10 }}>
          <input
            style={input}
            placeholder="Search financier name…"
            value={qName}
            onChange={(e) => setQName(e.target.value)}
          />
          <input style={input} placeholder="Search phone…" value={qPhone} onChange={(e) => setQPhone(e.target.value)} />
          <select style={input} value={qStatus} onChange={(e) => setQStatus(e.target.value as any)}>
            <option value="">All status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <button type="button" style={btn} onClick={load}>
            Search
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Total Outstanding (filtered): <strong style={{ color: '#111827' }}>₹ {fmtCurrency(totalOutstanding)}</strong>
        </div>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#6b7280' }}>Loading…</div>}
      {error && !loading && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Financier</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Phone</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Ref</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Start</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Original</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Outstanding</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Pending Int</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: '#6b7280' }}>
                    No deposits found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/deposits/${encodeURIComponent(r.id)}`)}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', fontWeight: 700 }}>{r.financierName}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{r.phone || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{r.referenceNo || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{fmtDate(r.startDate)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{r.status}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                      ₹ {fmtCurrency(n(r.originalAmount))}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 800 }}>
                      ₹ {fmtCurrency(n(r.outstanding))}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                      ₹ {fmtCurrency(n(r.pendingInterest ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
