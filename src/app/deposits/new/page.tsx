'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const wrap: React.CSSProperties = { maxWidth: 860, margin: '0 auto', padding: '18px 16px 26px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 };
const h1: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: '0 0 12px' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 };
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

export default function NewDepositPage() {
  const router = useRouter();

  const [financierName, setFinancierName] = useState('');
  const [phone, setPhone] = useState('');
  const [referenceNo, setReferenceNo] = useState('');

  const [startDate, setStartDate] = useState(todayIso());
  const [originalAmount, setOriginalAmount] = useState('');
  const [monthlyPct, setMonthlyPct] = useState('');
  const [yearlyPct, setYearlyPct] = useState('');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const onSave = async () => {
    setErr('');
    if (!financierName.trim()) return setErr('Financier name is required');
    if (!startDate) return setErr('Start date is required');

    const amount = Math.trunc(Number(originalAmount) || 0);
    if (!amount) return setErr('Original amount is required');

    setSaving(true);
    try {
      const body = {
        financier: {
          name: financierName.trim(),
          phone: phone.trim() || null,
          referenceNo: referenceNo.trim() || null,
        },
        deposit: {
          startDate,
          originalAmount: amount,
          monthlyPct: Number(monthlyPct) || 0,
          yearlyPct: Number(yearlyPct) || 0,
          remarks: remarks.trim() || null,
        },
      };

      const out = await apiFetch<{ ok: boolean; id?: string; message?: string }>('deposits', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!out?.ok || !out?.id) throw new Error(out?.message || 'Failed to create deposit');
      router.push(`/deposits/${encodeURIComponent(out.id)}`);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save deposit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1 style={h1}>New Deposit</h1>
        <button
          type="button"
          onClick={() => router.push('/deposits')}
          style={{ ...btn, background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
        >
          ← Back
        </button>
      </div>

      <section style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={label}>Financier name</div>
            <input style={input} value={financierName} onChange={(e) => setFinancierName(e.target.value)} />
          </div>

          <div>
            <div style={label}>Phone (optional)</div>
            <input style={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <div style={label}>Reference No (optional)</div>
            <input style={input} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>

          <div>
            <div style={label}>Start date</div>
            <input type="date" style={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <div style={label}>Original amount</div>
            <input
              type="number"
              style={input}
              value={originalAmount}
              onChange={(e) => setOriginalAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <div style={label}>Monthly interest %</div>
            <input type="number" style={input} value={monthlyPct} onChange={(e) => setMonthlyPct(e.target.value)} />
          </div>

          <div>
            <div style={label}>Yearly interest %</div>
            <input type="number" style={input} value={yearlyPct} onChange={(e) => setYearlyPct(e.target.value)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={label}>Remarks</div>
            <input style={input} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {err && <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" style={btn} onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Deposit'}
          </button>
        </div>
      </section>
    </main>
  );
}
