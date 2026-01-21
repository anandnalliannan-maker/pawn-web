// src/lib/api.ts

const DEFAULT_API_BASE = 'http://localhost:4000';

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) || DEFAULT_API_BASE;

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const url = `${API_BASE}/${normalizedPath}`;

  console.log('apiFetch URL =>', url);

  const method = (options.method || 'GET').toUpperCase();

  const body = (options as any).body;
  const isFormData = typeof FormData !== 'undefined' && body && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const shouldSetJson =
    method !== 'GET' &&
    method !== 'HEAD' &&
    body != null &&
    !isFormData &&
    !('Content-Type' in headers);

  if (shouldSetJson) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let detail = '';

    try {
      if (contentType.includes('application/json')) {
        const j = await res.json();
        detail = j?.message || j?.detail || JSON.stringify(j);
      } else {
        detail = await res.text();
      }
    } catch {}

    throw new Error(detail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null as T;

  const text = await res.text();
  if (!text) return null as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
