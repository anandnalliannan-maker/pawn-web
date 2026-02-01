// src/app/customers/[accNo]/new-loan/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getCompanyName } from '../../../../lib/api';

type LoanType = 'Document' | 'Gold' | 'Silver';

type JewelRow = {
  id: number;
  jewelType: string;
  stoneWt: string;
  goldWt: string;
  totalWt: string;
  assetId: number;
};

type CustomerRecord = {
  accNo: string;
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
};

type CustomerAccNoRow = {
  accNo: string;
  date?: string | null;
};

type InterestRow = {
  id: number;
  startDay: string;
  endDay: string;
  interestPct: string;
};

type InterestScheme = {
  id: string;
  name: string;
  rows: InterestRow[];
};

const SCHEME_STORAGE_KEY = 'pawn_interest_schemes_v1';
const SCHEME_NONE_VALUE = 'None';

function loadSchemesFromStorage(): InterestScheme[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SCHEME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterestScheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const pageWrap: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '18px 16px',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 10,
  padding: 14,
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  margin: '0 0 8px',
};

const labelCss: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 4 };
const inputCss: React.CSSProperties = {
  width: '100%',
  height: 40,
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '8px 10px',
};
const twoColRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};
const lineRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};
const smallInput: React.CSSProperties = { ...inputCss, width: 140 };
const compactSelect: React.CSSProperties = { ...inputCss, width: 200 };

