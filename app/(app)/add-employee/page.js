"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch, postJson } from "@/lib/clientFetch";
import { PageLoader } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

/**
 * Create User — port of add_employee.php.
 * ADMIN only (not COLLECTION-HEAD/RECOVERY_HEAD — the PHP page checked
 * exactly `in_array('ADMIN', $roles)`, nothing broader).
 * POSTs to /api/employees/create, which proxies to the real backend
 * (collection/create-employee) with the session's JWT.
 */
const ROLES = [
  { key: "ADMIN", label: "Admin", color: "#c0392b", bg: "#fdecea", desc: "Full access — manage users, view all data" },
  { key: "COLLECTION-HEAD", label: "Collection Head", color: "#8a5e30", bg: "#f0e4d0", desc: "Oversee collection team and performance" },
  { key: "COLLECTION-EXECUTIVE", label: "Collection Executive", color: "#1a6fa8", bg: "#e8f4fd", desc: "Handle assigned leads and collections" },
  { key: "RECOVERY_HEAD", label: "Recovery Head", color: "#1E7E5E", bg: "#e8f5f0", desc: "Manage recovery operations and cases" },
  { key: "ACCOUNTS", label: "Accounts", color: "#7c3aed", bg: "#f3e8ff", desc: "View financial reports and payments" },
  { key: "VISITOR", label: "Visitor", color: "#6b5744", bg: "#f4f1ec", desc: "Read-only access to the system" },
];

const EMPTY_FORM = { firstName: "", lastName: "", email: "", mobile: "", gender: "", password: "", roleNames: [] };

function passwordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { level: 1, label: "Weak", color: "bg-danger", text: "text-danger" };
  if (score <= 3) return { level: 2, label: "Fair", color: "bg-amber", text: "text-amber" };
  return { level: 3, label: "Strong", color: "bg-accent", text: "text-accent" };
}

