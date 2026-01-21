'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DepositStatus = 'ACTIVE' | 'CLOSED';

type PaymentRow = {
  id: string;
  date: string;
  interestFrom?: string | null;
  interestTo?: string | null;
  interestAdj?: number;
  interestDue?: number;
  interestPaid?: number;
  principalPaid?: number;
  pendingInterest?: number;
  pendingPrincipal?: number;
  note?: string | null;
};

type DepositDto = {
  id: string;
  financier: { name: string; phone: string; referenceNo: string };
  deposit: {
    startDate: string;
    status: DepositStatus;
    originalAmount: number;
    outstanding: number;
    monthlyPct: number;
    yearlyPct: number;
    remarks: string;
    pendingInterest: number;
    advanceInterest: number;
    lastAccruedYm?: string;
  };
  payments: PaymentRow[];
};

const wrap: React.CSSProperties = { maxWidth: 980, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h1: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '0 0 12px' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280' };
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
function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DepositDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [data, setData] = useState<DepositDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [adjustment, setAdjustment] = useState('0');
  const [interestAmount, setInterestAmount] = useState('');
  const [principal, setPrincipal] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const out = await apiFetch<DepositDto>(`deposits/${encodeURIComponent(id)}`);
      setData(out);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load deposit');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const effectiveOutstanding = useMemo(() => {
    if (!data) return 0;
    const pays = Array.isArray(data.payments) ? data.payments : [];
    if (pays.length > 0) return n(pays[pays.length - 1].pendingPrincipal ?? data.deposit.outstanding);
    return n(data.deposit.outstanding);
  }, [data]);

  const pendingInterest = useMemo(() => {
    if (!data) return 0;
    const pays = Array.isArray(data.payments) ? data.payments : [];
    if (pays.length > 0) return n(pays[pays.length - 1].pendingInterest ?? data.deposit.pendingInterest);
    return n(data.deposit.pendingInterest);
  }, [data]);

  const openPay = () => {
    setModalErr('');
    setFromDate(todayIso());
    setToDate(todayIso());
    setAdjustment('0');
    setInterestAmount('');
    setPrincipal('');
    setNote('');
    setShowModal(true);
  };

  const savePay = async () => {
    setModalErr('');
    if (!data) return;

    const body = {
      fromDate,
      toDate,
      adjustment: Math.trunc(Number(adjustment) || 0),
      interestAmount: interestAmount.trim() === '' ? undefined : Math.trunc(Number(interestAmount) || 0),
      principal: Math.max(0, Math.trunc(Number(principal) || 0)),
      note: note.trim() ? note.trim() : null,
      date: toDate,
    };

    setSaving(true);
    try {
      const updated = await apiFetch<DepositDto>(`deposits/${encodeURIComponent(id)}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setData(updated);
      setShowModal(false);
    } catch (e: any) {
      setModalErr(e?.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1 style={h1}>Deposit Details</h1>
        <button
          type="button"
          onClick={() => router.push('/deposits')}
          style={{ ...btn, background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
        >
          ← Back
        </button>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#6b7280' }}>Loading…</div>}
      {err && !loading && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{err}</div>
      )}

      {!loading && !err && data && (
        <>
          <section style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={label}>Financier</div>
                <div style={value}>{data.financier.name}</div>
              </div>
              <div>
                <div style={label}>Phone</div>
                <div style={value}>{data.financier.phone || '-'}</div>
              </div>
              <div>
                <div style={label}>Reference</div>
                <div style={value}>{data.financier.referenceNo || '-'}</div>
              </div>
              <div>
                <div style={label}>Status</div>
                <div style={value}>{data.deposit.status}</div>
              </div>
              <div>
                <div style={label}>Start date</div>
                <div style={value}>{fmtDate(data.deposit.startDate)}</div>
              </div>
              <div>
                <div style={label}>Outstanding</div>
                <div style={{ ...value, fontWeight: 800 }}>₹ {fmtCurrency(effectiveOutstanding)}</div>
              </div>
              <div>
                <div style={label}>Pending interest</div>
                <div style={value}>₹ {fmtCurrency(pendingInterest)}</div>
              </div>
              <div>
                <div style={label}>Monthly interest %</div>
                <div style={value}>{n(data.deposit.monthlyPct)}</div>
              </div>
            </div>
          </section>

          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Payment History</div>
              <button type="button" style={btn} onClick={openPay} disabled={data.deposit.status === 'CLOSED'}>
                Make Payment
              </button>
            </div>

            {data.payments?.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>From</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Upto</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Interest Due</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Adj</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Interest Paid</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Principal Paid</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Total Paid</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Pending Interest
                      </th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => {
                      const total = n(p.interestPaid) + n(p.principalPaid);
                      return (
                        <tr key={p.id}>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{fmtDate(p.date)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{fmtDate(p.interestFrom || '')}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{fmtDate(p.interestTo || '')}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.interestDue))}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{n(p.interestAdj)}</td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.interestPaid))}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.principalPaid))}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 800 }}>
                            ₹ {fmtCurrency(total)}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.pendingInterest))}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', maxWidth: 260 }}>{p.note || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#6b7280' }}>No payments yet.</div>
            )}
          </section>
        </>
      )}

      {showModal && data && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.3)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Record Payment</div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div>
                <strong>Financier:</strong> {data.financier.name}
              </div>
              <div>
                <strong>Outstanding:</strong> ₹ {fmtCurrency(effectiveOutstanding)}
              </div>
              <div>
                <strong>Pending Interest:</strong> ₹ {fmtCurrency(pendingInterest)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ ...label, marginBottom: 6 }}>From (Interest from)</div>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={input} />
              </div>

              <div>
                <div style={{ ...label, marginBottom: 6 }}>Upto (Interest upto)</div>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={input} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...label, marginBottom: 6 }}>Add/Less (Adjustment) (use + or -)</div>
                <input type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} style={input} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...label, marginBottom: 6 }}>Interest amount (optional override)</div>
                <input type="number" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} style={input} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...label, marginBottom: 6 }}>Principal amount</div>
                <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={input} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ ...label, marginBottom: 6 }}>Note (optional)</div>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={input} />
              </div>
            </div>

            {modalErr && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{modalErr}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="button" onClick={savePay} style={btn} disabled={saving}>
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
