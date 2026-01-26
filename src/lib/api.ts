// src/lib/api.ts
const DEFAULT_API_BASE = "http://localhost:4000";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) ||
  DEFAULT_API_BASE;

// ---- storage keys ----
const TOKEN_KEY = "pawn_token";
const COMPANY_KEY = "pawn_company_id";
const COMPANY_NAME_KEY = "pawn_company_name";

// ---- token helpers ----
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---- company helpers ----
export function getCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COMPANY_KEY);
}

export function getCompanyName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COMPANY_NAME_KEY);
}

export function setCompanyId(companyId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANY_KEY, companyId);
}

export function setCompanyName(companyName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANY_NAME_KEY, companyName);
}

export function clearCompanyId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COMPANY_KEY);
  window.localStorage.removeItem(COMPANY_NAME_KEY);
}

// ---- main fetch ----
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  const url = `${API_BASE}/${normalizedPath}`;

  const method = (options.method || "GET").toUpperCase();

  const body = (options as any).body;
  const isFormData =
    typeof FormData !== "undefined" && body && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // ✅ Auto attach Authorization if token exists and caller didn't provide it
  const token = getToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ✅ Auto attach company id if exists (API supports x-company-id)
  const companyId = getCompanyId();
  if (companyId && !headers["x-company-id"]) {
    headers["x-company-id"] = companyId;
  }

  const shouldSetJson =
    method !== "GET" &&
    method !== "HEAD" &&
    body != null &&
    !isFormData &&
    !("Content-Type" in headers);

  if (shouldSetJson) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    clearCompanyId();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Invalid/Expired session");
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let detail = "";

    try {
      if (contentType.includes("application/json")) {
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
