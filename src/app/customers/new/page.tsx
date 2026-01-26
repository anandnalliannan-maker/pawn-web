// src/app/customers/new/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getCompanyName } from '../../../lib/api';

// ---------- Types ----------
type LoanType = 'Document' | 'Gold' | 'Silver';

type JewelRow = {
  id: number;
  jewelType: string;
  stoneWt: string;
  goldWt: string;
  totalWt: string;
  assetId: number;
};

type CustomerPayload = {
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
  loan: {
    company: string;
    scheme: string; // scheme name OR "None"
    loanType: LoanType;
    loanAmount: number;
    monthlyPct: number;
    yearlyPct: number;
    monthlyInterestAmount: number;
    remarks: string;
  };
  jewels: JewelRow[];
  photoDataUrl?: string;
};

type CompanyOption = { id: string; name: string };

// ✅ Scheme types (from /schemes page localStorage)
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

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  margin: '16px 0 8px',
  color: '#a50000',
};

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

const labelCss: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 4 };
const inputCss: React.CSSProperties = {
  width: '100%',
  height: 40,
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '8px 10px',
};
const smallInput: React.CSSProperties = { ...inputCss, width: 140 };
const compactSelect: React.CSSProperties = { ...inputCss, width: 200 };

function fmt(n: number, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : '';
}

