// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken, clearCompanyId } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);

    try {
      const resp = await apiFetch<{ ok: boolean; token?: string; message?: string }>('auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u, password: p }),
      });

      if (!resp?.ok || !resp?.token) {
        setError(resp?.message || 'Login failed.');
        setSubmitting(false);
        return;
      }

      setToken(resp.token);

      // ✅ Important: force staff to choose company after login
      // Clear any previous selection so they don't accidentally use old company
      clearCompanyId();

      router.push('/company');
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#020617',
          borderRadius: 16,
          border: '1px solid #1f2937',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          padding: '28px 26px 30px',
          color: '#e5e7eb',
        }}
      >
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: 0.4 }}>
            Pawn Finance – Web
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Sign in to access the control panel</div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 14,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#fecaca',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              style={{
                width: '100%',
                height: 40,
                borderRadius: 999,
                border: '1px solid #374151',
                padding: '0 12px',
                background: '#020617',
                color: '#e5e7eb',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="admin"
              style={{
                width: '100%',
                height: 40,
                borderRadius: 999,
                border: '1px solid #374151',
                padding: '0 12px',
                background: '#020617',
                color: '#e5e7eb',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 999,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting ? '#334155' : '#4f46e5',
              color: '#fff',
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
          (Current demo login: admin / admin)
        </div>
      </div>
    </div>
  );
}
