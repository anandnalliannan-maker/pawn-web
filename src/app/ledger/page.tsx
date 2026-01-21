// src/app/ledger/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type LedgerDirection = 'DEBIT' | 'CREDIT';
type LedgerSource = 'CUSTOMER_LOAN' | 'CUSTOMER_PAYMENT' | 'DEPOSIT_RECEIVE' | 'DEPOSIT_PAYMENT' | 'MANUAL';

type LedgerCategory = 'LOAN' | 'INTEREST' | 'PRINCIPAL' | 'DEPOSIT' | 'EXPENSE' | 'INCOME' | 'OTHER';

type LedgerRow = {
  id: string;
  entryDate: string; // ISO
  direction: LedgerDirection;
  amount: number;
  source: LedgerSource;
  category: LedgerCategory;

  customerAccNo?: string | null;
  depositId?: string | null;
  paymentId?: string | null;

  refNo?: string | null;
  note?: string | null;

  createdAt?: string;
};

const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 16,
  marginBottom: 14,
};
const h1: React.CSSProperties = { fontSize: 22, fontWeight: 800, margin: '6px 0 14px' };
const sub: React.CSSProperties = { fontSize: 12, color: '#6b7280', marginBottom: 10 };

const input: React.CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: '1px solid #d1d5db',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
  width: '100%',
};

