'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type LedgerDirection = 'DEBIT' | 'CREDIT';
type LedgerCategory = 'LOAN' | 'INTEREST' | 'PRINCIPAL' | 'DEPOSIT' | 'EXPENSE' | 'INCOME' | 'OTHER';

type VoucherRow = {
  id: string;
  voucherDate: string;
  direction: LedgerDirection;
  amount: number;
  category: LedgerCategory;
  refNo?: string | null;
  note?: string | null;
  createdAt?: string;
};

const wrap: React.CSSProperties = { maxWidth: 980, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h1: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '0 0 12px' };
const input: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 10,
  border: '1px solid #d1d5db',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
};
const btnDark: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 999,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 13,
};
const btnLight: React.CSSProperties = {
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  borderRadius: 999,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtCurrency(v: number): string {
  const n = Math.trunc(Number(v || 0));
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string): string {
  if (!d) return '-';
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) {
    const [y, m, dd] = d.split('-');
    return `${dd}-${m}-${y}`;
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export default function VouchersPage() {
  // filters
  const [from, setFrom] = useState<string>(() => {
    const t = new Date();
    t.setDate(t.getDate() - 30);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [to, setTo] = useState<string>(todayIso());
  const [q, setQ] = useState<string>('');

  // data
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // create voucher
  const [vDate, setVDate] = useState<string>(todayIso());
  const [amount, setAmount] = useState<string>('');
  const [refNo, setRefNo] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (q.trim()) p.set('q', q.trim());
    return p.toString();
  }, [from, to, q]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const path = queryString ? `vouchers?${queryString}` : 'vouchers';
      const data = await apiFetch<VoucherRow[]>(path);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load vouchers');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOut = useMemo(() => rows.reduce((sum, r) => sum + Math.trunc(Number(r.amount || 0)), 0), [rows]);

  const saveVoucher = async () => {
    setFormErr('');
    setOkMsg('');
    const amt = Math.max(0, Math.trunc(Number(amount) || 0));
    if (!vDate) return setFormErr('Date is required.');
    if (!amt) return setFormErr('Amount is required.');

    setSaving(true);
    try {
      await apiFetch('vouchers', {
        method: 'POST',
        body: JSON.stringify({
          date: vDate,
          amount: amt,
          refNo: refNo.trim() ? refNo.trim() : null,
          note: note.trim() ? note.trim() : null,
        }),
      });

      setAmount('');
      setRefNo('');
      setNote('');
      setOkMsg('Voucher saved. Ledger updated.');
      await load();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to save voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={wrap}>
      <h1 style={h1}>Vouchers (Expenses)</h1>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
          Use vouchers to record company expenses. Each voucher automatically creates a ledger entry (DEBIT / EXPENSE).
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Date</div>
            <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} style={input} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              style={input}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Ref No (optional)</div>
            <input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Bill/UPI/Invoice" style={input} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Note (optional)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or description" style={input} />
        </div>

        {formErr && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#fef2f2', color: '#b91c1c' }}>
            {formErr}
          </div>
        )}
        {okMsg && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#ecfdf3', color: '#166534' }}>
            {okMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
          <button type="button" style={btnLight} onClick={() => setAmount('')} disabled={saving}>
            Clear Amount
          </button>
          <button type="button" style={btnDark} onClick={saveVoucher} disabled={saving}>
            {saving ? 'Saving...' : 'Save Voucher'}
          </button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto', gap: 10 }}>
          <input
            style={input}
            placeholder="Search by note/ref..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={input} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={input} />
          <button type="button" style={btnDark} onClick={load}>
            Search
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Total Expenses (filtered): <strong style={{ color: '#111827' }}>Rs {fmtCurrency(totalOut)}</strong>
        </div>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#6b7280' }}>Loading...</div>}
      {error && !loading && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Ref</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e5e7eb' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 14, color: '#6b7280' }}>
                    No vouchers found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{fmtDate(r.voucherDate)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 800 }}>
                      Rs {fmtCurrency(r.amount)}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{r.refNo || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6' }}>{r.note || '-'}</td>
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