function fmt(n: number, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '';
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getFYString(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
}

function computeNextAccNo(dateIso: string, list: CustomerAccNoRow[]): string {
  const fy = getFYString(dateIso);
  const prefix = `${fy}/`;
  let maxSuffix = 0;

  for (const c of list) {
    const acc = c.accNo ?? '';
    if (typeof acc === 'string' && acc.startsWith(prefix)) {
      const parts = acc.split('/');
      const suffixStr = parts[1] ?? '';
      const suffix = parseInt(suffixStr, 10);
      if (!Number.isNaN(suffix) && suffix > maxSuffix) {
        maxSuffix = suffix;
      }
    }
  }

  const nextSuffix = maxSuffix + 1;
  return `${fy}/${nextSuffix}`;
}

function mapLoanTypeForApi(t: LoanType): 'DOCUMENT' | 'GOLD' | 'SILVER' {
  if (t === 'Gold') return 'GOLD';
  if (t === 'Silver') return 'SILVER';
  return 'DOCUMENT';
}

function getDefaultMonthlyPctFromScheme(s: InterestScheme): number | null {
  const rows = Array.isArray(s.rows) ? [...s.rows] : [];
  if (rows.length === 0) return null;
  rows.sort((a, b) => Number(a.startDay) - Number(b.startDay));
  const preferred = rows.find((r) => Number(r.startDay) === 1) ?? rows[0];
  const pct = Number(preferred.interestPct);
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return pct;
}

function recalcJewelRow(r: JewelRow): JewelRow {
  const s = Number(r.stoneWt);
  const g = Number(r.goldWt);
  const total = (Number.isFinite(s) ? s : 0) + (Number.isFinite(g) ? g : 0);
  return { ...r, totalWt: fmt(total, 2) };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function NewLoanForExistingCustomerPage() {
  const router = useRouter();
  const params = useParams<{ accNo: string }>();
  const accNoParam = decodeURIComponent(params.accNo);

  const [record, setRecord] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [loanType, setLoanType] = useState<LoanType>('Document');
  const [scheme, setScheme] = useState<string>(SCHEME_NONE_VALUE);
  const [loanAmount, setLoanAmount] = useState('');
  const [monthlyPct, setMonthlyPct] = useState('');
  const [yearlyPct, setYearlyPct] = useState('');
  const monthlyInterestAmount = useMemo(() => {
    const amt = Number(loanAmount);
    const mp = Number(monthlyPct);
    if (!Number.isFinite(amt) || !Number.isFinite(mp)) return '';
    return fmt((amt * mp) / 100, 2);
  }, [loanAmount, monthlyPct]);
  const [remarks, setRemarks] = useState('');

  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [newAccNo, setNewAccNo] = useState<string | null>(null);
  const [nextAccNo, setNextAccNo] = useState<string>('');
  const [accNoDraft, setAccNoDraft] = useState<string>('');
  const [accErr, setAccErr] = useState<string>('');
  const [userEditedAcc, setUserEditedAcc] = useState<boolean>(false);
  const [allCustomers, setAllCustomers] = useState<CustomerAccNoRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [, setNextAssetId] = useState(10000);
  const [jewels, setJewels] = useState<JewelRow[]>([
    { id: 1, jewelType: '', stoneWt: '', goldWt: '', totalWt: '', assetId: 10000 },
  ]);
  const showJewel = loanType === 'Gold' || loanType === 'Silver';

  const schemeList = useMemo(() => loadSchemesFromStorage(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadCustomer() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch<CustomerRecord>(`customers/${encodeURIComponent(accNoParam)}`);
        if (!cancelled) setRecord(data);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = (e as { message?: string })?.message || 'Failed to load customer.';
          setError(msg);
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

  useEffect(() => {
    let cancelled = false;
    async function loadCustomers() {
      try {
        const data = await apiFetch<CustomerAccNoRow[]>('customers');
        if (!cancelled) setAllCustomers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setAllCustomers([]);
      }
    }
    void loadCustomers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userEditedAcc) return;
    const next = computeNextAccNo(dateIso, allCustomers);
    setNextAccNo(next);
    setAccNoDraft(next);
    setAccErr('');
  }, [dateIso, allCustomers, userEditedAcc]);

  const onMonthlyChange = (v: string) => {
    setMonthlyPct(v);
    const mp = Number(v);
    setYearlyPct(Number.isFinite(mp) ? String(mp * 12) : '');
  };

  const onYearlyChange = (v: string) => {
    setYearlyPct(v);
    const yp = Number(v);
    setMonthlyPct(Number.isFinite(yp) ? String(yp / 12) : '');
  };

  const handleSchemeChange = (value: string) => {
    setScheme(value);
    if (value === SCHEME_NONE_VALUE) return;
    const s = schemeList.find((x) => x.name === value);
    if (!s) return;
    const pct = getDefaultMonthlyPctFromScheme(s);
    if (pct == null) return;
    onMonthlyChange(String(pct));
  };

  const onSave = async () => {
    if (!record) return;
    const missing: string[] = [];
    if (!loanAmount.trim() || Number(loanAmount) <= 0) missing.push('Loan amount');
    if (!photo) missing.push('Photo');
    if (missing.length) {
      alert('Please fill the following before saving:\n\n- ' + missing.join('\n- '));
      return;
    }

    const accNoToUse = accNoDraft.trim() || nextAccNo.trim();
    if (!accNoToUse) {
      setAccErr('Account number is required');
      return;
    }

    const exists = allCustomers.some(
      (c) => String(c.accNo || '').trim().toLowerCase() === accNoToUse.trim().toLowerCase(),
    );
    if (exists) {
      setAccErr('Account number already exists');
      return;
    }

    let photoDataUrl: string | undefined;
    try {
      if (photo) photoDataUrl = await fileToDataUrl(photo);
    } catch {
      alert('Failed to read photo. Please try again.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: dateIso,
        loan: {
          loanType: mapLoanTypeForApi(loanType),
          loanAmount: Number(loanAmount) || 0,
          monthlyPct: Number(monthlyPct) || 0,
          yearlyPct: Number(yearlyPct) || 0,
          monthlyInterestAmount: Number(monthlyInterestAmount) || 0,
          scheme,
          remarks,
          photoDataUrl,
        },
        jewels: showJewel ? jewels : [],
        newAccNo: accNoToUse,
      };

      const data = await apiFetch<{ ok: boolean; accNo: string }>(
        `customers/new-loan?accNo=${encodeURIComponent(accNoParam)}`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      setNewAccNo(data.accNo);
      setConfirmOpen(true);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Failed to create new loan.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={pageWrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={titleStyle}>Create New Loan</h2>
        <button
          type="button"
          onClick={() => router.push(`/customers/${encodeURIComponent(accNoParam)}`)}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {'\u2190 Back'}
        </button>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#6b7280' }}>Loading customer details...</div>}
      {error && !loading && <div style={{ fontSize: 14, color: '#b91c1c' }}>{error}</div>}

      {!loading && !error && record && (
        <>
          {confirmOpen && newAccNo && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15,23,42,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 60,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 420,
                  background: '#ffffff',
                  borderRadius: 18,
                  boxShadow: '0 20px 25px -5px rgba(15,23,42,0.3)',
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>New loan created</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>
                  New Acc. No: <b>{newAccNo}</b>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      setNewAccNo(null);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/customers/${encodeURIComponent(newAccNo)}`)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: 'none',
                      background: '#111827',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Open New Loan
                  </button>
                </div>
              </div>
            </div>
          )}

          <section style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Customer Details (read-only)</div>
            <div style={twoColRow}>
              <div>
                <div style={labelCss}>Existing Acc. No</div>
                <input style={inputCss} value={record.accNo} readOnly />
              </div>
              <div>
                <div style={labelCss}>Name</div>
                <input style={inputCss} value={record.customer.name || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Phone</div>
                <input style={inputCss} value={record.customer.phone || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Phone 2</div>
                <input style={inputCss} value={record.customer.phone2 || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Relative</div>
                <input style={inputCss} value={record.customer.relative || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Area</div>
                <input style={inputCss} value={record.customer.area || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Aadhar</div>
                <input style={inputCss} value={record.customer.aadhar || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>DOB</div>
                <input style={inputCss} value={record.customer.dob || ''} readOnly />
              </div>
              <div>
                <div style={labelCss}>Address</div>
                <input style={inputCss} value={record.customer.address || ''} readOnly />
              </div>
            </div>
          </section>

          <section style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Loan Details</div>
            <div style={twoColRow}>
              <label>
                <div style={labelCss}>Date</div>
                <input type="date" style={inputCss} value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
              </label>
              <label>
                <div style={labelCss}>Loan Type *</div>
                <select
                  style={compactSelect}
                  value={loanType}
                  onChange={(e) => e.target.value && setLoanType(e.target.value as LoanType)}
                >
                  <option>Document</option>
                  <option>Gold</option>
                  <option>Silver</option>
                </select>
              </label>
            </div>

            <div style={{ ...lineRow, marginTop: 10 }}>
              <label>
                <div style={labelCss}>Company</div>
                <input style={compactSelect} value={getCompanyName() || ''} readOnly />
              </label>
              <label>
                <div style={labelCss}>New Acc. No</div>
                <input
                  style={compactSelect}
                  value={accNoDraft}
                  placeholder="Auto-generated"
                  onChange={(e) => {
                    setAccNoDraft(e.target.value);
                    setUserEditedAcc(true);
                    setAccErr('');
                  }}
                />
              </label>
              {accErr && <div style={{ color: '#e11d48', fontSize: 12 }}>{accErr}</div>}
              <label>
                <div style={labelCss}>Loan amount *</div>
                <input
                  style={{ ...smallInput, width: 170 }}
                  inputMode="decimal"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                />
              </label>

              <label>
                <div style={labelCss}>Monthly Interest %</div>
                <input
                  style={smallInput}
                  inputMode="decimal"
                  value={monthlyPct}
                  onChange={(e) => onMonthlyChange(e.target.value)}
                />
              </label>

              <label>
                <div style={labelCss}>Yearly Interest %</div>
                <input
                  style={smallInput}
                  inputMode="decimal"
                  value={yearlyPct}
                  onChange={(e) => onYearlyChange(e.target.value)}
                />
              </label>

              <label>
                <div style={labelCss}>Interest / month</div>
                <input style={smallInput} readOnly value={monthlyInterestAmount} />
              </label>
            </div>

            <div style={{ ...lineRow, marginTop: 10 }}>
              <label>
                <div style={labelCss}>Scheme</div>
                <select style={compactSelect} value={scheme} onChange={(e) => handleSchemeChange(e.target.value)}>
                  <option value={SCHEME_NONE_VALUE}>None (manual)</option>
                  {schemeList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {schemeList.length === 0 && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    No schemes found. Create one in Interest Schemes.
                  </div>
                )}
              </label>
            </div>

            <label style={{ display: 'block', marginTop: 12 }}>
              <div style={labelCss}>Remarks</div>
              <textarea
                style={{ ...inputCss, height: 90, resize: 'vertical' }}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
          </section>

          <section style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Photo</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 160,
                  height: 160,
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#fafafa',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: '#888', fontSize: 12 }}>No photo (Required)</span>
                )}
              </div>
              <label>
                <button
                  type="button"
                  style={{
                    background: '#0b5cff',
                    color: '#fff',
                    border: 0,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('photo-input')?.click()}
                >
                  Upload Photo *
                </button>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </section>

          {showJewel && (
            <section style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Jewel Details</div>

              <div style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    setNextAssetId((n) => {
                      const newId = n + 1;
                      setJewels((prev) => [
                        ...prev,
                        { id: Date.now(), jewelType: '', stoneWt: '', goldWt: '', totalWt: '', assetId: newId },
                      ]);
                      return newId;
                    })
                  }
                  style={{
                    background: '#0b5cff',
                    color: '#fff',
                    border: 0,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  + Add Row
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Jewel Type</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Stone wt. (gms)</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Gold wt. (gms)</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Total wt. (gms)</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Asset ID</th>
                      <th style={{ padding: 8, borderBottom: '1px solid #eee' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {jewels.map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding: 6 }}>
                          <input
                            style={{ ...inputCss, height: 36, width: 220 }}
                            value={r.jewelType}
                            onChange={(e) =>
                              setJewels((prev) =>
                                prev.map((row) =>
                                  row.id === r.id ? recalcJewelRow({ ...row, jewelType: e.target.value }) : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ ...inputCss, height: 36, width: 120 }}
                            value={r.stoneWt}
                            onChange={(e) =>
                              setJewels((prev) =>
                                prev.map((row) =>
                                  row.id === r.id ? recalcJewelRow({ ...row, stoneWt: e.target.value }) : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ ...inputCss, height: 36, width: 120 }}
                            value={r.goldWt}
                            onChange={(e) =>
                              setJewels((prev) =>
                                prev.map((row) =>
                                  row.id === r.id ? recalcJewelRow({ ...row, goldWt: e.target.value }) : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number"
                            step="0.01"
                            readOnly
                            style={{ ...inputCss, height: 36, width: 120, background: '#f7f7f7' }}
                            value={r.totalWt}
                            title="Auto-calculated"
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            readOnly
                            style={{ ...inputCss, height: 36, width: 110, background: '#f7f7f7' }}
                            value={r.assetId}
                            title="Auto-generated"
                          />
                        </td>
                        <td style={{ padding: 6 }}>
                          <button
                            type="button"
                            onClick={() => setJewels((p) => p.filter((row) => row.id !== r.id))}
                            style={{
                              background: '#e11d48',
                              color: '#fff',
                              border: 0,
                              borderRadius: 8,
                              padding: '6px 10px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => router.push(`/customers/${encodeURIComponent(accNoParam)}`)}
              style={{
                background: '#6b7280',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                padding: '10px 16px',
                cursor: 'pointer',
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              style={{
                background: '#111827',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                padding: '10px 16px',
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Create Loan'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