const btnDark: React.CSSProperties = {
  border: 'none',
  background: '#111827',
  color: '#fff',
  borderRadius: 999,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 700,
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
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

/** ✅ FIX: avoid JSX namespace type */
function pill(text: string, bg: string, fg: string): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function sourceLabel(s: LedgerSource): string {
  switch (s) {
    case 'CUSTOMER_LOAN':
      return 'Customer Loan (Disbursed)';
    case 'CUSTOMER_PAYMENT':
      return 'Customer Payment';
    case 'DEPOSIT_RECEIVE':
      return 'Deposit Received';
    case 'DEPOSIT_PAYMENT':
      return 'Deposit Paid';
    case 'MANUAL':
      return 'Manual';
    default:
      return s;
  }
}

function categoryLabel(c: LedgerCategory): string {
  switch (c) {
    case 'LOAN':
      return 'Loan';
    case 'INTEREST':
      return 'Interest';
    case 'PRINCIPAL':
      return 'Principal';
    case 'DEPOSIT':
      return 'Deposit';
    case 'EXPENSE':
      return 'Expense';
    case 'INCOME':
      return 'Income';
    case 'OTHER':
      return 'Other';
    default:
      return c;
  }
}

function dirLabel(d: LedgerDirection): string {
  return d === 'CREDIT' ? 'IN' : 'OUT';
}

function dirPill(d: LedgerDirection) {
  return d === 'CREDIT'
    ? pill('IN (CREDIT)', 'rgba(16,185,129,0.14)', '#047857')
    : pill('OUT (DEBIT)', 'rgba(239,68,68,0.12)', '#b91c1c');
}

export default function LedgerPage() {
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
  const [source, setSource] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [q, setQ] = useState<string>('');

  // data
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // manual entry modal
  const [showManual, setShowManual] = useState(false);
  const [mDate, setMDate] = useState<string>(todayIso());
  const [mDirection, setMDirection] = useState<LedgerDirection>('DEBIT');
  const [mCategory, setMCategory] = useState<LedgerCategory>('EXPENSE');
  const [mAmount, setMAmount] = useState<string>('');
  const [mRef, setMRef] = useState<string>('');
  const [mNote, setMNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [mErr, setMErr] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (source) p.set('source', source);
    if (category) p.set('category', category);
    if (direction) p.set('direction', direction);
    if (q.trim()) p.set('q', q.trim());
    return p.toString();
  }, [from, to, source, category, direction, q]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<LedgerRow[]>(`ledger?${queryString}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load ledger.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    for (const r of rows) {
      const amt = Math.trunc(Number(r.amount || 0));
      if (r.direction === 'CREDIT') credit += amt;
      else debit += amt;
    }
    return { credit, debit, net: credit - debit };
  }, [rows]);

  /** ✅ FIX: groupedTotals is now USED (Totals by Category section) */
  const groupedTotals = useMemo(() => {
    const map: Record<string, { credit: number; debit: number }> = {};
    for (const r of rows) {
      const key = r.category || 'OTHER';
      if (!map[key]) map[key] = { credit: 0, debit: 0 };
      const amt = Math.trunc(Number(r.amount || 0));
      if (r.direction === 'CREDIT') map[key].credit += amt;
      else map[key].debit += amt;
    }
    return map;
  }, [rows]);

  const openManual = () => {
    setMErr('');
    setMDate(todayIso());
    setMDirection('DEBIT');
    setMCategory('EXPENSE');
    setMAmount('');
    setMRef('');
    setMNote('');
    setShowManual(true);
  };

  const saveManual = async () => {
    setMErr('');
    const amt = Math.max(0, Math.trunc(Number(mAmount) || 0));
    if (!mDate) return setMErr('Date is required.');
    if (!amt) return setMErr('Amount is required.');
    setSaving(true);
    try {
      await apiFetch(`ledger/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: mDate,
          direction: mDirection,
          category: mCategory,
          amount: amt,
          refNo: mRef.trim() ? mRef.trim() : null,
          note: mNote.trim() ? mNote.trim() : null,
        }),
      });
      setShowManual(false);
      await load();
    } catch (e: any) {
      setMErr(e?.message || 'Failed to save manual entry.');
    } finally {
      setSaving(false);
    }
  };

  const categoryRows = useMemo(() => {
    const order: LedgerCategory[] = ['LOAN', 'PRINCIPAL', 'INTEREST', 'DEPOSIT', 'INCOME', 'EXPENSE', 'OTHER'];
    const keys = Object.keys(groupedTotals) as LedgerCategory[];
    keys.sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return keys.map((k) => {
      const c = groupedTotals[k]?.credit ?? 0;
      const d = groupedTotals[k]?.debit ?? 0;
      return { category: k, credit: c, debit: d, net: c - d };
    });
  }, [groupedTotals]);

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h1 style={h1}>Ledger</h1>
          <div style={sub}>
            Auto entries come from Loans / Payments / Deposits. Manual entry is only for miscellaneous company income/expense.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" style={btnLight} onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" style={btnDark} onClick={openManual}>
            + Manual Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <section style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>From</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={input} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>To</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={input} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Source</div>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
              <option value="">All</option>
              <option value="CUSTOMER_LOAN">Customer Loan</option>
              <option value="CUSTOMER_PAYMENT">Customer Payment</option>
              <option value="DEPOSIT_RECEIVE">Deposit Receive</option>
              <option value="DEPOSIT_PAYMENT">Deposit Payment</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
              <option value="">All</option>
              <option value="LOAN">Loan</option>
              <option value="INTEREST">Interest</option>
              <option value="PRINCIPAL">Principal</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px 240px', gap: 12, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Search (note/ref/accno)</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type and click Apply" style={input} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Direction</div>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} style={input}>
              <option value="">All</option>
              <option value="CREDIT">IN (Credit)</option>
              <option value="DEBIT">OUT (Debit)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
            <button type="button" style={{ ...btnDark, width: '100%' }} onClick={load} disabled={loading}>
              Apply Filters
            </button>
            <button
              type="button"
              style={{ ...btnLight, width: '100%' }}
              onClick={() => {
                setSource('');
                setCategory('');
                setDirection('');
                setQ('');
              }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: '#fef2f2', color: '#b91c1c' }}>
            {err}
          </div>
        )}
      </section>

      {/* Totals */}
      <section style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Total IN (Credit)</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>₹ {fmtCurrency(totals.credit)}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Total OUT (Debit)</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>₹ {fmtCurrency(totals.debit)}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Net (IN - OUT)</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>₹ {fmtCurrency(totals.net)}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          Tip: Because we split interest/principal into separate rows, your reports will stay clean.
        </div>
      </section>

      {/* Totals by Category (uses groupedTotals) */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>Totals by Category</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>IN / OUT / NET</div>
        </div>

        {categoryRows.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No totals available.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e5e7eb' }}>IN</th>
                  <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e5e7eb' }}>OUT</th>
                  <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e5e7eb' }}>NET</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((r) => (
                  <tr key={r.category}>
                    <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                      {pill(categoryLabel(r.category as LedgerCategory), 'rgba(99,102,241,0.12)', '#3730a3')}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 800 }}>
                      ₹ {fmtCurrency(r.credit)}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 800 }}>
                      ₹ {fmtCurrency(r.debit)}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 900 }}>
                      ₹ {fmtCurrency(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Table */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Entries</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Showing up to last 1000 rows from backend</div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No ledger rows found for selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Direction</th>
                  <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Source</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>AccNo / Ref</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const accOrRef =
                    r.customerAccNo || r.refNo || (r.depositId ? `Deposit#${r.depositId.slice(0, 6)}` : '');
                  return (
                    <tr key={r.id}>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.entryDate)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                        {dirPill(r.direction)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 900 }}>
                        ₹ {fmtCurrency(r.amount)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>{sourceLabel(r.source)}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        {pill(categoryLabel(r.category), 'rgba(99,102,241,0.12)', '#3730a3')}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', maxWidth: 220 }}>
                        <div style={{ fontWeight: 700 }}>{accOrRef || '-'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {r.source !== 'MANUAL' ? `${dirLabel(r.direction)} • ${r.source}` : 'Manual'}
                        </div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6', maxWidth: 360 }}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{r.note || ''}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual entry modal */}
      {showManual && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.3)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Manual Ledger Entry</div>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Date</div>
                <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={input} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Direction</div>
                <select value={mDirection} onChange={(e) => setMDirection(e.target.value as LedgerDirection)} style={input}>
                  <option value="DEBIT">OUT (Debit)</option>
                  <option value="CREDIT">IN (Credit)</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Category</div>
                <select value={mCategory} onChange={(e) => setMCategory(e.target.value as LedgerCategory)} style={input}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="OTHER">Other</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="INTEREST">Interest</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="LOAN">Loan</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Amount</div>
                <input
                  type="number"
                  value={mAmount}
                  onChange={(e) => setMAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={input}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Ref No (optional)</div>
              <input
                value={mRef}
                onChange={(e) => setMRef(e.target.value)}
                placeholder="Bill no / UPI ref / etc"
                style={input}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 6 }}>Note (optional)</div>
              <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="Reason / description…" style={input} />
            </div>

            {mErr && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#fef2f2', color: '#b91c1c' }}>
                {mErr}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" style={btnLight} onClick={() => setShowManual(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" style={{ ...btnDark, opacity: saving ? 0.7 : 1 }} onClick={saveManual} disabled={saving}>
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