// ---------- FY helpers (India: Apr 1 - Mar 31) ----------
function getFYString(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeNextAccNo(dateIso: string, list: CustomerPayload[]): string {
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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ✅ pick a scheme "default monthly %" from scheme rows
function getDefaultMonthlyPctFromScheme(s: InterestScheme): number | null {
  const rows = Array.isArray(s.rows) ? [...s.rows] : [];
  if (rows.length === 0) return null;

  rows.sort((a, b) => Number(a.startDay) - Number(b.startDay));

  // Prefer startDay=1 row if present, else first row
  const preferred = rows.find((r) => Number(r.startDay) === 1) ?? rows[0];
  const pct = Number(preferred.interestPct);
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return pct;
}

export default function NewCustomerPage() {
  const router = useRouter();

  // ---- meta (Acc. No / Date) ----
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [accNo, setAccNo] = useState<string>(() => `${getFYString(todayIso())}/1`);
  const [accErr, setAccErr] = useState<string>('');
  const [userEditedAcc, setUserEditedAcc] = useState<boolean>(false);

  // ---- customer ----
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [relative, setRelative] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [dob, setDob] = useState('');

  // ---- loan ----
  const [companyList, setCompanyList] = useState<CompanyOption[]>([]);
  const [company, setCompany] = useState(() => getCompanyName() || '');

  // ✅ Schemes for dropdown
  const schemeList = useMemo(() => loadSchemesFromStorage(), []);
  const [scheme, setScheme] = useState<string>(SCHEME_NONE_VALUE); // default = None

  const [loanType, setLoanType] = useState<LoanType>('Document');

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

  // ---- files ----
  const [photo, setPhoto] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  // ---- jewels ----
  const [, setNextAssetId] = useState(10000);
  const [jewels, setJewels] = useState<JewelRow[]>([
    { id: 1, jewelType: '', stoneWt: '', goldWt: '', totalWt: '', assetId: 10000 },
  ]);
  const showJewel = loanType === 'Gold' || loanType === 'Silver';

  const recalcRow = (r: JewelRow): JewelRow => {
    const s = Number(r.stoneWt);
    const g = Number(r.goldWt);
    const total = (Number.isFinite(s) ? s : 0) + (Number.isFinite(g) ? g : 0);
    return { ...r, totalWt: fmt(total, 2) };
  };

  const setRow = (id: number, key: keyof JewelRow, val: string) =>
    setJewels((prev) => prev.map((r) => (r.id === id ? recalcRow({ ...r, [key]: val }) : r)));

  const addRow = () =>
    setNextAssetId((n) => {
      const newId = n + 1;
      setJewels((prev) => [
        ...prev,
        { id: Date.now(), jewelType: '', stoneWt: '', goldWt: '', totalWt: '', assetId: newId },
      ]);
      return newId;
    });

  const removeRow = (id: number) => setJewels((p) => p.filter((r) => r.id !== id));

  // sync monthly/yearly %
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

    // auto fill monthly + yearly
    onMonthlyChange(String(pct));
  };

  const normalizeCompanies = (list: unknown): CompanyOption[] => {
    if (!Array.isArray(list)) return [];
    if (list.length === 0) return [];

    if (typeof list[0] === 'string') {
      return (list as string[]).map((name) => ({ id: name, name }));
    }

    return (list as Array<{ id?: string; name?: string }>).
      map((c) => ({
        id: typeof c.id === 'string' ? c.id : typeof c.name === 'string' ? c.name : '',
        name: typeof c.name === 'string' ? c.name : '',
      }))
      .filter((c) => c.id && c.name);
  };

  // Load companies (optional, ignore failure)
  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch<CompanyOption[] | string[]>('companies');
        const normalized = normalizeCompanies(list);
        if (normalized.length) setCompanyList(normalized);
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchNextAccNo = async (date: string) => {
    try {
      const list = await apiFetch<CustomerPayload[]>('customers');
      const next = computeNextAccNo(date, Array.isArray(list) ? list : []);
      setAccNo(next);
      setAccErr('');
    } catch {
      const fy = getFYString(date);
      setAccNo(`${fy}/1`);
      setAccErr('');
    }
  };

  useEffect(() => {
    if (userEditedAcc) return;

    const timer = setTimeout(() => {
      void fetchNextAccNo(dateIso);
    }, 0);

    return () => clearTimeout(timer);
  }, [dateIso, userEditedAcc]);

  async function validateAccNo(value: string) {
    setAccErr('');
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      const list = await apiFetch<CustomerPayload[]>('customers');
      const exists = (Array.isArray(list) ? list : []).some(
        (c) =>
          typeof c.accNo === 'string' &&
          c.accNo.trim().toLowerCase() === trimmed.trim().toLowerCase(),
      );

      if (exists) {
        setAccErr('Account number already exists');
      }
    } catch {
      // ignore
    }
  }

  const resetForm = () => {
    setName('');
    setAddress('');
    setRelative('');
    setArea('');
    setPhone('');
    setPhone2('');
    setAadhar('');
    setDob('');

    setCompany('');
    setScheme(SCHEME_NONE_VALUE);

    setLoanType('Document');
    setLoanAmount('');
    setMonthlyPct('');
    setYearlyPct('');
    setRemarks('');

    setPhoto(null);
    setAttachments([]);

    setJewels([{ id: 1, jewelType: '', stoneWt: '', goldWt: '', totalWt: '', assetId: 10000 }]);
    setNextAssetId(10000);
    setUserEditedAcc(false);

    void fetchNextAccNo(dateIso);
  };

  const routerPushDashboard = () => router.push('/dashboard');

  const onSave = async () => {
    const missing: string[] = [];

    if (!name.trim()) missing.push('Name');
    if (!address.trim()) missing.push('Address');
    if (!phone.trim()) missing.push('Phone');
    if (!loanType) missing.push('Loan type');
    if (!loanAmount.trim() || Number(loanAmount) <= 0) missing.push('Loan amount');
    if (!photo) missing.push('Photo');

    if (missing.length > 0) {
      alert(
        'Please fill the following mandatory fields before saving:\n\n- ' +
          missing.join('\n- '),
      );
      return;
    }

    let trimmed = accNo.trim();
    if (!trimmed) {
      const fy = getFYString(dateIso);
      trimmed = `${fy}/1`;
      setAccNo(trimmed);
    }

    if (accErr) return;

    try {
      const list = await apiFetch<CustomerPayload[]>('customers');
      const exists = (Array.isArray(list) ? list : []).some(
        (c) =>
          typeof c.accNo === 'string' &&
          c.accNo.trim().toLowerCase() === trimmed.trim().toLowerCase(),
      );
      if (exists) {
        setAccErr('Account number already exists');
        return;
      }
    } catch {
      // ignore
    }

    let photoDataUrl: string | undefined;
    try {
      if (photo) {
        photoDataUrl = await fileToDataUrl(photo);
      }
    } catch {
      alert('Failed to read photo. Please try again.');
      return;
    }

    const payload: CustomerPayload = {
      accNo: trimmed,
      date: dateIso,
      customer: { name, address, relative, area, phone, phone2, aadhar, dob },
      loan: {
        company,
        scheme, // "None" or scheme name
        loanType,
        loanAmount: Number(loanAmount) || 0,
        monthlyPct: Number(monthlyPct) || 0,
        yearlyPct: Number(yearlyPct) || 0,
        monthlyInterestAmount: Number(monthlyInterestAmount) || 0,
        remarks,
      },
      jewels: showJewel ? jewels : [],
      photoDataUrl,
    };

    try {
      await apiFetch('customers', { method: 'POST', body: JSON.stringify(payload) });

      alert(
        [
          'Customer saved successfully!',
          '',
          `Acc. No: ${trimmed}`,
          `Name: ${name}`,
          `Phone: ${phone}`,
          `Loan type: ${loanType}`,
          `Company: ${company || '(none)'}`,
          `Scheme: ${scheme || '(none)'}`,
          `Loan amount: ${loanAmount}`,
        ].join('\n'),
      );

      resetForm();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Save failed';
      if (/duplicate|exists/i.test(msg)) setAccErr(msg);
      else alert(msg);
    }
  };

  const title = (t: string) => <div style={titleStyle}>{t}</div>;

  return (
    <main style={pageWrap}>
      <h2 style={{ ...titleStyle, marginTop: 0, color: 'inherit' }}>New Customer</h2>

      {/* Acc No / Date */}
      <section style={card}>
        <div style={twoColRow}>
          <label>
            <div style={labelCss}>Acc. No</div>
            <input
              style={{
                ...inputCss,
                borderColor: accErr ? '#e11d48' : '#ddd',
                background: '#fff',
              }}
              value={accNo}
              onChange={(e) => {
                setAccNo(e.target.value);
                setUserEditedAcc(true);
                setAccErr('');
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  setUserEditedAcc(false);
                  void fetchNextAccNo(dateIso);
                } else {
                  void validateAccNo(v);
                }
              }}
              placeholder="Account number"
              title="Format: YYYY-YYYY/N (auto-filled, editable)"
            />
            {accErr && (
              <div style={{ color: '#e11d48', fontSize: 12, marginTop: 4 }}>{accErr}</div>
            )}
          </label>

          <label>
            <div style={labelCss}>Date</div>
            <input
              type="date"
              style={inputCss}
              value={dateIso}
              onChange={(e) => {
                const newDate = e.target.value || todayIso();
                setDateIso(newDate);
                setUserEditedAcc(false);
              }}
              title="Select date (defaults to today)"
            />
          </label>
        </div>
      </section>

      {/* Customer Details */}
      <section style={card}>
        {title('Customer Details')}

        <label>
          <div style={labelCss}>Name *</div>
          <input style={inputCss} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label style={{ display: 'block', marginTop: 10 }}>
          <div style={labelCss}>Address *</div>
          <textarea
            style={{ ...inputCss, height: 110, resize: 'vertical' }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>

        <div style={twoColRow}>
          <label>
            <div style={labelCss}>Area</div>
            <input style={inputCss} value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
          <label>
            <div style={labelCss}>Relative</div>
            <input style={inputCss} value={relative} onChange={(e) => setRelative(e.target.value)} />
          </label>
        </div>

        <div style={twoColRow}>
          <label>
            <div style={labelCss}>Phone *</div>
            <input style={inputCss} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            <div style={labelCss}>Phone 2</div>
            <input style={inputCss} value={phone2} onChange={(e) => setPhone2(e.target.value)} />
          </label>
        </div>

        <div style={twoColRow}>
          <label>
            <div style={labelCss}>ID number (Aadhar)</div>
            <input style={inputCss} value={aadhar} onChange={(e) => setAadhar(e.target.value)} />
          </label>
          <label>
            <div style={labelCss}>DOB</div>
            <input type="date" style={inputCss} value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Loan Details */}
      <section style={card}>
        {title('Loan Details')}

        <div style={{ ...lineRow, marginTop: 4 }}>
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

          <label>
            <div style={labelCss}>Company</div>
            <select style={compactSelect} value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">Select company</option>
              {companyList.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* ✅ Scheme dropdown (includes None) */}
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
                No schemes found. Create one in <b>Interest Schemes</b>.
              </div>
            )}
          </label>
        </div>

        <div style={{ ...lineRow, marginTop: 10 }}>
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

        <label style={{ display: 'block', marginTop: 12 }}>
          <div style={labelCss}>Remarks</div>
          <textarea
            style={{ ...inputCss, height: 90, resize: 'vertical' }}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </label>
      </section>

      {/* Photo & Attachments */}
      <section style={card}>
        {title('Photo & Attachments')}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

            <label>
              <button
                type="button"
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: 0,
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('attach-input')?.click()}
              >
                Add Attachments
              </button>
              <input
                id="attach-input"
                type="file"
                multiple
                hidden
                onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
              />
            </label>

            <div style={{ fontSize: 12, color: '#555' }}>
              {attachments.length ? `${attachments.length} file(s) selected` : 'No attachments'}
            </div>
          </div>
        </div>
      </section>

      {/* Jewel Details */}
      {showJewel && (
        <section style={card}>
          {title('Jewel Details')}

          <div style={{ marginBottom: 8 }}>
            <button
              type="button"
              onClick={addRow}
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
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                    Jewel Type
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                    Stone wt. (gms)
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                    Gold wt. (gms)
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                    Total wt. (gms)
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                    Asset ID
                  </th>
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
                        onChange={(e) => setRow(r.id, 'jewelType', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        style={{ ...inputCss, height: 36, width: 120 }}
                        value={r.stoneWt}
                        onChange={(e) => setRow(r.id, 'stoneWt', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        style={{ ...inputCss, height: 36, width: 120 }}
                        value={r.goldWt}
                        onChange={(e) => setRow(r.id, 'goldWt', e.target.value)}
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
                        onClick={() => removeRow(r.id)}
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
          onClick={() => routerPushDashboard()}
          style={{
            background: '#6b7280',
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!!accErr}
          style={{
            background: '#111827',
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '10px 16px',
            cursor: 'pointer',
            opacity: accErr ? 0.7 : 1,
          }}
        >
          Save Customer
        </button>
      </div>
    </main>
  );
}
