// src/app/company/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getCompanyId, setCompanyId, setCompanyName } from '@/lib/api';

type Company = { id: string; name: string; isActive?: boolean };

export default function CompanySelectPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string>('');

  // create company
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(getCompanyId() || '');

  const loadCompanies = async () => {
    setError('');
    setLoading(true);
    try {
      const rows = await apiFetch<Company[]>('companies');
      setCompanies(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const applySelection = () => {
    const selected = companies.find((c) => c.id === selectedId);
    if (!selected) return;
    setCompanyId(selected.id);
    setCompanyName(selected.name);
    router.push('/'); // go to dashboard/home
  };

  const createCompany = async () => {
    const name = newName.trim();
    if (!name) {
      setError('Company name is required');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const created = await apiFetch<{ ok?: boolean; id?: string; name?: string }>('companies', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewName('');
      await loadCompanies();
      if (created?.id && created?.name) {
        setSelectedId(created.id);
        setCompanyId(created.id);
        setCompanyName(created.name);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 36px)',
        padding: '10px 10px 24px',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>Select Company</div>
          <div style={{ marginTop: 6, color: '#475569', fontSize: 13 }}>
            Please select the company before continuing. This will be used as default for New Customer / Deposits / Ledger.
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 14,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 16,
          }}
        >
          {/* Company list */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 16,
              boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
              Companies
            </div>

                        {loading ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>Loading companies...</div>
            ) : companies.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>No companies found. Create one below.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {companies.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid #e5e7eb',
                      background: selectedId === c.id ? '#0b1220' : '#ffffff',
                      color: selectedId === c.id ? '#e5e7eb' : '#111827',
                      cursor: 'pointer',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                    }}
                  >
                    <input
                      type="radio"
                      name="company"
                      value={c.id}
                      checked={selectedId === c.id}
                      onChange={() => setSelectedId(c.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{c.name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: selectedId === c.id ? '#94a3b8' : '#6b7280' }}>
                        {c.id}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={applySelection}
                disabled={!selectedId}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: selectedId ? 'pointer' : 'not-allowed',
                  background: selectedId ? '#4f46e5' : '#94a3b8',
                  color: '#fff',
                  fontWeight: 800,
                }}
              >
                Use Selected Company
              </button>
              <button
                type="button"
                onClick={loadCompanies}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 700,
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Create company (Admin) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 16,
              boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#111827' }}>
              Create Company (Admin)
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Anand Finance"
                style={{
                  flex: '1 1 260px',
                  height: 40,
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={createCompany}
                disabled={creating}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  background: creating ? '#94a3b8' : '#4f46e5',
                  color: '#fff',
                  fontWeight: 800,
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>

              <button
                type="button"
                onClick={loadCompanies}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 700,
                }}
              >
                Refresh
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
              This is kept simple for now. Later we can restrict this to Admin role only.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


