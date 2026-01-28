// src/app/customers/[accNo]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

type LoanType = 'Document' | 'Gold' | 'Silver';

type JewelRow = {
  id: number;
  jewelType: string;
  stoneWt: string;
  goldWt: string;
  totalWt: string;
  assetId: number;
};

// ✅ Backend Payment row (single row can carry both interest + principal)
type PaymentRow = {
  id: string;
  date: string; // backend should return YYYY-MM-DD
  interestDue?: number; // optional: backend accrual amount for that txn
  interestPaid: number;
  principalPaid: number;
  pendingInterest: number;
  outstandingPrincipal: number;
  note?: string | null;

  // Optional new backend fields (if present)
  interestFrom?: string | null;
  interestTo?: string | null;
  interestAdj?: number;
};

// ✅ Customer record from backend
type CustomerRecord = {
  accNo: string;
  date: string;
  customer: {
    name: string;
    address: string;
    relative: string;
    area: string;
    phone: string;
    phone2: string;
    aadhar: string;
    dob: string;
  };
  loan?: {
    company: string;
    scheme: string;
    loanType: LoanType | string;
    loanAmount: number;
    originalLoanAmount?: number;
    monthlyPct: number;
    yearlyPct: number;
    monthlyInterestAmount: number;
    remarks: string;

    pendingInterest?: number;
    advanceInterest?: number;
    lastAccruedYm?: string;
  };
  jewels?: JewelRow[];

  payments?: Array<{
    id: string;
    date: string;
    interestDue?: number;
    interestPaid?: number;
    principalPaid?: number;
    pendingInterest?: number;
    pendingPrincipal?: number;
    outstandingPrincipal?: number;
    note?: string | null;

    interestFrom?: string | null;
    interestTo?: string | null;
    interestAdj?: number;
  }>;

  status?: 'ACTIVE' | 'CLOSED';
  closedAt?: string | null;
  closedBy?: string | null;
  closeNote?: string | null;
};

const pageWrap: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '18px 16px 26px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: '4px 0 14px',
};

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  padding: 16,
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 10,
  color: '#111827',
};

const gridTwo: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
};

const value: React.CSSProperties = {
  fontSize: 14,
  color: '#111827',
};

