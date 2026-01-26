"use client";

import { useEffect, useState } from "react";
import { apiFetch, getCompanyId, setCompanyId, setCompanyName } from "@/lib/api";

type CompanyRow = { id: string; name: string; isActive: boolean };

export default function CompaniesPage() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string>(getCompanyId() || "");
  const [err, setErr] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const list = await apiFetch<CompanyRow[]>("companies");
      setRows(list || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load companies");
      setRows([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function createCompany() {
    setErr("");
    setOk("");
    const n = name.trim();
    if (!n) return;

    try {
      const resp = await apiFetch<{ ok: boolean; id: string; name: string }>("companies", {
        method: "POST",
        body: JSON.stringify({ name: n }),
      });

      setName("");
      setOk(`Created: ${resp.name}`);
      await load();

      // auto select created
      setSelected(resp.id);
      setCompanyId(resp.id);
      setCompanyName(resp.name);
    } catch (e: any) {
      setErr(e?.message || "Failed to create company");
    }
  }

  function applySelection() {
    if (!selected) return;
    const selectedRow = rows.find((r) => r.id === selected);
    if (selectedRow) setCompanyName(selectedRow.name);
    setCompanyId(selected);
    setOk("Company selected.");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold">Companies</h1>
      <p className="mt-2 text-white/60">
        Create/select company. Selected company is used for customer/deposit/ledger APIs.
      </p>

      <div className="mt-6 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
        <div className="text-sm text-white/70 mb-2">Create Company</div>
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-xl bg-black/30 px-3 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. My Company 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={createCompany}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500"
          >
            Create
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
        <div className="text-sm text-white/70 mb-3">Select Company</div>

        {rows.length === 0 ? (
          <div className="text-white/50 text-sm">No companies found. Create one above.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((c) => (
              <label key={c.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <input
                  type="radio"
                  name="company"
                  value={c.id}
                  checked={selected === c.id}
                  onChange={() => setSelected(c.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-white/40">{c.id}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={applySelection}
            disabled={!selected}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/15 disabled:opacity-50"
          >
            Use Selected Company
          </button>
          <button
            onClick={() => void load()}
            className="rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {ok}
          </div>
        ) : null}
      </div>
    </div>
  );
}


