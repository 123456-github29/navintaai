import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api/dev";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function DevDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "rushil") {
      setAuthenticated(true);
      setError("");
      sessionStorage.setItem("dev_auth", "true");
    } else {
      setError("Wrong password");
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("dev_auth") === "true") {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm p-8 rounded-2xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-xl font-bold text-white mb-1">Dev Dashboard</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Enter password to continue</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 rounded-lg text-sm text-white mb-4 outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#fff", color: "#0a0a0a" }}
          >
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const [tab, setTab] = useState<"users" | "accounts" | "apis">("users");
  const [totals, setTotals] = useState<any>(null);

  const headers = { "x-dev-password": "rushil" };

  const fetchTotals = useCallback(async () => {
    const res = await fetch(`${API_BASE}/totals`, { headers });
    if (res.ok) setTotals(await res.json());
  }, []);

  useEffect(() => {
    fetchTotals();
    const interval = setInterval(fetchTotals, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchTotals]);

  const tabs = [
    { key: "users" as const, label: "Users" },
    { key: "accounts" as const, label: "Accounts" },
    { key: "apis" as const, label: "API Usage" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dev Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Admin overview of Navinta AI</p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("dev_auth"); window.location.href = "/"; }}
            className="px-4 py-2 rounded-lg text-sm transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Exit
          </button>
        </div>

        {/* Totals Cards */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <TotalCard label="Total Earned" value={formatCents(totals.totalEarned)} color="#22c55e" />
            <TotalCard label="Total Spent" value={formatCents(totals.totalSpent)} color="#ef4444" />
            <TotalCard label="Users" value={totals.userCount.toString()} color="#3b82f6" />
            <TotalCard label="Accounts" value={totals.accountCount.toString()} color="#a855f7" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent",
                color: tab === t.key ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "users" && <UsersTab />}
        {tab === "accounts" && <AccountsTab onUpdate={fetchTotals} />}
        {tab === "apis" && <ApiUsageTab onUpdate={fetchTotals} />}
      </div>
    </div>
  );
}

function TotalCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