const inputCss: React.CSSProperties = {
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

function fmtDateForRow(isoOrYmd: string): string {
  if (!isoOrYmd) return '-';

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) {
    const [y, m, d] = isoOrYmd.split('-');
    return `${d}-${m}-${y}`;
  }

  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return isoOrYmd;

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

// ✅ Convert backend DTO -> UI PaymentRow
function mapBackendPaymentsToUi(data: CustomerRecord, loanAmountFallback: number): PaymentRow[] {
  const rows = Array.isArray(data.payments) ? data.payments : [];

  return rows.map((p) => {
    const interestPaid = n(p.interestPaid);
    const principalPaid = n(p.principalPaid);

    const pendingInterest = n(p.pendingInterest ?? data.loan?.pendingInterest ?? 0);

    const outstandingPrincipal = n(
      p.outstandingPrincipal ?? p.pendingPrincipal ?? data.loan?.loanAmount ?? loanAmountFallback,
    );

    return {
      id: String(p.id),
      date: String(p.date),
      interestDue: n(p.interestDue),
      interestPaid,
      principalPaid,
      pendingInterest,
      outstandingPrincipal,
      note: p.note ?? null,

      interestFrom: p.interestFrom ?? null,
      interestTo: p.interestTo ?? null,
      interestAdj: n(p.interestAdj ?? 0),
    };
  });
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams<{ accNo: string }>();
  const accNoParam = decodeURIComponent(params.accNo);

  const [record, setRecord] = useState<CustomerRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // New fields requested in modal (already in your latest UI)
  const [fromDate, setFromDate] = useState<string>(todayIso());
  const [toDate, setToDate] = useState<string>(todayIso());
  const [adjustment, setAdjustment] = useState<string>('0');

  // Interest override + Principal + Note
  const [paymentInterest, setPaymentInterest] = useState<string>(''); // optional override
  const [paymentPrincipal, setPaymentPrincipal] = useState<string>('0');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Load single customer using backend /customers/:accNo
  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch<CustomerRecord>(`customers/${encodeURIComponent(accNoParam)}`);

        if (cancelled) return;

        setRecord(data);

        const loanAmountFallback = n(data.loan?.loanAmount ?? 0);
        const uiPayments = mapBackendPaymentsToUi(data, loanAmountFallback);
        setPayments(uiPayments);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = (e as { message?: string })?.message || 'Failed to load customer.';
          setError(msg);
          setRecord(null);
          setPayments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCustomer();
    return () => {
      cancelled = true;
    };
  }, [accNoParam]);

  const safeLoan = useMemo(
    () =>
      record && record.loan
        ? record.loan
        : {
            company: '',
            scheme: '',
            loanType: 'Document' as LoanType,
            loanAmount: 0,
            originalLoanAmount: 0,
            monthlyPct: 0,
            yearlyPct: 0,
            monthlyInterestAmount: 0,
            remarks: '',
            pendingInterest: 0,
            advanceInterest: 0,
            lastAccruedYm: '',
          },
    [record],
  );

  // ✅ Effective principal: from last payment outstandingPrincipal; else from loan.loanAmount
  const effectivePrincipal = useMemo(() => {
    if (!record) return 0;
    if (payments.length > 0) return n(payments[payments.length - 1].outstandingPrincipal);
    return n(safeLoan.loanAmount);
  }, [payments, record, safeLoan.loanAmount]);

  // ✅ Pending interest: from last payment pendingInterest; else from loan.pendingInterest
  const pendingInterest = useMemo(() => {
    if (!record) return 0;
    if (payments.length > 0) return n(payments[payments.length - 1].pendingInterest);
    return n(safeLoan.pendingInterest ?? 0);
  }, [payments, record, safeLoan.pendingInterest]);

  // ✅ Display-only monthly interest (do NOT use this for ledger math)
  const effectiveMonthlyInterest = useMemo(() => {
    if (!record) return 0;
    const pct = n(safeLoan.monthlyPct || 0);
    return Math.round((effectivePrincipal * pct) / 100);
  }, [effectivePrincipal, record, safeLoan.monthlyPct]);

  const handleOpenPaymentModal = () => {
    setPaymentError('');
    const today = todayIso();
    setFromDate(today);
    setToDate(today);
    setAdjustment('0');
    setPaymentInterest('');
    setPaymentPrincipal('0');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const handleCancelPayment = () => setShowPaymentModal(false);

  // ✅ Save payment to BACKEND
  const handleSavePayment = async () => {
    setPaymentError('');

    if (!record) {
      setPaymentError('Customer details not loaded.');
      return;
    }

    const principalPaid = Math.max(0, Math.trunc(Number(paymentPrincipal) || 0));
    const adj = Math.trunc(Number(adjustment) || 0);

    // interest override optional
    const interestOverrideStr = String(paymentInterest ?? '').trim();
    const interestOverride =
      interestOverrideStr.length > 0 ? Math.max(0, Math.trunc(Number(interestOverrideStr) || 0)) : null;

    if ((interestOverride ?? 0) === 0 && principalPaid === 0 && adj === 0) {
      setPaymentError('Enter Interest amount and/or Principal amount (Adjustment optional).');
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        fromDate,
        toDate,
        adjustment: adj,
        principal: principalPaid,
        note: paymentNote?.trim() ? paymentNote.trim() : null,
      };

      if (interestOverride !== null) body.interestAmount = interestOverride;

      const updated = await apiFetch<CustomerRecord>(`customers/${encodeURIComponent(accNoParam)}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setRecord(updated);
      const loanAmountFallback = n(updated.loan?.loanAmount ?? 0);
      setPayments(mapBackendPaymentsToUi(updated, loanAmountFallback));
      setShowPaymentModal(false);
    } catch (e: any) {
      setPaymentError(e?.message || 'Failed to save payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={pageWrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={titleStyle}>Customer History</h1>
        <button
          type="button"
          onClick={() => router.push('/customers/search')}
          style={{
            fontSize: 13,
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            cursor: 'pointer',
          }}
        >
          ← Back to Search
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        CustomerDetails – backend-ledger (Interest + Principal columns)
      </div>

      {loading && <div style={{ fontSize: 14, color: '#6b7280' }}>Loading customer details…</div>}

      {error && !loading && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{error}</div>
      )}

      {!loading && !error && record && (
        <>
          {/* ✅ Customer History (Updated fields) */}
          <section style={card}>
            <div style={gridTwo}>
              <div>
                <div style={label}>Customer Name</div>
                <div style={value}>{record.customer.name}</div>
              </div>

              <div>
                <div style={label}>Acc. No</div>
                <div style={value}>{record.accNo}</div>
              </div>

              <div>
                <div style={label}>Outstanding principal</div>
                <div style={value}>₹ {fmtCurrency(effectivePrincipal)}</div>
              </div>

              <div>
                <div style={label}>Phone number</div>
                <div style={value}>{record.customer.phone || '-'}</div>
              </div>
            </div>
          </section>

          {/* ✅ Loan Details (Updated fields) */}
          <section style={card}>
            <div style={sectionTitle}>Loan Details</div>

            <div style={gridTwo}>
              <div>
                <div style={label}>Loan Type</div>
                <div style={value}>{String(safeLoan.loanType)}</div>
              </div>

              <div>
                <div style={label}>Company</div>
                <div style={value}>{safeLoan.company || '-'}</div>
              </div>

              <div>
                <div style={label}>Scheme</div>
                <div style={value}>{safeLoan.scheme || '-'}</div>
              </div>

              <div>
                <div style={label}>Original loan amount</div>
                <div style={value}>₹ {fmtCurrency(n(safeLoan.originalLoanAmount ?? safeLoan.loanAmount))}</div>
              </div>

              

              <div>
                <div style={label}>Outstanding loan amount</div>
                <div style={value}>₹ {fmtCurrency(effectivePrincipal)}</div>
              </div>

              

              <div>
                <div style={label}>Pending interest</div>
                <div style={value}>₹ {fmtCurrency(pendingInterest)}</div>
              </div>

              

              <div>
                <div style={label}>Status</div>
                <div style={value}>{record.status || 'ACTIVE'}</div>
              </div>

              <div>
                <div style={label}>Closed at</div>
                <div style={value}>{record.closedAt || '-'}</div>
              </div>

              <div>
                <div style={label}>Interest (Monthly %)</div>
                <div style={value}>{n(safeLoan.monthlyPct || 0)}%</div>
              </div>

              <div>
                <div style={label}>Interest / month (display)</div>
                <div style={value}>₹ {fmtCurrency(effectiveMonthlyInterest)}</div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={label}>Remarks</div>
              <div style={{ ...value, whiteSpace: 'pre-wrap' }}>{safeLoan.remarks || '-'}</div>
            </div>

            {record.closeNote ? (
              <div style={{ marginTop: 10 }}>
                <div style={label}>Close note</div>
                <div style={{ ...value, whiteSpace: 'pre-wrap' }}>{record.closeNote}</div>
              </div>
            ) : null}
          </section>

          {/* Payment history */}
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={sectionTitle}>Payment History</div>
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                disabled={record.status === 'CLOSED'}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#111827',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: record.status === 'CLOSED' ? 'not-allowed' : 'pointer',
                  opacity: record.status === 'CLOSED' ? 0.6 : 1,
                }}
              >
                {record.status === 'CLOSED' ? 'Loan Closed' : 'Make Payment'}
              </button>
            </div>

            {payments.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                No payment records yet. Use &quot;Make Payment&quot; to add entries.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Date</th>

                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Interest Paid
                      </th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Principal Paid
                      </th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Total Paid
                      </th>

                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Pending Interest
                      </th>

                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                        Interest Due
                      </th>

                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const total = n(p.interestPaid) + n(p.principalPaid);
                      return (
                        <tr key={p.id}>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{fmtDateForRow(p.date)}</td>

                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.interestPaid))}
                          </td>
                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.principalPaid))}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: '1px solid #f3f4f6',
                              textAlign: 'right',
                              fontWeight: 700,
                            }}
                          >
                            ₹ {fmtCurrency(total)}
                          </td>

                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.pendingInterest))}
                          </td>

                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                            ₹ {fmtCurrency(n(p.interestDue || 0))}
                          </td>

                          <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', maxWidth: 260 }}>
                            {p.note || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                  ✅ This history is read-only and comes from backend. UI doesn’t do any interest calculations.
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Payment modal */}
      {showPaymentModal && record && (
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
              maxWidth: 560,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.3)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Record Payment</div>
              <button
                type="button"
                onClick={handleCancelPayment}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div>
                <strong>Customer:</strong> {record.customer.name}
              </div>
              <div>
                <strong>Acc. No:</strong> {record.accNo}
              </div>
              <div>
                <strong>Outstanding principal:</strong> ₹ {fmtCurrency(effectivePrincipal)}
              </div>
              <div>
                <strong>Pending Interest:</strong> ₹ {fmtCurrency(pendingInterest)}
              </div>
              <div>
                <strong>Interest / month (display only):</strong> ₹ {fmtCurrency(effectiveMonthlyInterest)}
              </div>
            </div>

            {/* From / Upto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>From (Interest from)</div>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputCss} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Upto (Interest upto)</div>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputCss} />
              </div>
            </div>

            {/* Interest override */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Interest amount <span style={{ color: '#6b7280', fontWeight: 500 }}>(optional override)</span>
              </div>
              <input
                type="number"
                value={paymentInterest}
                onChange={(e) => setPaymentInterest(e.target.value)}
                style={inputCss}
                placeholder="Leave empty to auto-calc"
              />
              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                If you enter a value here, backend will use this as final interest paid (range + adjustment will still be
                recorded).
              </div>
            </div>

            {/* Adjustment */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Add/Less (Adjustment) <span style={{ color: '#6b7280', fontWeight: 500 }}>(use + or -)</span>
              </div>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                style={inputCss}
                placeholder="0"
              />
              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                Example: If calculated interest is ₹1,923 but received ₹1,900 → enter <b>-23</b>. If received ₹2,000 →
                enter <b>+77</b>.
              </div>
            </div>

            {/* Principal */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Principal amount</div>
              <input
                type="number"
                value={paymentPrincipal}
                onChange={(e) => setPaymentPrincipal(e.target.value)}
                style={inputCss}
                placeholder="0"
              />
            </div>

            {/* Note */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Note (optional)</div>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                style={inputCss}
                placeholder="UPI ref / Cash / remarks…"
              />
            </div>

            {paymentError && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{paymentError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleCancelPayment}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#111827',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: saving ? 0.7 : 1,
                }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}