function validate(form) {
  const errors = [];
  if (!form.firstName.trim()) errors.push("First name is required.");
  if (!form.lastName.trim()) errors.push("Last name is required.");
  if (!form.email.trim()) errors.push("Email is required.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push("Enter a valid email address.");
  if (!form.password) errors.push("Password is required.");
  else if (form.password.length < 6) errors.push("Password must be at least 6 characters.");
  if (!form.gender) errors.push("Please select a gender.");
  if (!form.mobile.trim()) errors.push("Mobile number is required.");
  else if (!/^\d{10}$/.test(form.mobile)) errors.push("Enter a valid 10-digit mobile number.");
  if (form.roleNames.length === 0) errors.push("Please select at least one role.");
  return errors;
}

export default function AddEmployeePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [allowed, setAllowed] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const me = await clientFetch("/api/auth/me");
    const roles = me.ok ? me.data?.user?.roles ?? [] : [];
    if (!roles.includes("ADMIN")) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((fe) => ({ ...fe, [key]: false }));
  }

  function toggleRole(key) {
    setForm((f) => ({
      ...f,
      roleNames: f.roleNames.includes(key) ? f.roleNames.filter((r) => r !== key) : [...f.roleNames, key],
    }));
    setFieldErrors((fe) => ({ ...fe, roleNames: false }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(form);
    if (errors.length) {
      toastError(errors.join(" "));
      setFieldErrors({
        firstName: !form.firstName.trim(),
        lastName: !form.lastName.trim(),
        email: !form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
        password: !form.password || form.password.length < 6,
        gender: !form.gender,
        mobile: !form.mobile.trim() || !/^\d{10}$/.test(form.mobile),
        roleNames: form.roleNames.length === 0,
      });
      return;
    }

    setSaving(true);
    const res = await postJson("/api/employees/create", {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      gender: form.gender,
      mobile: form.mobile.trim(),
      roleNames: form.roleNames,
    });
    setSaving(false);

    if (res.ok && res.data?.success) {
      success(res.data.message || "Employee created successfully!");
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } else {
      toastError(res.data?.message || "Could not create employee.");
    }
  }

  if (loading || !allowed) return <PageLoader label="Loading…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const strength = passwordStrength(form.password);
  const inputCls = (key) => `input ${fieldErrors[key] ? "!border-danger !bg-red-50" : ""}`;

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Create User</h1>
          <p className="mt-1 text-sm text-gray-500">Add a new employee to the Collection CRM team</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          ‹ Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* ── Left: form ── */}
        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div className="card mb-5 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px] text-accent">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span className="font-display text-base text-gray-800">Personal Information</span>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className="label">First Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={inputCls("firstName")}
                  placeholder="e.g. Ravi"
                  maxLength={50}
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Last Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={inputCls("lastName")}
                  placeholder="e.g. Sharma"
                  maxLength={50}
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email Address <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className={inputCls("email")}
                  placeholder="ravi@blinkrloan.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Mobile Number <span className="text-danger">*</span></label>
                <input
                  type="tel"
                  className={inputCls("mobile")}
                  placeholder="10-digit number"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <label className="label">Gender <span className="text-danger">*</span></label>
                <select className={inputCls("gender")} value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                  <option value="">— Select Gender —</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Password <span className="text-danger">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${inputCls("password")} pr-10`}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-accent"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {strength && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-[3px] flex-1 rounded ${i <= strength.level ? strength.color : "bg-line"}`} />
                    ))}
                    <span className={`ml-1 whitespace-nowrap text-[0.68rem] ${strength.text}`}>{strength.label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="card mb-5 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px] text-accent">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="font-display text-base text-gray-800">
                Assign Roles <span className="ml-1 font-sans text-[0.75rem] font-normal text-gray-400">— select one or more</span>
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {ROLES.map((r) => {
                  const checked = form.roleNames.includes(r.key);
                  return (
                    <label
                      key={r.key}
                      className={`flex cursor-pointer select-none items-center gap-2.5 rounded-lg border-[1.5px] px-3 py-2.5 transition ${
                        checked ? "border-accent bg-accent-light" : "border-line hover:border-accent/40 hover:bg-accent-light/50"
                      }`}
                    >
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleRole(r.key)} />
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: r.color }} />
                      <span className="text-[0.82rem] font-semibold text-gray-800">{r.label}</span>
                      <span
                        className={`ml-auto flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border-[1.5px] transition ${
                          checked ? "border-accent bg-accent" : "border-line"
                        }`}
                      >
                        {checked && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="h-[11px] w-[11px]">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              {fieldErrors.roleNames && (
                <div className="mt-2.5 text-[0.78rem] text-danger">Please select at least one role.</div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-3 text-[0.9rem]" disabled={saving}>
            {saving ? (
              "Creating…"
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Create Employee
              </>
            )}
          </button>
        </form>

        {/* ── Right: sidebar ── */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3.5 font-display text-[0.95rem] text-gray-800">Role Guide</div>
            <div className="p-5">
              {ROLES.map((r) => (
                <div key={r.key} className="flex items-start gap-2.5 border-b border-line py-2.5 last:border-0 last:pb-0">
                  <span
                    className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold"
                    style={{ background: r.bg, color: r.color }}
                  >
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: r.color }} />
                    {r.label}
                  </span>
                  <span className="pt-0.5 text-[0.76rem] leading-snug text-gray-500">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3.5 font-display text-[0.95rem] text-gray-800">Tips</div>
            <div className="space-y-2 p-5">
              {[
                { icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>, text: <>Use a company email like <strong>name@blinkrloan.com</strong> for consistency.</> },
                { icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>, text: "Set a strong password with uppercase, numbers and symbols." },
                { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, text: "Only assign roles the employee actually needs — follow least-privilege." },
                { icon: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.13 1 .36 1.97.71 2.9a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6" />, text: "Share login credentials securely — avoid plain email for passwords." },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-line pb-2.5 text-[0.8rem] leading-relaxed text-gray-600 last:border-0 last:pb-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent">
                    {tip.icon}
                  </svg>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
