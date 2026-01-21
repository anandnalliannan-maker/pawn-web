// src/app/schemes/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type InterestRow = {
  id: number;          // local row id for React
  startDay: string;    // "1"
  endDay: string;      // "30" or "" for infinite
  interestPct: string; // "1.5" etc
};

export type InterestScheme = {
  id: string;          // stable id
  name: string;
  rows: InterestRow[];
};

const STORAGE_KEY = 'pawn_interest_schemes_v1';

function loadSchemes(): InterestScheme[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterestScheme[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveSchemes(schemes: InterestScheme[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
}

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '18px 16px 26px',
};

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  padding: 16,
};

const labelCss: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
};

const inputCss: React.CSSProperties = {
  width: '100%',
  height: 40,
  borderRadius: 999,
  border: '1px solid #d1d5db',
  padding: '0 14px',
  fontSize: 14,
};

const pillButton: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  cursor: 'pointer',
  fontSize: 14,
};

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<InterestScheme[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [rowsDraft, setRowsDraft] = useState<InterestRow[]>([
    { id: 1, startDay: '1', endDay: '', interestPct: '' },
  ]);
  const [error, setError] = useState('');

  // ----- helpers as callbacks (so we can use them inside useEffect) -----

  const startNewScheme = useCallback(() => {
    setEditingId(null);
    setNameDraft('');
    setRowsDraft([{ id: 1, startDay: '1', endDay: '', interestPct: '' }]);
    setError('');
  }, []);

  const startEditing = useCallback((scheme: InterestScheme) => {
    setEditingId(scheme.id);
    setNameDraft(scheme.name);
    // give fresh consecutive ids for the editor rows
    const rowsWithIds: InterestRow[] = scheme.rows.map((r, idx) => ({
      id: idx + 1,
      startDay: r.startDay ?? '',
      endDay: r.endDay ?? '',
      interestPct: r.interestPct ?? '',
    }));
    setRowsDraft(rowsWithIds.length ? rowsWithIds : [
      { id: 1, startDay: '1', endDay: '', interestPct: '' },
    ]);
    setError('');
  }, []);

  // ----- initial load from localStorage -----

  useEffect(() => {
    const stored = loadSchemes();
    setSchemes(stored);

    if (stored.length > 0) {
      startEditing(stored[0]);
    } else {
      startNewScheme();
    }
  }, [startEditing, startNewScheme]);

  // ----- derived -----

  const currentSchemeLabel = useMemo(() => {
    if (!editingId) return 'New scheme';
    const found = schemes.find((s) => s.id === editingId);
    return found ? `Editing: ${found.name}` : 'New scheme';
  }, [editingId, schemes]);

  // ----- row handlers -----

  function handleAddRow() {
    if (rowsDraft.length >= 10) return;
    const nextId = rowsDraft.length ? Math.max(...rowsDraft.map((r) => r.id)) + 1 : 1;
    setRowsDraft([
      ...rowsDraft,
      { id: nextId, startDay: '', endDay: '', interestPct: '' },
    ]);
  }

  function handleRowChange(id: number, field: keyof InterestRow, value: string) {
    setRowsDraft((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function handleDeleteRow(id: number) {
    if (rowsDraft.length <= 1) return;
    setRowsDraft((rows) => rows.filter((r) => r.id !== id));
  }

  // ----- save / validate -----

  function handleSave() {
    try {
      const name = nameDraft.trim();
      if (!name) {
        throw new Error('Please enter a scheme name.');
      }

      const cleanedRows: InterestRow[] = rowsDraft
        .map((r, idx) => {
          const startRaw = (r.startDay ?? '').trim();
          const endRaw = (r.endDay ?? '').trim();
          const pctRaw = (r.interestPct ?? '').trim();

          // ignore completely empty rows
          if (!startRaw && !endRaw && !pctRaw) return null;

          const startNum = Number(startRaw);
          if (!Number.isFinite(startNum) || startNum <= 0) {
            throw new Error(`Row ${idx + 1}: Start day must be a positive number.`);
          }

          const pctNum = Number(pctRaw);
          if (!Number.isFinite(pctNum) || pctNum <= 0) {
            throw new Error(`Row ${idx + 1}: Interest % must be a positive number.`);
          }

          if (endRaw) {
            const endNum = Number(endRaw);
            if (!Number.isFinite(endNum) || endNum < startNum) {
              throw new Error(
                `Row ${idx + 1}: End day must be a number ≥ Start day, or left blank for infinite.`,
              );
            }
          }

          return {
            id: idx + 1,
            startDay: String(startNum),
            endDay: endRaw ? String(Number(endRaw)) : '',
            interestPct: String(pctNum),
          } satisfies InterestRow;
        })
        .filter((r): r is InterestRow => r !== null);

      if (cleanedRows.length === 0) {
        throw new Error('Please add at least one valid row.');
      }

      // sort by start day to keep it clean
      cleanedRows.sort(
        (a, b) => Number(a.startDay) - Number(b.startDay),
      );

      const schemeId = editingId ?? crypto.randomUUID();
      const newScheme: InterestScheme = {
        id: schemeId,
        name,
        rows: cleanedRows,
      };

      const updatedList = (() => {
        const existingIndex = schemes.findIndex((s) => s.id === schemeId);
        if (existingIndex === -1) {
          return [...schemes, newScheme];
        }
        const clone = [...schemes];
        clone[existingIndex] = newScheme;
        return clone;
      })();

      setSchemes(updatedList);
      setEditingId(schemeId);
      saveSchemes(updatedList);
      setError('');
      alert('Scheme saved successfully.');
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? 'Failed to save scheme.';
      setError(msg);
    }
  }

  function handleDeleteScheme() {
    if (!editingId) {
      startNewScheme();
      return;
    }
    if (!window.confirm('Delete this scheme?')) return;

    const remaining = schemes.filter((s) => s.id !== editingId);
    setSchemes(remaining);
    saveSchemes(remaining);

    if (remaining.length > 0) {
      startEditing(remaining[0]);
    } else {
      startNewScheme();
    }
  }

  // ----- render -----

  return (
    <main style={pageWrap}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '4px 0 14px',
        }}
      >
        Interest Schemes
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 16,
        }}
      >
        {/* Left list */}
        <section style={card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Saved Schemes</div>
            <button
              type="button"
              style={{ ...pillButton, background: '#111827', color: '#f9fafb' }}
              onClick={startNewScheme}
            >
              + New
            </button>
          </div>

          {schemes.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              No schemes saved yet. Click <b>New</b> to create one.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {schemes.map((s) => {
                const active = s.id === editingId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => startEditing(s)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 999,
                        border: 'none',
                        padding: '8px 12px',
                        marginBottom: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                        background: active ? '#111827' : '#f3f4f6',
                        color: active ? '#f9fafb' : '#111827',
                      }}
                    >
                      {s.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right editor */}
        <section style={card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {currentSchemeLabel}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={pillButton} onClick={handleDeleteScheme}>
                Delete
              </button>
              <button
                type="button"
                style={{ ...pillButton, background: '#111827', color: '#f9fafb' }}
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>
              <div style={labelCss}>Scheme Name</div>
              <input
                style={inputCss}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="e.g. Monthly staggered 1–30 / 31–60 / 61+"
              />
            </label>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ fontSize: 13, marginBottom: 6 }}>
            Define up to 10 rows. If <b>End day</b> is left blank, it will be
            treated as infinite (61+ days, 91+ days, etc.).
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Start day
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    End day
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Interest %
                  </th>
                  <th
                    style={{
                      width: 60,
                      textAlign: 'center',
                      padding: 8,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    —
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsDraft.map((row) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <input
                        style={{ ...inputCss, height: 32 }}
                        value={row.startDay}
                        onChange={(e) =>
                          handleRowChange(row.id, 'startDay', e.target.value)
                        }
                        placeholder="1"
                      />
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <input
                        style={{ ...inputCss, height: 32 }}
                        value={row.endDay}
                        onChange={(e) =>
                          handleRowChange(row.id, 'endDay', e.target.value)
                        }
                        placeholder="30 or blank"
                      />
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <input
                        style={{ ...inputCss, height: 32 }}
                        value={row.interestPct}
                        onChange={(e) =>
                          handleRowChange(row.id, 'interestPct', e.target.value)
                        }
                        placeholder="1, 1.5, 2..."
                      />
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: rowsDraft.length > 1 ? 'pointer' : 'not-allowed',
                          color: rowsDraft.length > 1 ? '#b91c1c' : '#9ca3af',
                          fontSize: 13,
                        }}
                        disabled={rowsDraft.length <= 1}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                ...pillButton,
                borderStyle: 'dashed',
                opacity: rowsDraft.length >= 10 ? 0.6 : 1,
                cursor: rowsDraft.length >= 10 ? 'not-allowed' : 'pointer',
              }}
              disabled={rowsDraft.length >= 10}
            >
              + Add row (max 10)
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