// ==================== USERS TAB ====================
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/users`, { headers: { "x-dev-password": "rushil" } })
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Business</Th>
              <Th>Plan</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No users yet</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <Td>{u.email || "—"}</Td>
                <Td>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</Td>
                <Td>{u.businessName || "—"}</Td>
                <Td>
                  <PlanBadge plan={u.entitlementPlan || u.plan || "free"} />
                </Td>
                <Td>{u.monthlyPayment ? formatCents(u.monthlyPayment) + "/mo" : "Free"}</Td>
                <Td>
                  <StatusBadge status={u.entitlementStatus || "active"} />
                </Td>
                <Td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== ACCOUNTS TAB ====================
function AccountsTab({ onUpdate }: { onUpdate: () => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "", monthlyCost: "", notes: "" });

  const headers = { "x-dev-password": "rushil", "Content-Type": "application/json" };

  const fetchAccounts = useCallback(async () => {
    const res = await fetch(`${API_BASE}/accounts`, { headers: { "x-dev-password": "rushil" } });
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE}/accounts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: form.name,
        provider: form.provider,
        monthlyCost: Math.round(parseFloat(form.monthlyCost || "0") * 100),
        notes: form.notes || null,
      }),
    });
    setForm({ name: "", provider: "", monthlyCost: "", notes: "" });
    setShowAdd(false);
    fetchAccounts();
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    await fetch(`${API_BASE}/accounts/${id}`, { method: "DELETE", headers });
    fetchAccounts();
    onUpdate();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Service accounts and their monthly costs
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#fff", color: "#0a0a0a" }}
        >
          + Add Account
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-5 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}>
          <FormInput label="Account Name" placeholder="e.g. Google Cloud" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <FormInput label="Provider" placeholder="e.g. google, supabase, stripe" value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} required />
          <FormInput label="Monthly Cost ($)" placeholder="0.00" value={form.monthlyCost} onChange={(v) => setForm({ ...form, monthlyCost: v })} type="number" />
          <FormInput label="Notes" placeholder="Optional notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <div className="md:col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg text-sm font-semibold" style={{ background: "#fff", color: "#0a0a0a" }}>Save</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 && (
          <div className="md:col-span-3 text-center py-12 rounded-xl" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
            <p className="text-sm">No accounts added yet. Click "Add Account" to start tracking.</p>
          </div>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="p-5 rounded-xl relative group" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">{a.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{a.provider}</p>
              </div>
              <ProviderIcon provider={a.provider} />
            </div>
            <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{formatCents(a.monthlyCost)}<span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>/mo</span></p>
            {a.notes && <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>{a.notes}</p>}
            <button
              onClick={() => handleDelete(a.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== API USAGE TAB ====================
function ApiUsageTab({ onUpdate }: { onUpdate: () => void }) {
  const [usage, setUsage] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ accountId: "", apiName: "", callCount: "", costCents: "", period: "" });

  const headers = { "x-dev-password": "rushil", "Content-Type": "application/json" };

  const fetchData = useCallback(async () => {
    const [usageRes, accountsRes] = await Promise.all([
      fetch(`${API_BASE}/api-usage`, { headers: { "x-dev-password": "rushil" } }),
      fetch(`${API_BASE}/accounts`, { headers: { "x-dev-password": "rushil" } }),
    ]);
    if (usageRes.ok) setUsage(await usageRes.json());
    if (accountsRes.ok) setAccounts(await accountsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // real-time refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    await fetch(`${API_BASE}/api-usage`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accountId: form.accountId,
        apiName: form.apiName,
        callCount: parseInt(form.callCount || "0"),
        costCents: Math.round(parseFloat(form.costCents || "0") * 100),
        period: form.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      }),
    });
    setForm({ accountId: "", apiName: "", callCount: "", costCents: "", period: "" });
    setShowAdd(false);
    fetchData();
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/api-usage/${id}`, { method: "DELETE", headers });
    fetchData();
    onUpdate();
  };

  const handleUpdateSpend = async (id: string, newCost: string) => {
    const costCents = Math.round(parseFloat(newCost) * 100);
    await fetch(`${API_BASE}/api-usage/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ costCents }),
    });
    fetchData();
    onUpdate();
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || "Unknown";
  };

  if (loading) return <LoadingSpinner />;

  const totalApiSpend = usage.reduce((sum, u) => sum + (u.costCents || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            API usage tracking — auto-refreshes every 15s
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Total API spend: <span style={{ color: "#ef4444" }}>{formatCents(totalApiSpend)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#fff", color: "#0a0a0a" }}
        >
          + Add API
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-5 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Account</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <option value="">Select account...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <FormInput label="API Name" placeholder="e.g. GPT-4o, Cloud Storage" value={form.apiName} onChange={(v) => setForm({ ...form, apiName: v })} required />
          <FormInput label="Call Count" placeholder="0" value={form.callCount} onChange={(v) => setForm({ ...form, callCount: v })} type="number" />
          <FormInput label="Cost ($)" placeholder="0.00" value={form.costCents} onChange={(v) => setForm({ ...form, costCents: v })} type="number" />
          <FormInput label="Period" placeholder="e.g. 2026-03" value={form.period} onChange={(v) => setForm({ ...form, period: v })} />
          <div className="md:col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg text-sm font-semibold" style={{ background: "#fff", color: "#0a0a0a" }}>Save</button>
          </div>
        </form>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Th>Account</Th>
                <Th>API</Th>
                <Th>Calls</Th>
                <Th>Spend</Th>
                <Th>Period</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {usage.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No API usage tracked yet</td></tr>
              )}
              {usage.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Td>{getAccountName(u.accountId)}</Td>
                  <Td><span className="font-medium text-white">{u.apiName}</span></Td>
                  <Td>{u.callCount.toLocaleString()}</Td>
                  <Td>
                    <InlineEdit
                      value={(u.costCents / 100).toFixed(2)}
                      onSave={(val) => handleUpdateSpend(u.id, val)}
                    />
                  </Td>
                  <Td>{u.period}</Td>
                  <Td>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs px-2 py-1 rounded transition-all hover:bg-red-500/10"
                      style={{ color: "#ef4444" }}
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================

function InlineEdit({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={() => { setEditing(true); setVal(value); }}
        className="cursor-pointer hover:underline"
        style={{ color: "#ef4444" }}
        title="Click to edit"
      >
        ${value}
      </span>
    );
  }

  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { onSave(val); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      autoFocus
      className="w-20 px-2 py-1 rounded text-sm text-white outline-none"
      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.2)" }}
      step="0.01"
    />
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-5 py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
      {children}
    </td>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    free: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)" },
    starter: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
    pro: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
    studio: { bg: "rgba(234,179,8,0.15)", text: "#fbbf24" },
  };
  const c = colors[plan] || colors.free;
  return (
    <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize" style={{ background: c.bg, color: c.text }}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "#22c55e",
    canceled: "#ef4444",
    past_due: "#f59e0b",
    trialing: "#3b82f6",
  };
  const color = colors[status] || "#6b7280";
  return (
    <span className="flex items-center gap-1.5 text-xs capitalize" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  const icons: Record<string, string> = {
    google: "G",
    supabase: "S",
    stripe: "$",
    openai: "AI",
    vercel: "V",
    aws: "A",
  };
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
    >
      {icons[provider.toLowerCase()] || provider.charAt(0).toUpperCase()}
    </div>
  );
}

function FormInput({ label, placeholder, value, onChange, required, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
        step={type === "number" ? "0.01" : undefined}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.5)" }} />
    </div>
  );
}

export default DevDashboard;
