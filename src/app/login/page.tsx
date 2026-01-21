// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);

    // Demo / static credentials for now
    const isValid = username === 'admin' && password === 'admin';

    if (!isValid) {
      setSubmitting(false);
      setError('Invalid username or password.');
      return;
    }

    // No localStorage / token, just navigate once
    router.push('/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617', // very dark background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#020617',
          borderRadius: 16,
          border: '1px solid #1f2937',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          padding: '28px 26px 30px',
          color: '#e5e7eb',
        }}
      >
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 4,
              letterSpacing: 0.4,
            }}
          >
            Pawn Finance – Web
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            Sign in to access the control panel
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              Username
            </label>
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

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              Password
            </label>
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

          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
            Demo credentials: <span style={{ fontWeight: 600 }}>admin / admin</span>
          </div>

          {error && (
            <div
              style={{
                background: '#7f1d1d',
                color: '#fee2e2',
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 999,
              border: 'none',
              background: submitting ? '#4b5563' : '#4f46e5',
              color: '#f9fafb',
              fontWeight: 600,
              fontSize: 14,
              cursor: submitting ? 'default' : 'pointer',
              marginTop: 4,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
